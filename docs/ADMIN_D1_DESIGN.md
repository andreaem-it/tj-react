# Admin e migrazione da WordPress: design con Cloudflare D1

## Obiettivo

- **Parallelamento**: il sito continua a leggere da WordPress (tj/v1); l’admin e il DB locale sono in affiancamento.
- **Import**: importare tutti gli articoli da WordPress nel nuovo database (idempotente, aggiornabile).
- **Dashboard admin**: gestione completa articoli (lista, creazione, modifica, eliminazione, pubblicazione).
- **Switch futuro**: quando si è pronti, il frontend passerà a leggere da D1 (o da API Next che usa D1) e WordPress potrà essere spento.

---

## Cloudflare D1: fa al caso nostro?

**Sì**, per un sito editoriale con migliaia di articoli e letture dominate da letture:

| Pro | Contro |
|-----|--------|
| SQL (SQLite) familiare, query flessibili | **Vincolo deploy**: D1 è solo su Cloudflare (Workers/Pages) |
| Serverless, nessun server da gestire | Per Next.js su **Vercel** servirebbe D1 via HTTP API (beta) o migrare deploy su Cloudflare |
| Ottimo per read-heavy (liste, singolo articolo, filtri) | Scritture meno frequenti (admin): più che sufficienti |
| Costi contenuti, scaling automatico | |

