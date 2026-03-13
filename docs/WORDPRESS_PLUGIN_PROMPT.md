# Prompt: Plugin WordPress API leggera per frontend headless Next.js

## Contesto

Un sito Next.js (React 19) consuma l’API REST di WordPress (`techjournal.it`) come headless CMS. Il frontend fa diverse chiamate a `wp-json/wp/v2/` con `_embed=1`, ottenendo risposte molto pesanti (post completi, author, media, terms). Questo satura i processi lsphp e rallenta il caricamento.

**Obiettivo:** creare un plugin WordPress che espone endpoint REST dedicati, restituendo solo i campi necessari al frontend, riducendo payload e carico su lsphp.

---

## Requisiti tecnici

- **WordPress:** 6.x
- **PHP:** 8.0+
- **Namespace REST:** `tj/v1` (es. `/wp-json/tj/v1/...`)
- **Compatibilità:** il plugin deve coesistere con il sito WP esistente e con eventuali plugin (es. Post Views Counter / PVC per le visualizzazioni)

---

## Endpoint da implementare

### 1. `GET /wp-json/tj/v1/categories`

**Scopo:** elenco categorie (nav, sitemap, megamenu).

**Query params:** nessuno.

**Response:** array di oggetti:

```json
[
  {
    "id": 123,
    "name": "Apple",
    "slug": "apple",
    "link": "https://...",
    "taxonomy": "category",
    "parent": 0
  }
]
```

**Note:** escludere la categoria con `id === 1` (Uncategorized). Usare `WP_Term_Query` o `get_terms` con `taxonomy => 'category'`, `exclude => [1]`.

---

### 2. `GET /wp-json/tj/v1/posts`

**Scopo:** lista post paginata (home, categorie, load more).

**Query params:**

| Parametro   | Tipo   | Default | Descrizione                                      |
|------------|--------|---------|--------------------------------------------------|
| `per_page` | int    | 10      | Post per pagina                                  |
| `page`     | int    | 1       | Pagina                                           |
| `category` | int    | -       | ID categoria (include sottocategorie)            |
| `category_ids` | string | -   | ID multipli separati da virgola (OR logico)      |
| `after`    | string | -       | Data ISO 8601: solo post dopo questa data        |
| `search`   | string | -       | Ricerca full-text nel titolo/contenuto            |

**Response:** oggetto:

```json
{
  "posts": [
    {
      "id": 456,
      "date": "2025-03-08T10:00:00",
      "slug": "titolo-articolo",
      "link": "https://...",
      "title": "Titolo decodificato (no HTML)",
      "excerpt": "Estratto decodificato (no HTML)",
      "content": "<p>Contenuto HTML completo</p>",
      "categoryName": "Apple",
      "categorySlug": "apple",
      "categoryId": 123,
      "imageUrl": "https://.../image.jpg",
      "imageAlt": "Descrizione immagine",
      "authorName": "Nome Autore",
      "authorAvatarUrl": "https://.../avatar.jpg",
      "viewCount": 1234
    }
  ],
  "totalPages": 5
}
```

**Note:**

- `title` e `excerpt`: strip tags, decodifica entità HTML (`&#8217;` → `'`, `&amp;` → `&`, ecc.).
- `imageUrl`: URL immagine in evidenza (full size o `medium_large` se disponibile).
- `imageAlt`: `alt_text` della media o fallback al titolo.
- `authorName`: nome autore; `authorAvatarUrl`: URL avatar 96px o 48px.
- `viewCount`: da meta post (Post Views Counter: `post_views`, `pvc_views`, `views`; WP-PostViews: `post_views_count`, ecc.). Restituire `null` se non disponibile.
- Header `X-TJ-Total-Pages` con il numero totale di pagine (per consistenza con X-WP-TotalPages).

---

### 3. `GET /wp-json/tj/v1/post/:slug`

**Scopo:** singolo post per pagina articolo.

**Parametri:** `slug` nell’URL.

**Response:** singolo oggetto post (stessa struttura di `posts` nell’endpoint sopra), oppure `404` se non trovato.

---

### 4. `GET /wp-json/tj/v1/megamenu/:slug`

**Scopo:** 5 post per il megamenu di una categoria (caricamento on-demand al passaggio del mouse).

**Parametri:** `slug` = slug categoria (es. `apple`, `applicazioni` per apps).

**Query params:** nessuno.

**Response:** array di 5 oggetti:

```json
[
  {
    "slug": "titolo-articolo",
    "title": "Titolo decodificato",
    "imageUrl": "https://...",
    "imageAlt": "Descrizione"
  }
]
```

**Note:** usare mapping slug URL → slug WP se necessario (es. `apps` → `applicazioni`, `gaming` → `games`, `tech` → `tecnologia`, `ia` → `intelligenza-artificiale`). Ordinare per data decrescente. Prendere i primi 5 post della categoria (inclusa sottocategorie).

