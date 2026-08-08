<?php
/**
 * Plugin Name: TechJournal API
 * Description: REST API tj/v1 per il frontend TechJournal e webhook autopost social alla pubblicazione.
 * Version: 1.1.0
 * Author: TechJournal
 * Requires at least: 6.0
 * Requires PHP: 8.0
 *
 * @package TechJournal_API
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

define('TJ_API_PLUGIN_VERSION', '1.1.0');
define('TJ_API_PLUGIN_DIR', plugin_dir_path(__FILE__));

require_once TJ_API_PLUGIN_DIR . 'includes/class-tj-post-mapper.php';
require_once TJ_API_PLUGIN_DIR . 'includes/class-tj-rest-controller.php';
require_once TJ_API_PLUGIN_DIR . 'includes/class-tj-social-webhook.php';

/**
 * Bootstrap REST tj/v1 + webhook social.
 */
function tj_api_bootstrap(): void {
    $controller = new TJ_REST_Controller();
    add_action('rest_api_init', [$controller, 'register_routes']);

    $webhook = new TJ_Social_Webhook();
    $webhook->register();
}

add_action('plugins_loaded', 'tj_api_bootstrap');
