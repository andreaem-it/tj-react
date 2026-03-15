# SEO: confronto con RankMath e migliorie possibili

## Cosa fa RankMath (WordPress)

RankMath ottimizza in particolare:

- **Title e meta description** per articolo/categoria con focus keyphrase
- **URL canonico**
- **Open Graph** (Facebook/LinkedIn) e **Twitter Card**
- **Schema.org (JSON-LD)**: Article, BreadcrumbList, Organization, WebSite, eventualmente FAQ/HowTo
- **Robots**: `robots.txt` e meta tag per pagina (noindex/nofollow dove serve)
- **Sitemap XML** con priorità e changeFrequency
- **Data di modifica** articolo (per schema e sitemap)
- **RSS/Atom**
- **Analisi keyword** (tool interno, non impatta il markup)

---

## Cosa stiamo già facendo (frontend Next.js)

| Funzionalità | Stato | Note |
|--------------|--------|------|
| **Title** | ✅ | Template `%s \| TechJournal` in layout; per articolo/categoria/price-radar da `generateMetadata` |
| **Meta description** | ✅ | Da excerpt (≤160 caratteri) su articoli, descrizioni su categorie e pagine |
| **Canonical URL** | ✅ | `alternates.canonical` su articoli, categorie, price-radar |
| **Open Graph** | ✅ | title, description, url, siteName; su articoli anche images, type article, publishedTime, authors |
| **Twitter Card** | ✅ | summary_large_image, title, description, images su articoli |
| **metadataBase** | ✅ | In layout per risolvere URL relativi (es. OG image) |
| **Schema NewsArticle** | ✅ | `ArticleStructuredData`: headline, description, image, datePublished, dateModified, author, publisher, mainEntityOfPage |
| **Schema BreadcrumbList** | ✅ | `Breadcrumbs` con JSON-LD + nav visiva |
| **robots.txt** | ✅ | allow /, disallow /api/, sitemap |
| **Sitemap XML** | ✅ | Home, search, price-radar, categorie, articoli, pagine legali; lastModified, changeFrequency, priority |
| **RSS** | ✅ | `/feed.xml` con atom:link in layout |
| **Breadcrumb visivi** | ✅ | Nav con aria-label e link corretti |
| **H1 unico** | ✅ | Un solo h1 per pagina articolo |
| **Immagine articolo** | ✅ | OG image 1200x630, alt su immagini |

---

## Cosa manca o si può migliorare

### 1. **Data di modifica articolo (dateModified)**

- **RankMath**: usa `modified` per schema e a volte per sitemap.
- **Noi**: in `ArticleStructuredData` usiamo `post.date` anche come `dateModified`; in sitemap usiamo `post.date` come `lastModified`.
- **Se l’API WordPress espone** `modified` (o `modified_gmt`): va mappato in `PostWithMeta`, usato in `ArticleStructuredData` e in sitemap come `lastModified`. Se non c’è, lasciare `dateModified` uguale a `datePublished` è accettabile.

### 2. **Schema Organization e WebSite (layout)**

- **RankMath**: spesso aggiunge Organization (nome, logo, url) e WebSite (con SearchAction per la search box di Google).
- **Noi**: Organization è solo dentro NewsArticle come `publisher`. Manca uno **Organization** globale e un **WebSite** con `potentialAction` (SearchAction) per la search.
- **Implementazione**: componente (es. `SiteStructuredData`) in layout con:
  - `@type: Organization` (name, logo, url)
  - `@type: WebSite` (name, url, `potentialAction` con SearchAction che punta a `/search?q={search_term_string}`).

### 3. **URL canonico e condivisione con trailing slash**

- **Noi**: in `ShareButtons` / articolo usi `https://www.techjournal.it${articleHref}/` (con trailing slash). Il canonical in Next.js di solito non ha trailing slash. Meglio **allineare**: stesso formato per canonical e share (tutti con o tutti senza trailing slash), e usare `SITE_URL` da constants invece di hardcodare `www.techjournal.it`.

### 4. **Open Graph: locale**