---

### 5. `GET /wp-json/tj/v1/home` (opzionale ma consigliato)

**Scopo:** batch di tutti i dati necessari per la home in una sola chiamata.

**Query params:** nessuno.

**Response:** oggetto:

```json
{
  "initial": {
    "posts": [...],
    "totalPages": 2,
    "pagesConsumed": 1
  },
  "offerte": [...],
  "trending": [...],
  "mostRead": [...],
  "weekTrending": [...],
  "monthTrending": [...]
}
```

- `initial.posts`: primi 20 post (hero + griglia), `totalPages` e `pagesConsumed` come da logica attuale.
- `offerte`: 5 post dalla categoria "offerte".
- `trending`: 20 post più recenti (generici).
- `mostRead`: 5 post ordinati per viewCount desc.
- `weekTrending`: 5 post degli ultimi 7 giorni, ordinati per viewCount desc.
- `monthTrending`: 5 post degli ultimi 30 giorni, ordinati per viewCount desc.

**Vantaggio:** una sola richiesta HTTP invece di 6, forte riduzione del carico lsphp.

---

### 6. `GET /wp-json/tj/v1/views/:postId` (opzionale)

**Scopo:** conteggio visualizzazioni per un singolo post (usato dal client per aggiornare il contatore in tempo reale).

**Parametri:** `postId` nell’URL.

**Response:** `{ "views": 1234 }` oppure `{ "views": null }` se non disponibile.

**Note:** integrare con Post Views Counter (`/pvc/v1/posts/:id`) o altri plugin di statistiche. Se il plugin non è presente, restituire `null`.

---

## Ottimizzazioni richieste

1. **Query dirette dove possibile:** usare `$wpdb` o `WP_Query` con `fields => 'ids'` e poi caricare solo i campi necessari, invece di passare dal controller REST standard.
2. **Niente `_embed`:** evitare le richieste aggiuntive per author/media/terms; recuperare i dati con query ottimizzate (JOIN su postmeta, wp_users, wp_posts per media).
3. **Transient cache:** per endpoint poco volatili (es. `categories`, `megamenu/:slug`) usare `set_transient` con TTL 300–600 secondi.
4. **Header Cache-Control:** impostare `Cache-Control: public, max-age=60` (o 300) dove appropriato per permettere caching lato CDN/Cloudflare.
5. **Payload minimo:** non includere campi non usati dal frontend (es. `guid`, `modified`, `sticky`, ecc.).

---

## Mapping slug URL ↔ slug WordPress

Il frontend usa slug abbreviati negli URL. Il plugin deve gestire:

| Slug URL | Slug WordPress      |
|----------|----------------------|
| apps     | applicazioni         |
| gaming   | games                |
| tech     | tecnologia           |
| ia       | intelligenza-artificiale |

Per `megamenu/:slug` e `posts?category=...` (quando si passa slug invece di ID), applicare questo mapping.

---

## Sicurezza

- Endpoint in sola lettura: nessuna autenticazione richiesta per GET.
- Validare e sanitizzare tutti i parametri (`absint`, `sanitize_text_field`, ecc.).
- Usare `rest_prepare_*` o callback dedicati; non esporre dati sensibili (email utenti, meta privati, ecc.).

---

## Output atteso

1. Plugin WordPress completo in una cartella (es. `techjournal-api/`) con:
   - `techjournal-api.php` (file principale, header plugin)
   - `includes/class-tj-rest-controller.php` (o simile) con registrazione route
   - `includes/class-tj-post-mapper.php` (o simile) per la trasformazione post → JSON leggero
2. `readme.txt` con descrizione, installazione, requisiti.
3. Istruzioni per attivare il plugin e per configurare il frontend Next.js per usare `WP_BASE = "https://www.techjournal.it/wp-json/tj/v1"` (o il path corretto) al posto di `wp/v2`.

---

## Riferimenti frontend

Il frontend Next.js attualmente usa:

- `fetchPostsForInitialDisplay` → `GET /posts` con categoryIds, per_page, page
- `fetchPostsByCategorySlug` → categorie + `GET /posts?categories=...`
- `fetchMostReadPosts` → `GET /posts` + sort lato client per viewCount
- `fetchTrendingWeekAndMonth` → `GET /posts?after=...` + sort per viewCount
- `fetchPostsForMegamenu` → `GET /posts?categories=...` per megamenu
- `fetchCategories` → `GET /categories`
- `fetchPostBySlug` → `GET /posts?slug=...`
- `fetchSearchPosts` → `GET /posts?search=...`

Tutti con `_embed=1`. Il plugin deve sostituire queste chiamate con gli endpoint `tj/v1` sopra, restituendo dati già pronti per il consumo (no parsing di `title.rendered`, `excerpt.rendered`, `_embedded`, ecc.).
