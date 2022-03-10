<?php
/**
 * Plugin Name:       Expiration Date
 * Description:       Set and display an expiration date with an optional custom message if supported by the post type. For example, &quot;Apply by {date}&quot; or &quot;Promotion ends on {date}&quot;. Once meta is set, that post will only display until the expiration date.
 * Requires at least: 5.8
 * Requires PHP:      7.0
 * Version:           0.1.0
 * Author:            Candace Johnson
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       expiration-date
 *
 * @package           cjd-blocks
 */

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function cjd_blocks_expiration_date_block_init() {

	// automatically load dependencies and version
    $asset_file = include( plugin_dir_path( __FILE__ ) . 'build/index.asset.php');

    wp_register_script(
        'cjd-blocks-expiration-date',
        plugins_url( 'build/index.js', __FILE__ ),
        $asset_file['dependencies'],
        $asset_file['version']
    );

	register_block_type(
		plugin_dir_path( __FILE__ ) . 'build/',
		array(
			'api_version' => 2,
			'attributes' => array(
				'textAlign' => array(
					'type' => 'string',
					'default' => 'left'
				),
				'format' => array(
					'type' => 'string'
				),
				'label' => array(
					'type' => 'string'
				),
				'displayInline' => array(
					'type' => 'boolean',
					'default' => true
				),
				'expiredLabel' => array(
                	'type' => 'string'
                ),
			),
			'editor_script' => 'cjd-blocks-expiration-date',
			'render_callback' => 'render_cjd_blocks_expiration_date'
		)
	);

}
add_action( 'init', 'cjd_blocks_expiration_date_block_init' );

function render_cjd_blocks_expiration_date( $block_attributes, $content, $block ) {

	if ( ! isset( $block->context['postId'] ) ) {
    	return '';
    }
    $post_ID = $block->context['postId'];

	$expirationDate = get_post_meta( $post_ID, 'cjd_expiration_date', true );
	if ( ! $expirationDate ) {
		return '';
	}

	$format = empty( $block_attributes['format'] ) ? get_option( 'date_format' ) : $block_attributes['format'];
	$formattedExpirationDate = date_i18n( $format, strtotime($expirationDate) );

	$containerTag = $block_attributes['displayInline'] ? 'p' : 'div';
	$tag = $block_attributes['displayInline'] ? 'span' : 'p';

	$label = empty( $block_attributes['label'] ) ? '' :
		sprintf(
			'<%1$s class="expiration-date-label">%2$s</%1$s> ',
			$tag,
			$block_attributes['label']
		);

	$align_class_name = empty( $block_attributes['textAlign'] ) ? '' : "has-text-align-{$block_attributes['textAlign']}";

	$currentDateTime = current_datetime();
	$post_date = get_post_datetime(); // Gets the post date to compare
	$isExpired = $currentDateTime > new DateTimeImmutable( $expirationDate );

	$wrapperClasses = sprintf(
		'%1$s%2$s%3$s',
		$align_class_name,
		$isExpired ? ' ' : '',
		$isExpired ? 'expiration-date-label expiration-date-expired-label' : ''
	);

	$wrapper_attributes = get_block_wrapper_attributes( array( 'class' => $wrapperClasses ) );

	if ( $isExpired ) {
		$expiredLabel = empty( $block_attributes['expiredLabel'] ) ? '' : __( $block_attributes['expiredLabel'] );

		return sprintf(
			'<p %1$s>%2$s</p>',
			$wrapper_attributes,
			$expiredLabel
		);
	}

	$expirationDateElement =
		sprintf(
        	'<%1$s class="expiration-date"><time datetime="%2$s">%3$s</time></%1$s>',
        	$tag,
        	esc_attr( date_i18n( 'c', strtotime($expirationDate) ) ),
        	$formattedExpirationDate
        );

	return sprintf(
    	'<%1$s %2$s>%3$s%4$s</%1$s>',
    	$containerTag,
    	$wrapper_attributes,
    	$label,
		$expirationDateElement
    );
}
