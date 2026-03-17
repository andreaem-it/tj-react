# Admin e migrazione da WordPress: design con Cloudflare D1

## Obiettivo

- **Costo zero**: hosting Vercel Hobby (gratuito) + D1 free tier; traffico basso (~50 visite/mese, obiettivo crescita). Nessun costo finché resti nei limiti free.
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

**Raccomandazione (costo zero)**:  
- **Vercel Hobby + D1 via HTTP API**: Next.js resta su Vercel (gratuito), il DB è D1 (free: 5M read/giorno, 100k write/giorno, 5 GB). Con traffico basso resti a 0 €. Le route API Next chiamano D1 tramite [D1 HTTP API](https://developers.cloudflare.com/d1/api/request/) (env: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID`).  
- Alternativa ugualmente a costo zero: **Cloudflare Pages + D1** (binding diretto, nessun “non commercial” come su Hobby).  
- Se in futuro il traffico o l’uso commerciale crescono, si può passare a Vercel Pro o restare su Cloudflare free.

In questo design assumiamo **D1**; lo schema SQL resta riutilizzabile anche per Neon/Turso.

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

## Failover Vercel → Cloudflare (raddoppio limiti)

Obiettivo: evitare blocchi quando si sforano i limiti Vercel Hobby (1M invocations, 100 GB). Se la risposta da Vercel fallisce (429, 5xx, timeout), la richiesta viene soddisfatta da Cloudflare, raddoppiando di fatto i limiti di *hosting*.

### Due architetture possibili

**A) Un solo database (D1), due deploy (Vercel + Cloudflare Pages)**  
- Vercel e Cloudflare eseguono la stessa app Next.js; entrambi leggono/scrivono sullo **stesso D1** (Vercel via HTTP API, Cloudflare via binding).  
- **Nessuna sincronizzazione**: un solo source of truth.  
- Failover = solo “dove arriva la richiesta”: prima si prova Vercel, in caso di errore si usa l’URL della deployment su Cloudflare (stesso dato).  
- **Carico**: nessun carico aggiuntivo da sync; al massimo un po’ di letture in più su D1 quando il traffico va su Cloudflare dopo un failover. Rischio di carichi eccessivi da sync: **nullo**.

**B) Due database (es. Neon/Turso su Vercel + D1 su Cloudflare)**  
- Ogni deploy ha il suo DB. Serve **sincronizzazione** tra i due.  
- Failover = prima Vercel (DB1), in fallimento Cloudflare (DB2).  
- Pro: nessun single point of failure sul DB. Contro: logica di sync e possibile ritardo/consistenza eventuale.

### Raccomandazione: architettura A (un solo D1)

Per costo zero e semplicità conviene **un solo D1** e due deploy:

1. **Vercel** (primario): Next.js che usa D1 via HTTP API.  
2. **Cloudflare Pages** (secondario): stesso codice Next.js che usa D1 via binding.  
3. **Failover lato client o DNS**:
   - **Opzione client**: l’app (o un piccolo script) prova prima l’origine Vercel; in caso di `fetch` fallito (429, 5xx, timeout) ritenta verso l’URL della deployment Cloudflare (es. `failover.techjournal.it` o path dedicato).  
   - **Opzione edge**: un proxy (es. Cloudflare in front a entrambi, o un Worker) che fa “try Vercel, on failure forward to Cloudflare Pages”.  
4. Nessuna sync: **non si raddoppia il carico sul DB** e non ci sono rischi di carichi eccessivi da sincronizzazione.

Se in futuro volessi due DB separati (architettura B), la sync andrebbe fatta in modo “leggero” (v. sotto) per non rischiare picchi.

---

## Sincronizzazione (solo se si adotta due DB – architettura B)

Se un giorno si usano **due database** (es. Neon + D1), la sincronizzazione va tenuta leggera per **evitare carichi eccessivi**.

### Strategie a basso carico

| Strategia | Carico | Consistenza | Quando usarla |
|-----------|--------|-------------|----------------|
| **Sync on write** | Solo in fase di scrittura (admin/import). Scritture sono rare (ordine di decine/giorno al massimo). | Quasi immediata | Sempre: ogni create/update/delete in admin scrive su **entrambi** i DB (o scrivi su primary e invii evento a job che aggiorna il secondario). |
| **Sync periodica (batch)** | Una full sync ogni N minuti (es. 15–30). Con migliaia di righe è qualche centinaio di read + write ogni 15 min. | Ritardo fino a N minuti | Solo se serve “riallineamento” dopo guasti; non indispensabile se on-write è affidabile. |
| **Evitare** | Full dump ogni pochi secondi; polling continuo su tabelle grandi. | — | Causerebbe carico inutile e rischio di hit limiti (D1/Neon) o costi. |

### Rischio carichi eccessivi

- **Con sync on write**: il carico aggiuntivo è **solo in fase di modifica contenuti** (pubblicazione, modifica, import). Con 50 visite/mese e poche modifiche al giorno, siamo nell’ordine di **decine di write al giorno** al secondo DB. Nessun rischio di picchi.  
- **Con sync periodica** (es. ogni 15 min): una full scan di `articles` + `categories` ogni 15 min è nell’ordine di poche migliaia di read + write ogni ora. Per D1/Neon in free tier è ancora **ben dentro i limiti**.  
- **Rischio alto** solo se si facesse: sync completa molto frequente (es. ogni 10 s) o retry aggressivi senza backoff. Da evitare.

In sintesi: con **un solo D1 e due deploy (A)** non c’è sync e **zero rischio**. Con **due DB (B)** una sync on-write (+ eventuale batch ogni 15–30 min per sicurezza) **non** porta carichi eccessivi per il tuo volume.

---

## File da aggiungere (riferimento)

- `docs/ADMIN_D1_DESIGN.md` (questo file)
- `schema/d1/001_initial.sql` – schema tabelle `articles` e `categories`
- `wrangler.toml` – configurazione D1 per sviluppo locale e deploy Cloudflare (se usi Cloudflare)
- `.env.example` – variabili per D1 (e per WP_BASE già presenti)
- In seguito: `lib/db/d1.ts` (o equivalente), route `/api/admin/*`, pagine `/admin/*`
