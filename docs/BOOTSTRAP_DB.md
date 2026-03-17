# Piano bootstrap database (Neon)

Obiettivo: popolare il database con utenti admin, categorie e articoli da WordPress, e indicizzare le immagini già presenti su R2 nella tabella `media`.

---

## 1. Prerequisiti

- **Neon**: tabelle già create (vedi SQL in `.env.example` / messaggi precedenti):
  - `media`
  - `categories`
  - `articles` (con enum `article_status`, `article_source`)
  - `admin_users` (opzionale se resti su env per il singolo admin)
- **Env**: `DATABASE_URL` (Neon), `NEXT_PUBLIC_WP_BASE` (API WordPress), variabili R2 per lettura bucket.

---

## 2. Utenti admin

**Opzione A – Restare su env (attuale)**  
Nessuna azione: login resta gestito da `ADMIN_USER` + `ADMIN_PASSWORD_HASH` / `ADMIN_PASSWORD_HASH_B64` e `AUTH_SECRET`.

**Opzione B – Migrare in DB**  
- Inserire in `admin_users` almeno un record (username, password_hash bcrypt, display_name, role `admin`).
- Modificare `lib/auth` per leggere da `admin_users` (es. `getUserByUsername`, confronto hash) invece che da env.
- Lo script di bootstrap può fare un `INSERT INTO admin_users (...)` per il primo utente (password hash generato con bcrypt).

---

## 3. Categorie da WordPress

- **Fonte**: `GET {NEXT_PUBLIC_WP_BASE}/categories` (o endpoint categorie del plugin/sito WP).
- **Mappatura**: per ogni categoria WP → `INSERT INTO categories (name, slug, parent_id)`.
  - `parent_id`: se WP restituisce parent, mappare l’id WP parent al nuovo `id` già inserito (o fare due pass: prima tutte le root, poi le figlie).
- **Idempotenza**: usare `slug` come chiave: `INSERT ... ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()` (se hai UNIQUE su slug).

---

## 4. Articoli da WordPress

- **Fonte**: `GET {NEXT_PUBLIC_WP_BASE}/posts?per_page=100&page=...` (paginato). Includere `_embed` se necessario per `featured_media` e autore.
- **Per ogni post**:
  - **Immagine in evidenza**: da `post.featured_media` (id) → chiamata `GET .../media/{id}` per ottenere `source_url` (e alt da titolo/caption). Salvare in `articles.image_url` e `articles.image_alt`.
  - **Categoria**: da `post.categories[]` (id WP) → risolvere a slug/name usando la mappatura id WP → id/slug in `categories` (creata al passo 3).
  - **Mappatura campi**:
    - `wp_id` = id WordPress
    - `slug` = post.slug
    - `title` = post.title.rendered (strip HTML se necessario)
    - `excerpt` = post.excerpt.rendered (o strip tags)
    - `content` = post.content.rendered (HTML) — oppure convertire in blocchi BlockNote se vuoi editor compatibile
    - `category_id` / `category_slug` / `category_name` da categorie importate
    - `author_name` da `post._embedded.author` se presente
    - `published_at` = post.date (ISO)
    - `modified_at` = post.modified
    - `status` = post.status (publish → `published`, draft → `draft`, private → `private`)
    - `source` = `'wordpress'`
    - `image_url` / `image_alt` da featured media come sopra
- **Idempotenza**: `wp_id` univoco → `INSERT ... ON CONFLICT (wp_id) DO UPDATE SET ...` (serve UNIQUE su `articles(wp_id)` o upsert per slug).

---

## 5. Indicizzazione immagini (R2 → tabella `media`)

- **Input**: elenco chiavi oggetti R2 (stesso listing usato prima: prefisso `""`, paginato con ContinuationToken).
- **Filtri**: solo chiavi che sono “immagini” (estensione .jpg, .png, .gif, .webp) e solo **originali** (no varianti `-150x150`, `-300x200`, ecc.).
- **Per ogni chiave originale**:
  - Path in stile WordPress: `anno/mese/file.ext`.
  - Costruire URL full (e se vuoi thumb/small/medium/large se le varianti esistono su R2).
  - `INSERT INTO media (path, url_full, url_thumb, url_small, url_medium, url_large, mime_type, file_size, width, height)`.
- **Dati mancanti**: `file_size`, `width`, `height` da R2 metadata se disponibili; altrimenti 0 o NULL a seconda dello schema. `created_at` = now o da LastModified dell’oggetto R2.
- **Idempotenza**: `path` univoco → `INSERT ... ON CONFLICT (path) DO NOTHING` (o DO UPDATE) per non duplicare.

---

## 6. Ordine consigliato e script

1. **Creare tabelle** (se non già fatto) con gli script SQL forniti in precedenza.
2. **Utenti**: inserire primo admin in `admin_users` (se Opzione B) oppure lasciare env.
3. **Categorie**: script che chiama WP categories e fa INSERT/upsert in `categories`.
4. **Media**: script che lista R2, filtra originali, INSERT in `media` (con path univoco).
5. **Articoli**: script che chiama WP posts (paginato), per ogni post risolve featured_media e categorie, INSERT/upsert in `articles` con `image_url` e `image_alt`.

**Formato script suggerito**: una route API protetta (es. `POST /api/admin/bootstrap`) oppure uno script Node eseguibile con `ts-node` o `node --loader` che:
- legge env (DATABASE_URL, NEXT_PUBLIC_WP_BASE, R2_*),
- usa `@neondatabase/serverless` per gli INSERT,
- usa `fetch` verso WP e verso un endpoint interno o `@aws-sdk/client-s3` per R2 listing.

Dopo il bootstrap, la galleria media leggerà solo da DB; articoli e categorie saranno disponibili per l’admin e per il frontend.
