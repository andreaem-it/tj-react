# Autopost Facebook / Instagram da WordPress

Quando un articolo viene **pubblicato** su WordPress, un webhook chiama tj-api che:

1. Verifica il segreto condiviso (`WP_WEBHOOK_SECRET`).
2. Scrive su **Turso** (SQLite) per **non duplicare** post se WordPress rinvia la richiesta.
3. Pubblica su **Facebook Page** (link + messaggio) e su **Instagram** (foto da URL + caption), se configurato.

**Endpoint:** `POST https://www.techjournal.it/api/webhooks/wp-post-published` → proxy Next → `backend.techjournal.it` (tj-api).

## Plugin WordPress (consigliato)

Il plugin `scripts/wp-plugin/techjournal-api/` include già il listener su `transition_post_status`:

1. Carica la cartella su WordPress e attiva **TechJournal API**
2. **Impostazioni → TechJournal Social** (oppure in `wp-config.php`):
   - **Webhook URL:** `https://www.techjournal.it/api/webhooks/wp-post-published`
   - **Webhook secret:** stesso valore di `WP_WEBHOOK_SECRET` su Vercel (tj-api)

Oppure in `wp-config.php`:

```php
define('TJ_WEBHOOK_URL', 'https://www.techjournal.it/api/webhooks/wp-post-published');
define('TJ_WEBHOOK_SECRET', '...'); // = WP_WEBHOOK_SECRET su tj-api
```

## Variabili Vercel — progetto **tj-api** (obbligatorie per l'autopost)

| Variabile | Progetto | Descrizione |
|-----------|----------|-------------|
| `WP_WEBHOOK_SECRET` | **tj-api** | Stringa lunga casuale; deve coincidere con l'header `X-TJ-Webhook-Secret` inviato da WordPress. |
| `TURSO_DATABASE_URL` | **tj-api** | URL tipo `libsql://....turso.io` dalla dashboard Turso. |
| `TURSO_AUTH_TOKEN` | **tj-api** | Token JWT Turso. |
| `FACEBOOK_ACCESS_TOKEN` | **tj-api** | Token utente con permessi pagina; la route usa il **Page Access Token** da `me/accounts`. |
| `FACEBOOK_PAGE_ID` o `FACEBOOK_PAGE_NAME` | **tj-api** | Opzionale, per scegliere la pagina se ce ne sono più di una. |
| `FACEBOOK_BUSINESS_ID` | **tj-api** | Se la pagina è solo nel portfolio business. |
| `TJ_API_BASE_URL` | **frontend** | URL backend (es. `https://backend.techjournal.it`) per il proxy `/api/webhooks/*`. |

**Permessi Meta** (oltre a quelli delle statistiche): tipicamente `pages_manage_posts` e, per Instagram, `instagram_content_publish`. L’account IG deve essere **Business/Creator** collegato alla pagina Facebook.

## Snippet WordPress (tema o plugin)

Sostituisci `YOUR_SECRET` e l’URL del sito Next (es. produzione Vercel).

```php
<?php
/**
 * Notifica Vercel alla pubblicazione di un post.
 */
add_action('transition_post_status', function ($new_status, $old_status, $post) {
    if ($new_status !== 'publish' || $old_status === 'publish') {
        return;
    }
    if ($post->post_type !== 'post') {
        return;
    }

    $secret = 'YOUR_SECRET'; // uguale a WP_WEBHOOK_SECRET su Vercel
    $endpoint = 'https://www.techjournal.it/api/webhooks/wp-post-published';

    $thumb = get_the_post_thumbnail_url($post->ID, 'full');
    if (!$thumb || !is_string($thumb)) {
        $thumb = '';
    }

    $body = wp_json_encode([
        'wp_post_id'         => (int) $post->ID,
        'title'              => html_entity_decode(get_the_title($post), ENT_QUOTES, 'UTF-8'),
        'link'               => get_permalink($post),
        'excerpt'            => wp_strip_all_tags(get_the_excerpt($post)),
        'featured_image_url' => $thumb ?: null,
    ]);

    wp_remote_post($endpoint, [
        'timeout' => 90,
        'headers' => [
            'Content-Type'        => 'application/json',
            'X-TJ-Webhook-Secret' => $secret,
        ],
        'body'    => $body,
    ]);
}, 10, 3);
```

**Instagram**: senza immagine in evidenza il post FB può comunque andare; IG viene segnato come `skipped` nel JSON di risposta.

## Tabella Turso

Creata automaticamente alla prima chiamata: `social_autopost_log` (`wp_post_id`, `platform`, `status`, …).

## Sicurezza

- Non committare segreti né token Turso/Meta.
- Se un token è finito in chat o in repo: **revoca e rigenera** su Turso e Meta.
