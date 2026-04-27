<?php
/**
 * Mapper per trasformare post WordPress in JSON leggero per il frontend.
 *
 * @package TechJournal_API
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

class TJ_Post_Mapper {

    /**
     * Meta keys per view count (Post Views Counter, WP-PostViews, ecc.)
     */
    private const VIEW_COUNT_META_KEYS = [
		'post_views',
		'pvc_views',
		'views',
		'post_views_count',
		'pvc_total_views',
	];

    /**
     * Mapping slug URL → slug WordPress per megamenu e categorie.
     */
    private const SLUG_MAPPING = [
        'apps' => 'applicazioni',
        'gaming' => 'games',
        'tech' => 'tecnologia',
        'ia' => 'intelligenza-artificiale',
    ];

    /**
     * Trasforma un post WP in array JSON leggero (lista).
     */
    public function map_post_to_list_item(\WP_Post $post): array {
        $category = $this->get_primary_category($post->ID);
        $featured_image = $this->get_featured_image($post->ID);
        $author = $this->get_author_data((int) $post->post_author);

        $date = get_the_date('c', $post);

        return [
            'id' => $post->ID,
            'date' => is_string($date) ? $date : gmdate('c', strtotime($post->post_date)),
            'slug' => $post->post_name,
            'link' => get_permalink($post),
            'title' => $this->decode_text($post->post_title),
            'excerpt' => $this->decode_text($this->get_excerpt($post)),
            'content' => $this->get_post_content($post),
            'categoryName' => $category['name'] ?? '',
            'categorySlug' => $category['slug'] ?? '',
            'categoryId' => $category['id'] ?? 0,
            'imageUrl' => $featured_image['url'] ?? '',
            'imageAlt' => $featured_image['alt'] ?? $this->decode_text($post->post_title),
            'authorName' => $author['name'] ?? '',
            'authorAvatarUrl' => $author['avatar_url'] ?? '',
            'viewCount' => $this->get_view_count($post->ID),
        ];
    }

    /**
     * Trasforma un post in formato megamenu (campi ridotti).
     */
    public function map_post_to_megamenu_item(\WP_Post $post): array {
        $featured_image = $this->get_featured_image($post->ID);

        return [
            'slug' => $post->post_name,
            'title' => $this->decode_text($post->post_title),
            'imageUrl' => $featured_image['url'] ?? '',
            'imageAlt' => $featured_image['alt'] ?? $this->decode_text($post->post_title),
        ];
    }

    /**
     * Decodifica entità HTML e rimuove tag.
     */
    public function decode_text(string $text): string {
        $text = wp_strip_all_tags($text);
        return html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Ottiene la categoria primaria del post.
     */
    private function get_primary_category(int $post_id): array {
        $terms = get_the_terms($post_id, 'category');
        if (!$terms || is_wp_error($terms)) {
            return [];
        }

        $primary = null;
        foreach ($terms as $term) {
            if ($term->term_id === 1) {
                continue;
            }
            if ($primary === null || $term->parent === 0) {
                $primary = $term;
            }
        }

        if (!$primary) {
            $primary = $terms[0];
        }

        return [
            'id' => $primary->term_id,
            'name' => $primary->name,
            'slug' => $primary->slug,
        ];
    }

    /**
     * Ottiene l'immagine in evidenza (full size o medium_large).
     */
    private function get_featured_image(int $post_id): array {
        $thumbnail_id = (int) get_post_thumbnail_id($post_id);
        if (!$thumbnail_id) {
            return [];
        }

        $image_url = wp_get_attachment_image_url($thumbnail_id, 'medium_large');
        if (!$image_url) {
            $image_url = wp_get_attachment_image_url($thumbnail_id, 'full');
        }

        $alt = get_post_meta($thumbnail_id, '_wp_attachment_image_alt', true);
        if (empty($alt)) {
            $attachment = get_post($thumbnail_id);
            $alt = $attachment ? $this->decode_text((string) ($attachment->post_title ?? '')) : '';
        }

        return [
            'url' => $image_url ?: '',
            'alt' => $alt ?: '',
        ];
    }

    /**
     * Ottiene nome e avatar dell'autore.
     */
    private function get_author_data(int $user_id): array {
        if ($user_id <= 0) {
            return [];
        }
        $user = get_userdata($user_id);
        if (!$user) {
            return [];
        }

        $avatar_url = get_avatar_url($user_id, ['size' => 96]);
        if (!$avatar_url) {
            $avatar_url = get_avatar_url($user_id, ['size' => 48]);
        }

        return [
            'name' => $user->display_name,
            'avatar_url' => $avatar_url ?: '',
        ];
    }

    /**
     * Ottiene il contenuto processato del post (shortcodes, filtri).
     * Imposta il post globale per compatibilità con plugin che usano the_content.
     */
    private function get_post_content(\WP_Post $post): string {
        $previous_post = $GLOBALS['post'] ?? null;
        $GLOBALS['post'] = $post;
        setup_postdata($post);

        $content = apply_filters('the_content', (string) ($post->post_content ?? ''));

        if ($previous_post !== null) {
            $GLOBALS['post'] = $previous_post;
            setup_postdata($previous_post);
        } else {
            wp_reset_postdata();
        }

        return $content;
    }

    /**
     * Ottiene l'estratto del post.
     */
    private function get_excerpt(\WP_Post $post): string {
        if (!empty($post->post_excerpt)) {
            return $post->post_excerpt;
        }
        return wp_trim_words(wp_strip_all_tags($post->post_content), 55);
    }

    /**
     * Restituisce la meta key su cui scrivere il fallback increment.
     */
    private function resolve_view_meta_key(int $post_id): string {
        foreach (self::VIEW_COUNT_META_KEYS as $meta_key) {
            $raw = get_post_meta($post_id, $meta_key, true);
            if ($raw !== '' && $raw !== false && $raw !== null) {
                return $meta_key;
            }
        }
        return 'post_views';
    }

    /**
     * Ottiene il conteggio visualizzazioni.
     * Priorità:
     * 1) API plugin (se disponibile)
     * 2) massimo tra le meta key note
     */
    public function get_view_count(int $post_id): ?int {
        if ($post_id <= 0) {
            return 0;
        }

        $plugin_views = null;

        // Post Views Counter
        if (function_exists('pvc_get_post_views')) {
            $views = pvc_get_post_views($post_id);
            $n = absint($views);
            $plugin_views = $n >= 0 ? $n : 0;
        }

        // Fallback robusto: non fermarsi alla prima key.
        $meta_max = null;
        foreach (self::VIEW_COUNT_META_KEYS as $meta_key) {
            $raw = get_post_meta($post_id, $meta_key, true);
            if ($raw === '' || $raw === false || $raw === null) {
                continue;
            }
            $n = absint($raw);
            $meta_max = $meta_max === null ? $n : max($meta_max, $n);
        }

        if ($plugin_views === null && $meta_max === null) {
            return 0;
        }
        if ($plugin_views === null) {
            return $meta_max ?? 0;
        }
        if ($meta_max === null) {
            return $plugin_views;
        }

        // Evita che una sorgente stale a 0 oscuri il valore valido.
        return max($plugin_views, $meta_max);
    }

    /**
     * Incrementa il conteggio visualizzazioni.
     * Verifica sempre il delta reale prima/dopo.
     */
    public function increment_view_count(int $post_id): bool {
        if ($post_id <= 0) {
            return false;
        }

        $before = $this->get_view_count($post_id) ?? 0;

        // 1) Tentativo via Post Views Counter
        if (function_exists('pvc_update_post_views')) {
            $current_plugin = function_exists('pvc_get_post_views')
                ? absint(pvc_get_post_views($post_id))
                : $before;
            pvc_update_post_views($post_id, $current_plugin + 1);
            $after = $this->get_view_count($post_id) ?? 0;
            if ($after > $before) {
                return true;
            }
        }

        // 2) Tentativo via WP-PostViews
        if (function_exists('process_postviews')) {
            process_postviews($post_id);
            $after = $this->get_view_count($post_id) ?? 0;
            if ($after > $before) {
                return true;
            }
        }

        // 3) Fallback manuale su meta.
        $meta_key = $this->resolve_view_meta_key($post_id);
        $current = absint(get_post_meta($post_id, $meta_key, true));
        update_post_meta($post_id, $meta_key, $current + 1);
        $raw_after = absint(get_post_meta($post_id, $meta_key, true));

        $final = $this->get_view_count($post_id) ?? 0;
        return $final > $before || $raw_after > $current;
    }

    /**
     * Risolve slug URL in slug WordPress (con mapping).
     */
    public static function resolve_category_slug(string $url_slug): string {
        return self::SLUG_MAPPING[$url_slug] ?? $url_slug;
    }

    /**
     * Ottiene gli ID categoria da uno slug (include sottocategorie).
     */
    public static function get_category_ids_by_slug(string $slug): array {
        $wp_slug = self::resolve_category_slug($slug);
        $term = get_term_by('slug', $wp_slug, 'category');
        if (!$term || is_wp_error($term)) {
            return [];
        }

        $ids = [$term->term_id];
        $children = get_term_children($term->term_id, 'category');
        if (!is_wp_error($children)) {
            $ids = array_merge($ids, array_map('intval', $children));
        }
        return $ids;
    }
}
