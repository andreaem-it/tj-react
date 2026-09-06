<?php
/**
 * Controller REST per gli endpoint tj/v1.
 *
 * @package TechJournal_API
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

class TJ_REST_Controller extends WP_REST_Controller {

    private const NAMESPACE = 'tj/v1';
    private const CACHE_TTL = 300;
    private const CACHE_TTL_LONG = 600;

    private TJ_Post_Mapper $mapper;

    public function __construct() {
        $this->mapper = new TJ_Post_Mapper();
    }

    public function register_routes(): void {
        register_rest_route(self::NAMESPACE, '/categories', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_categories'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/posts', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_posts'],
                'permission_callback' => '__return_true',
                'args' => $this->get_posts_collection_params(),
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/post/(?P<slug>[a-zA-Z0-9\-_]+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_post_by_slug'],
                'permission_callback' => '__return_true',
                'args' => [
                    'slug' => [
                        'required' => true,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_title',
                    ],
                ],
            ],
        ]);

        /**
         * Scrittura autenticata (§47, §19): l'unica nel plugin, finora
         * interamente di sola lettura. Autenticazione via WordPress
         * Application Passwords (core dalla 5.6) — nessun meccanismo custom:
         * `current_user_can` funziona automaticamente perché WP risolve
         * l'utente dall'header Basic Auth prima che il permission_callback
         * giri. Chi chiama deve solo avere i permessi di modifica sul post,
         * esattamente come nell'editor.
         */
        register_rest_route(self::NAMESPACE, '/post/(?P<id>\d+)/review', [
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [$this, 'update_review'],
                'permission_callback' => [$this, 'can_edit_post'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'type' => 'integer',
                        'validate_callback' => function ($param) {
                            return absint($param) > 0;
                        },
                    ],
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/post/(?P<id>\d+)/changelog', [
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [$this, 'update_changelog'],
                'permission_callback' => [$this, 'can_edit_post'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'type' => 'integer',
                        'validate_callback' => function ($param) {
                            return absint($param) > 0;
                        },
                    ],
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/post/(?P<id>\d+)/tldr', [
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [$this, 'update_tldr'],
                'permission_callback' => [$this, 'can_edit_post'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'type' => 'integer',
                        'validate_callback' => function ($param) {
                            return absint($param) > 0;
                        },
                    ],
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/post/(?P<id>\d+)/breaking', [
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [$this, 'update_breaking'],
                'permission_callback' => [$this, 'can_edit_post'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'type' => 'integer',
                        'validate_callback' => function ($param) {
                            return absint($param) > 0;
                        },
                    ],
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/author/(?P<slug>[a-zA-Z0-9\-_]+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_author'],
                'permission_callback' => '__return_true',
                'args' => [
                    'slug' => [
                        'required' => true,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_title',
                    ],
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/megamenu/(?P<slug>[a-zA-Z0-9\-_]+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_megamenu'],
                'permission_callback' => '__return_true',
                'args' => [
                    'slug' => [
                        'required' => true,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_title',
                    ],
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/home', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_home'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route(self::NAMESPACE, '/views/(?P<post_id>\d+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_views'],
                'permission_callback' => '__return_true',
                'args' => [
                    'post_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'validate_callback' => function ($param) {
                            return absint($param) > 0;
                        },
                    ],
                ],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'increment_views'],
                'permission_callback' => '__return_true',
                'args' => [
                    'post_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'validate_callback' => function ($param) {
                            return absint($param) > 0;
                        },
                    ],
                ],
            ],
        ]);
    }

    private function get_posts_collection_params(): array {
        return [
            'per_page' => [
                'default' => 10,
                'type' => 'integer',
                'minimum' => 1,
                'maximum' => 100,
                'sanitize_callback' => 'absint',
            ],
            'page' => [
                'default' => 1,
                'type' => 'integer',
                'minimum' => 1,
                'sanitize_callback' => 'absint',
            ],
            'category' => [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'category_ids' => [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'after' => [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'search' => [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'slug' => [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_title',
            ],
            'author' => [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_title',
            ],
        ];
    }

    /**
     * GET /tj/v1/categories
     */
    public function get_categories(WP_REST_Request $request): WP_REST_Response {
        $cache_key = 'tj_categories';
        $cached = get_transient($cache_key);
        if ($cached !== false) {
            $response = new WP_REST_Response($cached, 200);
            $this->add_cache_headers($response, self::CACHE_TTL);
            return $response;
        }

        $terms = get_terms([
            'taxonomy' => 'category',
            'exclude' => [1],
            'hide_empty' => false,
            'orderby' => 'name',
            'order' => 'ASC',
        ]);

        if (is_wp_error($terms)) {
            return new WP_REST_Response([], 200);
        }

        $data = array_map(static function (\WP_Term $term): array {
            $link = get_term_link($term);
            return [
                'id' => $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
                'link' => is_string($link) ? $link : '',
                'taxonomy' => $term->taxonomy,
                'parent' => (int) $term->parent,
            ];
        }, $terms);

        set_transient($cache_key, $data, self::CACHE_TTL_LONG);

        $response = new WP_REST_Response($data, 200);
        $this->add_cache_headers($response, self::CACHE_TTL);
        return $response;
    }

    /**
     * GET /tj/v1/posts
     */
    public function get_posts(WP_REST_Request $request): WP_REST_Response {
        $per_page = (int) ($request->get_param('per_page') ?: 10);
        $page = (int) ($request->get_param('page') ?: 1);
        $category = $request->get_param('category');
        $category_ids = $request->get_param('category_ids');
        $after = $request->get_param('after');
        $search = $request->get_param('search');
        $slug = $request->get_param('slug');
        $author = $request->get_param('author');

        // Uno slug autore che non risolve a nessun utente deve restituire
        // zero articoli, non "ignora il filtro e mostra tutto": un ID `0` in
        // WP_Query verrebbe trattato come "nessun filtro autore", il che
        // sarebbe il comportamento sbagliato qui.
        if ($author !== null && $author !== '') {
            $author_user = get_user_by('slug', $author);
            if (!$author_user) {
                $response = new WP_REST_Response(['posts' => [], 'totalPages' => 0], 200);
                $this->add_cache_headers($response, 60);
                return $response;
            }
        }

        $args = [
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => min($per_page, 100),
            'paged' => $page,
            'orderby' => 'date',
            'order' => 'DESC',
            'no_found_rows' => false,
        ];

        if (isset($author_user)) {
            $args['author'] = $author_user->ID;
        }

        if ($category_ids !== null && $category_ids !== '') {
            $ids = array_map('absint', array_filter(explode(',', $category_ids)));
            if (!empty($ids)) {
                $args['tax_query'] = [
                    [
                        'taxonomy' => 'category',
                        'field' => 'term_id',
                        'terms' => $ids,
                        'operator' => 'IN',
                    ],
                ];
            }
        } elseif ($category !== null && $category !== '') {
            if (is_numeric($category)) {
                $cat_id = absint($category);
                $children = get_term_children($cat_id, 'category');
                $cat_ids = is_wp_error($children)
                    ? [$cat_id]
                    : array_merge([$cat_id], array_map('intval', $children));
                $args['tax_query'] = [
                    [
                        'taxonomy' => 'category',
                        'field' => 'term_id',
                        'terms' => $cat_ids,
                        'include_children' => true,
                    ],
                ];
            } else {
                $cat_ids = TJ_Post_Mapper::get_category_ids_by_slug($category);
                if (!empty($cat_ids)) {
                    $args['tax_query'] = [
                        [
                            'taxonomy' => 'category',
                            'field' => 'term_id',
                            'terms' => $cat_ids,
                            'include_children' => true,
                        ],
                    ];
                }
            }
        }

        if ($after !== null && $after !== '') {
            $args['date_query'] = [
                [
                    'after' => $after,
                    'inclusive' => false,
                ],
            ];
        }

        if ($search !== null && $search !== '') {
            $args['s'] = $search;
        }

        if ($slug !== null && $slug !== '') {
            $args['name'] = $slug;
        }

        $query = new WP_Query($args);
        $posts = $query->get_posts();
        $total_pages = (int) $query->max_num_pages;

        $mapper = $this->mapper;
        $mapped = array_map(static function (\WP_Post $p) use ($mapper) {
            return $mapper->map_post_to_list_item($p);
        }, $posts);

        $response = new WP_REST_Response([
            'posts' => $mapped,
            'totalPages' => $total_pages,
        ], 200);

        $response->header('X-TJ-Total-Pages', (string) $total_pages);
        $this->add_cache_headers($response, 60);
        return $response;
    }

    /**
     * GET /tj/v1/post/:slug
     */
    public function get_post_by_slug(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $slug = $request->get_param('slug');

        $posts = get_posts([
            'name' => $slug,
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 1,
        ]);

        if (empty($posts)) {
            return new WP_Error('not_found', 'Post non trovato', ['status' => 404]);
        }

        $data = $this->mapper->map_post_to_list_item($posts[0]);

        $response = new WP_REST_Response($data, 200);
        $this->add_cache_headers($response, 60);
        return $response;
    }

    /**
     * Permesso di modifica sul post indicato dall'URL. Stesso controllo che
     * userebbe l'editor di WordPress — non un permesso più largo o più
     * stretto inventato per questa API.
     */
    public function can_edit_post(WP_REST_Request $request): bool {
        $id = absint($request->get_param('id'));
        return $id > 0 && current_user_can('edit_post', $id);
    }

    /**
     * Un valore per riga in un campo custom di solo testo, sanificato riga
     * per riga. Righe vuote scartate; campo vuoto → meta rimossa, non
     * salvata come stringa vuota (coerente con `get_review_data`, che
     * tratta l'assenza del meta come "non compilato").
     */
    private function save_lines_meta(int $post_id, string $meta_key, $lines): void {
        if (!is_array($lines)) {
            delete_post_meta($post_id, $meta_key);
            return;
        }
        $clean = array_values(array_filter(array_map(static function ($line) {
            return sanitize_text_field(trim((string) $line));
        }, $lines), static fn($line) => $line !== ''));

        if (empty($clean)) {
            delete_post_meta($post_id, $meta_key);
            return;
        }
        update_post_meta($post_id, $meta_key, implode("\n", $clean));
    }

    /**
     * PUT /tj/v1/post/:id/review (§47) — scrittura autenticata.
     *
     * Sovrascrive interamente i campi recensione con quanto ricevuto: un
     * campo assente dal body viene rimosso, non lasciato invariato. Chi
     * chiama invia sempre lo stato completo del form, non una patch parziale
     * — più semplice da ragionare per un form con pochi campi come questo.
     */
    public function update_review(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = absint($request->get_param('id'));
        $post = get_post($id);
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('not_found', 'Post non trovato', ['status' => 404]);
        }

        $body = $request->get_json_params() ?? [];
        $ratingRaw = $body['rating'] ?? null;

        if ($ratingRaw === null || $ratingRaw === '') {
            delete_post_meta($id, 'tj_review_rating');
        } else {
            if (!is_numeric($ratingRaw) || (float) $ratingRaw < 0 || (float) $ratingRaw > 10) {
                return new WP_Error('invalid_rating', 'Voto non valido: deve essere fra 0 e 10', ['status' => 400]);
            }
            update_post_meta($id, 'tj_review_rating', (string) (float) $ratingRaw);
        }

        $this->save_lines_meta($id, 'tj_review_pros', $body['pros'] ?? []);
        $this->save_lines_meta($id, 'tj_review_cons', $body['cons'] ?? []);

        foreach ([
            'testDuration' => 'tj_review_test_duration',
            'methodology' => 'tj_review_methodology',
            'verdict' => 'tj_review_verdict',
        ] as $bodyKey => $metaKey) {
            $value = trim((string) ($body[$bodyKey] ?? ''));
            if ($value === '') {
                delete_post_meta($id, $metaKey);
            } else {
                update_post_meta($id, $metaKey, sanitize_text_field($value));
            }
        }

        $data = $this->mapper->map_post_to_list_item($post);
        return new WP_REST_Response(['review' => $data['review']], 200);
    }

    /**
     * PUT /tj/v1/post/:id/changelog (§19, §35-36) — scrittura autenticata.
     *
     * Riscrive `tj_changelog` nello stesso formato riga per riga che
     * `get_changelog_data` sa già leggere (`AAAA-MM-GG: nota`): non serve un
     * secondo parser. Voci con data non valida o nota vuota vengono
     * scartate, non bloccano il salvataggio delle altre.
     */
    public function update_changelog(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = absint($request->get_param('id'));
        $post = get_post($id);
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('not_found', 'Post non trovato', ['status' => 404]);
        }

        $body = $request->get_json_params() ?? [];
        $entries = is_array($body['entries'] ?? null) ? $body['entries'] : [];

        $lines = [];
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $date = trim((string) ($entry['date'] ?? ''));
            $note = trim((string) ($entry['note'] ?? ''));
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || $note === '') {
                continue;
            }
            $lines[] = $date . ': ' . sanitize_text_field($note);
        }

        if (empty($lines)) {
            delete_post_meta($id, 'tj_changelog');
        } else {
            update_post_meta($id, 'tj_changelog', implode("\n", $lines));
        }

        $data = $this->mapper->map_post_to_list_item($post);
        return new WP_REST_Response(['changelog' => $data['changelog']], 200);
    }

    /**
     * PUT /tj/v1/post/:id/tldr (§14) — scrittura autenticata.
     *
     * Sovrascrive interamente `tj_tldr` con l'array ricevuto (max 5 righe,
     * un punto per voce): usato dall'autoposter per persistere il TL;DR
     * generato una sola volta, non ricalcolato a ogni richiesta. Riusa lo
     * stesso helper riga-per-riga di pro/contro recensione — stesso formato,
     * stesse regole di sanificazione.
     */
    public function update_tldr(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = absint($request->get_param('id'));
        $post = get_post($id);
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('not_found', 'Post non trovato', ['status' => 404]);
        }

        $body = $request->get_json_params() ?? [];
        $points = is_array($body['points'] ?? null) ? array_slice($body['points'], 0, 5) : [];

        $this->save_lines_meta($id, 'tj_tldr', $points);

        $data = $this->mapper->map_post_to_list_item($post);
        return new WP_REST_Response(['tldr' => $data['tldr']], 200);
    }

    /**
     * PUT /tj/v1/post/:id/breaking (§12) — scrittura autenticata.
     *
     * `kind` vuoto/assente disattiva il breaking (rimuove i meta). `kind`
     * valorizzato richiede `expiresAt` — coerente con `get_breaking_data()`,
     * che tratta un breaking senza scadenza come non attivo.
     */
    public function update_breaking(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = absint($request->get_param('id'));
        $post = get_post($id);
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('not_found', 'Post non trovato', ['status' => 404]);
        }

        $body = $request->get_json_params() ?? [];
        $kind = trim((string) ($body['kind'] ?? ''));

        if ($kind === '') {
            delete_post_meta($id, 'tj_breaking_kind');
            delete_post_meta($id, 'tj_breaking_expires_at');
            delete_post_meta($id, 'tj_breaking_priority');
        } else {
            if ($kind !== 'breaking' && $kind !== 'live') {
                return new WP_Error('invalid_kind', 'kind deve essere "breaking", "live" o vuoto', ['status' => 400]);
            }
            $expires_at = trim((string) ($body['expiresAt'] ?? ''));
            if ($expires_at === '' || strtotime($expires_at) === false) {
                return new WP_Error('invalid_expires_at', 'expiresAt deve essere una data valida', ['status' => 400]);
            }
            update_post_meta($id, 'tj_breaking_kind', $kind);
            update_post_meta($id, 'tj_breaking_expires_at', $expires_at);

            $priority_raw = $body['priority'] ?? null;
            if ($priority_raw === null || $priority_raw === '') {
                delete_post_meta($id, 'tj_breaking_priority');
            } else {
                update_post_meta($id, 'tj_breaking_priority', (string) (int) $priority_raw);
            }
        }

        $data = $this->mapper->map_post_to_list_item($post);
        return new WP_REST_Response(['breaking' => $data['breaking']], 200);
    }

    /**
     * GET /tj/v1/author/:slug (§40)
     */
    public function get_author(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $slug = $request->get_param('slug');
        $data = TJ_Post_Mapper::get_author_by_slug($slug);
        if ($data === null) {
            return new WP_Error('not_found', 'Autore non trovato', ['status' => 404]);
        }

        $response = new WP_REST_Response($data, 200);
        $this->add_cache_headers($response, self::CACHE_TTL);
        return $response;
    }

    /**
     * GET /tj/v1/megamenu/:slug
     */
    public function get_megamenu(WP_REST_Request $request): WP_REST_Response {
        $slug = $request->get_param('slug');
        $cache_key = 'tj_megamenu_' . $slug;
        $cached = get_transient($cache_key);
        if ($cached !== false) {
            $response = new WP_REST_Response($cached, 200);
            $this->add_cache_headers($response, self::CACHE_TTL);
            return $response;
        }

        $cat_ids = TJ_Post_Mapper::get_category_ids_by_slug($slug);
        if (empty($cat_ids)) {
            $response = new WP_REST_Response([], 200);
            $this->add_cache_headers($response, self::CACHE_TTL);
            return $response;
        }

        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 5,
            'orderby' => 'date',
            'order' => 'DESC',
            'tax_query' => [
                [
                    'taxonomy' => 'category',
                    'field' => 'term_id',
                    'terms' => $cat_ids,
                    'include_children' => true,
                ],
            ],
        ]);

        $mapper = $this->mapper;
        $data = array_map(static function (\WP_Post $p) use ($mapper) {
            return $mapper->map_post_to_megamenu_item($p);
        }, $posts);
        set_transient($cache_key, $data, self::CACHE_TTL);

        $response = new WP_REST_Response($data, 200);
        $this->add_cache_headers($response, self::CACHE_TTL);
        return $response;
    }

    /**
     * GET /tj/v1/home
     */
    public function get_home(WP_REST_Request $request): WP_REST_Response {
        $per_page = 20;
        $page = 1;

        $initial_query = new WP_Query([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'orderby' => 'date',
            'order' => 'DESC',
        ]);

        $initial_posts = $initial_query->get_posts();
        $total_pages = (int) $initial_query->max_num_pages;

        $mapper = $this->mapper;
        $initial_mapped = array_map(
            static function (\WP_Post $p) use ($mapper) {
                return $mapper->map_post_to_list_item($p);
            },
            $initial_posts
        );

        $offerte_ids = TJ_Post_Mapper::get_category_ids_by_slug('offerte');
        $offerte_posts = [];
        if (!empty($offerte_ids)) {
            $offerte_posts = get_posts([
                'post_type' => 'post',
                'post_status' => 'publish',
                'posts_per_page' => 5,
                'orderby' => 'date',
                'order' => 'DESC',
                'tax_query' => [
                    [
                        'taxonomy' => 'category',
                        'field' => 'term_id',
                        'terms' => $offerte_ids,
                    ],
                ],
            ]);
        }

        $trending_posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 20,
            'orderby' => 'date',
            'order' => 'DESC',
        ]);

        $all_posts_for_views = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 100,
            'orderby' => 'date',
            'order' => 'DESC',
            'fields' => 'ids',
        ]);

        $posts_with_views = [];
        foreach ($all_posts_for_views as $post_id) {
            $views = $this->mapper->get_view_count($post_id);
            if ($views !== null) {
                $posts_with_views[$post_id] = $views;
            }
        }
        arsort($posts_with_views);
        $most_read_ids = array_slice(array_keys($posts_with_views), 0, 5);

        $most_read_posts = !empty($most_read_ids)
            ? array_values(array_filter(array_map('get_post', $most_read_ids)))
            : [];

        $week_ago = gmdate('Y-m-d\TH:i:s', strtotime('-7 days'));
        $month_ago = gmdate('Y-m-d\TH:i:s', strtotime('-30 days'));

        $week_posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 50,
            'date_query' => [['after' => $week_ago]],
            'orderby' => 'date',
            'order' => 'DESC',
        ]);

        $month_posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 50,
            'date_query' => [['after' => $month_ago]],
            'orderby' => 'date',
            'order' => 'DESC',
        ]);

        $week_with_views = [];
        foreach ($week_posts as $p) {
            $v = $this->mapper->get_view_count($p->ID);
            if ($v !== null) {
                $week_with_views[$p->ID] = $v;
            }
        }
        arsort($week_with_views);
        $week_trending_ids = array_slice(array_keys($week_with_views), 0, 5);
        $week_trending_posts = !empty($week_trending_ids)
            ? array_values(array_filter(array_map('get_post', $week_trending_ids)))
            : [];

        $month_with_views = [];
        foreach ($month_posts as $p) {
            $v = $this->mapper->get_view_count($p->ID);
            if ($v !== null) {
                $month_with_views[$p->ID] = $v;
            }
        }
        arsort($month_with_views);
        $month_trending_ids = array_slice(array_keys($month_with_views), 0, 5);
        $month_trending_posts = !empty($month_trending_ids)
            ? array_values(array_filter(array_map('get_post', $month_trending_ids)))
            : [];

        $data = [
            'initial' => [
                'posts' => $initial_mapped,
                'totalPages' => $total_pages,
                'pagesConsumed' => 1,
            ],
            'offerte' => array_map(
                static function (\WP_Post $p) use ($mapper) {
                    return $mapper->map_post_to_list_item($p);
                },
                $offerte_posts
            ),
            'trending' => array_map(
                static function (\WP_Post $p) use ($mapper) {
                    return $mapper->map_post_to_list_item($p);
                },
                $trending_posts
            ),
            'mostRead' => array_map(
                static function (\WP_Post $p) use ($mapper) {
                    return $mapper->map_post_to_list_item($p);
                },
                $most_read_posts
            ),
            'weekTrending' => array_map(
                static function (\WP_Post $p) use ($mapper) {
                    return $mapper->map_post_to_list_item($p);
                },
                $week_trending_posts
            ),
            'monthTrending' => array_map(
                static function (\WP_Post $p) use ($mapper) {
                    return $mapper->map_post_to_list_item($p);
                },
                $month_trending_posts
            ),
        ];

        $response = new WP_REST_Response($data, 200);
        $this->add_cache_headers($response, 60);
        return $response;
    }

    /**
     * GET /tj/v1/views/:postId
     */
    public function get_views(WP_REST_Request $request): WP_REST_Response {
        $post_id = absint($request->get_param('post_id'));
        $views = $this->mapper->get_view_count($post_id);
        $response = new WP_REST_Response(['views' => $views ?? 0], 200);
        $this->add_cache_headers($response, 30);
        return $response;
    }

    private function add_cache_headers(WP_REST_Response $response, int $max_age = 60): void {
        $response->header('Cache-Control', sprintf('public, max-age=%d', $max_age));
    }
    /**
     * POST /tj/v1/views/:postId
     */
    public function increment_views(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $post_id = absint($request->get_param('post_id'));
        if ($post_id <= 0) {
            return new WP_Error('invalid_post_id', 'post_id non valido', ['status' => 400]);
        }

        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('not_found', 'Post non trovato', ['status' => 404]);
        }

        $ok = $this->mapper->increment_view_count($post_id);
        if (!$ok) {
            return new WP_Error('increment_failed', 'Incremento visualizzazioni non riuscito', ['status' => 500]);
        }

        $views = $this->mapper->get_view_count($post_id) ?? 0;
        $response = new WP_REST_Response([
            'ok' => true,
            'postId' => $post_id,
            'views' => $views,
        ], 200);
        $response->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        return $response;
    }
}