- **Layout**: c’è `openGraph.locale: "it_IT"`. Va bene; se in futuro ci sono altre lingue si può aggiungere `locale:alternate`.

### 5. **Meta robots per pagina**

- **RankMath**: permette noindex/nofollow per singola pagina (es. pagine di paginazione, risultati ricerca).
- **Noi**: non abbiamo meta robots per pagina. Si può aggiungere dove serve (es. `noindex, follow` su `/search` se non vuoi indicizzare i risultati, o su pagine “utility”).

### 6. **Immagine OG assente**

- **Noi**: se l’articolo non ha immagine usi `${SITE_URL}/og-default.png`. Verificare che **esista** davvero `public/og-default.png` (o equivalente) e che sia 1200×630 px.

### 7. **Keyword / focus keyphrase**

- **RankMath**: usa campi per keyword/focus keyphrase (analisi interna). **Meta keyword** non è usato da Google; si può ignorare a meno che non serva per altri motori/tool. Non priorità alta.

### 8. **RSS: articoli con immagine e categoria**

- **Noi**: feed con title, link, guid, description, pubDate. RankMath a volte aggiunge immagine (media:content) e categoria. Si può arricchire il feed con `<category>` e, se l’API lo fornisce, immagine.

### 9. **Sitemap: lastModified reale**

- Se l’API espone `modified` per ogni post, usarlo in sitemap come `lastModified` invece di `post.date`.

### 10. **Breadcrumbs e ArticleStructuredData: URL assoluti**

- **Noi**: in `Breadcrumbs` e `ArticleStructuredData` è usato `https://www.techjournal.it`. Meglio usare **`SITE_URL`** da `lib/constants` così in staging/prod non resti hardcodato il dominio.

---

## Priorità suggerite

1. **Alta**: Schema **Organization + WebSite** in layout (con SearchAction se hai `/search`).
2. **Alta**: Usare **SITE_URL** ovunque invece di `https://www.techjournal.it` (Breadcrumbs, ArticleStructuredData, ShareButtons/shareUrl).
3. **Media**: **dateModified** e **lastModified** sitemap da API se WordPress espone `modified`.
4. **Media**: **Meta robots** su `/search` (es. `noindex, follow`) se non vuoi indicizzare le pagine di ricerca.
5. **Bassa**: Immagine e categoria nel **RSS**; verificare **og-default.png**; eventuale **FAQ/HowTo** schema solo se usi blocchi dedicati in futuro.

Se vuoi, il passo successivo è implementare le voci 1 e 2 (Organization/WebSite e SITE_URL ovunque) e, se l’API ha il campo, la 3 (modified).

---

## Audit SEO applicati (titoli, www, Open Graph, performance)

- **Titoli e descrizioni con keyword**: tutte le pagine (home, chi-siamo, lavora-con-noi, politica-editoriale, privacy, contatti, search, price-radar) hanno titolo e meta description con parole chiave naturali (Apple, tech, gadget, notizie, ecc.). Template layout: `%s | TechJournal`.
- **Redirect www/non-www**: in Next.js 16 il middleware è deprecato (Turbopack), quindi il redirect 301 da `techjournal.it` a `www.techjournal.it` va configurato a livello hosting: in **Vercel** → Project → Settings → Domains, aggiungi entrambi i domini e imposta il redirect da `techjournal.it` verso `www.techjournal.it` (o scegli un solo dominio canonico e reindirizza l’altro). In alternativa, configura un redirect 301 nel proxy/CDN che sta davanti all’app.
- **Open Graph senza duplicati**: il layout definisce solo `openGraph.siteName`, `locale` e `type`. Ogni pagina importante espone un proprio set completo (title, description, url, eventuali images) così da avere un solo `og:description` (e un solo `og:title`) per pagina.
- **Prestazioni (richieste)**: le pagine con molte card generano molte richieste immagini (next/image già usa lazy loading e `sizes` responsive). Per ridurre ulteriormente: limitare il numero di card above-the-fold, usare `priority` solo per hero, verificare che non ci siano iframe/embed non necessari.