**Raccomandazione**:  
- Se il piano è **deploy su Cloudflare Pages** (con `@cloudflare/next-on-pages` o simile): D1 è la scelta naturale, binding diretto e latenza bassa.  
- Se resti su **Vercel**: si può comunque usare D1 tramite [D1 HTTP API](https://developers.cloudflare.com/d1/api/request/) (autenticazione con API token) oppure valutare **Vercel Postgres** / **Neon** / **Turso** (SQLite compatibile) per restare su stack Vercel.

In questo design assumiamo **D1** come nel tuo intento; lo schema SQL resta riutilizzabile anche per un altro SQLite/Postgres.

---

## Modello dati (formato nostro, non WordPress)

Si adotta un modello **semplice e piatto** per gli articoli, allineato a `PostWithMeta` ma con campi aggiuntivi per admin e import.

### Tabella `articles`

| Colonna | Tipo | Note |
|--------|------|------|
| `id` | INTEGER PRIMARY KEY | Autoincrementale, nostro |
| `wp_id` | INTEGER UNIQUE | ID WordPress (per import/idempotenza) |
| `slug` | TEXT NOT NULL UNIQUE | Slug URL (univoco) |
| `title` | TEXT NOT NULL | |
| `excerpt` | TEXT | |
| `content` | TEXT | HTML contenuto |
| `category_id` | INTEGER | Riferimento a `categories.id` (nostro) |
| `category_name` | TEXT | Denormalizzato per listing veloce |
| `category_slug` | TEXT | |
| `author_name` | TEXT | |
| `author_avatar_url` | TEXT | |
| `image_url` | TEXT | |
| `image_alt` | TEXT | |
| `view_count` | INTEGER | Default 0, aggiornabile da WP o da noi |
| `published_at` | TEXT (ISO 8601) | Data pubblicazione |
| `modified_at` | TEXT (ISO 8601) | Ultima modifica |
| `status` | TEXT | `draft` \| `published` \| `archived` |
| `source` | TEXT | `wordpress` \| `native` (creati in admin) |
| `link` | TEXT | URL canonico (es. da WP), opzionale |
| `created_at` | TEXT | Inserimento nel nostro DB |
| `updated_at` | TEXT | Ultimo aggiornamento nel nostro DB |

Indici: `slug`, `wp_id`, `published_at`, `status`, `category_id`, `source`.

### Tabella `categories`

Per coerenza con il frontend attuale (slug categoria, nome) e per la dashboard (scelta categoria in creazione/modifica):

| Colonna | Tipo | Note |
|--------|------|------|
| `id` | INTEGER PRIMARY KEY | Nostro |
| `wp_id` | INTEGER UNIQUE | ID WordPress |
| `name` | TEXT NOT NULL | |
| `slug` | TEXT NOT NULL UNIQUE | |
| `parent_id` | INTEGER | FK → categories.id, 0 = root |

Le categorie si importano da `tj/v1/categories` (una tantum o refresh); gli articoli referenziano `category_id` (nostro) e tengono `category_name` / `category_slug` denormalizzati per le liste.

---

## Import da WordPress

1. **Categorie**: chiamata a `GET tj/v1/categories`, insert/update in `categories` (key `wp_id`). Mappatura `wp_id` → `id` nostro.
2. **Articoli**: paginazione su `GET tj/v1/posts?per_page=100&page=N`. Per ogni post:
   - Cercare `categories` per `wp_id` = post.categoryId → ottenere nostro `category_id`.
   - Insert o replace in `articles` (upsert su `wp_id`), con `source = 'wordpress'`, `status = 'published'`, `published_at` = post.date, `modified_at` = post.modified ?? post.date.
3. **Idempotenza**: rieseguire l’import aggiorna i record esistenti (stesso `wp_id`), senza duplicati.
4. **Esecuzione**: script Node (o route API admin protetta) che può essere lanciato da dashboard (“Importa da WordPress”) o da CLI.

Dopo l’import, la dashboard mostrerà tutti gli articoli (filtrabili per source, status, categoria).

---

## Dashboard admin (scope)

- **Autenticazione**: protezione route `/admin` (es. middleware con sessione/token o OAuth; da definire in seguito).
- **Articoli**:
  - Lista con paginazione, filtri (status, categoria, source), ricerca per titolo/slug.
  - Dettaglio: visualizzazione e modifica (titolo, slug, excerpt, content, categoria, autore, immagine, status, date).
  - Creazione nuovo articolo (source = `native`).
  - Eliminazione (soft o hard da decidere).
  - Pulsante “Importa da WordPress” che lancia il job di import (e mostra log/risultato).
- **Categorie**: lista da D1, eventuale “Sincronizza da WordPress” per refresh.
- **Formato dati**: il frontend attuale usa `PostWithMeta`; le API Next che servono il frontend (quando si passerà a D1) mapperanno le righe D1 → stesso formato così da non toccare subito i componenti.

---

## Passi implementativi (suggeriti)

1. **Branch e schema**: branch `feature/admin-d1`, schema SQL D1 (e se usi Cloudflare, `wrangler.toml` + migrations).
2. **Accesso a D1 da Next**:
   - Su **Cloudflare Pages**: binding D1 nel `wrangler.toml` e uso in route API/Server Components.
   - Su **Vercel**: client che chiama D1 HTTP API (o, in alternativa, adottare un DB su Vercel e stesso schema).
3. **Import**: script/API che legge tj/v1 (categorie + post paginati), scrive in D1 (upsert).
4. **API interne**: route tipo `GET/POST /api/admin/articles`, `GET/PUT/DELETE /api/admin/articles/[id]` che leggono/scrivono D1; opzionale `GET /api/admin/import-wordpress` che avvia l’import.
5. **UI dashboard**: app route `/admin` (e sotto-routes), lista articoli, form creazione/modifica, pulsante import.
6. **Switch lettura (futuro)**: feature flag o env che sceglie la sorgente (WordPress vs D1); le stesse API pubbliche (es. `/api/posts/[page]`) leggono da D1 quando il flag è attivo, mantenendo il formato `PostWithMeta`.

---

## File da aggiungere (riferimento)

- `docs/ADMIN_D1_DESIGN.md` (questo file)
- `schema/d1/001_initial.sql` – schema tabelle `articles` e `categories`
- `wrangler.toml` – configurazione D1 per sviluppo locale e deploy Cloudflare (se usi Cloudflare)
- `.env.example` – variabili per D1 (e per WP_BASE già presenti)
- In seguito: `lib/db/d1.ts` (o equivalente), route `/api/admin/*`, pagine `/admin/*`
