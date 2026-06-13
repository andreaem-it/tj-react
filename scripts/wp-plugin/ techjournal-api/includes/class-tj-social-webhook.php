<?php
/**
 * Webhook autopost social: alla pubblicazione di un post WP notifica tj-api.
 *
 * Configurazione (wp-config.php o opzioni):
 * - TJ_WEBHOOK_URL  → es. https://www.techjournal.it/api/webhooks/wp-post-published
 * - TJ_WEBHOOK_SECRET → stesso valore di WP_WEBHOOK_SECRET su tj-api (Vercel)
 *
 * @package TechJournal_API
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

class TJ_Social_Webhook {

    private const OPTION_URL = 'tj_webhook_url';
    private const OPTION_SECRET = 'tj_webhook_secret';

    public function register(): void {
        add_action('transition_post_status', [$this, 'on_transition_post_status'], 10, 3);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_menu', [$this, 'register_settings_page']);
    }

    public function register_settings(): void {
        register_setting('tj_social_webhook', self::OPTION_URL, [
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => 'https://www.techjournal.it/api/webhooks/wp-post-published',
        ]);
        register_setting('tj_social_webhook', self::OPTION_SECRET, [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '',
        ]);
    }

    public function register_settings_page(): void {
        add_options_page(
            'TechJournal Social',
            'TechJournal Social',
            'manage_options',
            'tj-social-webhook',
            [$this, 'render_settings_page']
        );
    }

    public function render_settings_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1>TechJournal — Autopost social</h1>
            <p>Alla pubblicazione di un articolo, WordPress invia un webhook a tj-api (Facebook / Instagram).</p>
            <form method="post" action="options.php">
                <?php settings_fields('tj_social_webhook'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="<?php echo esc_attr(self::OPTION_URL); ?>">Webhook URL</label></th>
                        <td>
                            <input name="<?php echo esc_attr(self::OPTION_URL); ?>" id="<?php echo esc_attr(self::OPTION_URL); ?>"
                                   type="url" class="regular-text"
                                   value="<?php echo esc_attr($this->get_webhook_url()); ?>" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="<?php echo esc_attr(self::OPTION_SECRET); ?>">Webhook secret</label></th>
                        <td>
                            <input name="<?php echo esc_attr(self::OPTION_SECRET); ?>" id="<?php echo esc_attr(self::OPTION_SECRET); ?>"
                                   type="password" class="regular-text" autocomplete="new-password"
                                   value="<?php echo esc_attr($this->get_webhook_secret()); ?>" />
                            <p class="description">Deve coincidere con <code>WP_WEBHOOK_SECRET</code> su tj-api (Vercel).</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    /**
     * @param string $new_status
     * @param string $old_status
     * @param WP_Post $post
     */
    public function on_transition_post_status($new_status, $old_status, $post): void {
        if ($new_status !== 'publish' || $old_status === 'publish') {
            return;
        }
        if (!($post instanceof WP_Post) || $post->post_type !== 'post') {
            return;
        }
        if (wp_is_post_revision($post->ID) || wp_is_post_autosave($post->ID)) {
            return;
        }

        $this->notify_autopost($post);
    }

    private function notify_autopost(WP_Post $post): void {
        $url = $this->get_webhook_url();
        $secret = $this->get_webhook_secret();
        if ($url === '' || $secret === '') {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[TechJournal] Autopost social disabilitato: TJ_WEBHOOK_URL o TJ_WEBHOOK_SECRET mancanti.');
            }
            return;
        }

        $permalink = get_permalink($post);
        if (!is_string($permalink) || $permalink === '') {
            return;
        }
        $link = set_url_scheme($permalink, 'https');

        $thumb = get_the_post_thumbnail_url($post->ID, 'full');
        $published_gmt = get_post_time('c', true, $post);

        $body = wp_json_encode([
            'wp_post_id' => (int) $post->ID,
            'title' => html_entity_decode(get_the_title($post), ENT_QUOTES, 'UTF-8'),
            'link' => $link,
            'excerpt' => wp_strip_all_tags(get_the_excerpt($post)),
            'featured_image_url' => (is_string($thumb) && $thumb !== '') ? set_url_scheme($thumb, 'https') : null,
            'published_at' => is_string($published_gmt) ? $published_gmt : null,
        ]);

        if (!is_string($body)) {
            return;
        }

        $response = wp_remote_post($url, [
            'timeout' => 90,
            'blocking' => false,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-TJ-Webhook-Secret' => $secret,
            ],
            'body' => $body,
        ]);

        if (is_wp_error($response) && defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[TechJournal] Autopost webhook fallito: ' . $response->get_error_message());
        }
    }

    private function get_webhook_url(): string {
        if (defined('TJ_WEBHOOK_URL') && is_string(TJ_WEBHOOK_URL) && TJ_WEBHOOK_URL !== '') {
            return TJ_WEBHOOK_URL;
        }
        $opt = get_option(self::OPTION_URL, '');
        return is_string($opt) ? trim($opt) : '';
    }

    private function get_webhook_secret(): string {
        if (defined('TJ_WEBHOOK_SECRET') && is_string(TJ_WEBHOOK_SECRET) && TJ_WEBHOOK_SECRET !== '') {
            return TJ_WEBHOOK_SECRET;
        }
        $opt = get_option(self::OPTION_SECRET, '');
        return is_string($opt) ? trim($opt) : '';
    }
}
