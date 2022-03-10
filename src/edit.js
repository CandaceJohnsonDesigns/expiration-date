/**
 * External dependencies
 */
 import { get, includes, invoke, isUndefined, pickBy } from 'lodash';
 import classnames from 'classnames';

/**
 * WordPress dependencies
 */
 import { __, sprintf } from '@wordpress/i18n';
 import { useSelect } from '@wordpress/data';
 import {
	 AlignmentControl,
	 InspectorControls,
	 BlockControls,
	 useBlockProps,
	 Warning,
	 RichText
 } from '@wordpress/block-editor';
 import {
	Dropdown,
	ToolbarGroup,
	ToolbarButton,
	ToggleControl,
	DateTimePicker,
	PanelBody,
	PanelRow,
	CustomSelectControl,
	Flex,
	FlexItem
 } from '@wordpress/components';
 import {
 	Platform,
 	useState,
 	useEffect,
 	useRef
 } from '@wordpress/element';
 import { store as coreStore, useEntityProp } from '@wordpress/core-data';
 import { __experimentalGetSettings, dateI18n } from '@wordpress/date';
 import { edit } from '@wordpress/icons';
 import { DOWN } from '@wordpress/keycodes';

 const isWebPlatform = Platform.OS === 'web';

/**
 * Internal dependencies
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/developers/block-api/block-edit-save/#edit
 *
 * @return {WPElement} Element to render.
 */
 export default function Edit( {
	attributes: { textAlign, format, label, expiredLabel, displayInline },
	setAttributes,
	isSelected,
	context: { postType, postId, queryId }
} ) {

    const isDescendentOfQueryLoop = Number.isFinite( queryId );

	const [ siteFormat ] = useEntityProp( 'root', 'site', 'date_format' );
    const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta', postId );

	const date = meta ? meta[ 'cjd_expiration_date' ] : new Date();
    const updateDate = ( newValue ) => {
        setMeta( { ...meta, cjd_expiration_date: newValue } );
    };

    const settings = __experimentalGetSettings();
    // To know if the current time format is a 12 hour time, look for "a".
	// Also make sure this "a" is not escaped by a "/".
	const is12Hour = /a(?!\\)/i.test(
    	settings.formats.time
    	.toLowerCase() // Test only for the lower case "a".
    	.replace( /\\\\/g, '' ) // Replace "//" with empty strings.
    	.split( '' )
    	.reverse()
    	.join( '' ) // Reverse the string and test for "a" not followed by a slash.
    );
	const formatOptions = Object.values( settings.formats ).map(
    	( formatOption ) => ( {
    		key: formatOption,
    		name: dateI18n( formatOption, date ),
    	} )
	);
	const resolvedFormat = format || siteFormat || settings.formats.date;

	const supportsExpirationDate =
		date !== undefined
		? true : false;

	const className =
		classnames(
			{
				[ `has-text-align-${ textAlign }` ]: textAlign,
				[ `has-warning` ]: !supportsExpirationDate
			}
		);

	const blockProps = useBlockProps( {
		className: className,
	} );

	const timeRef = useRef();

	let expirationDate = date ? (
    	<time dateTime={ dateI18n( 'c', date ) } ref={ timeRef }>
        	{ dateI18n( resolvedFormat, date ) }
        </time>
    ) : (
    	__( 'No Expiration Date' )
    );

    function NoSupportError() {
    	const blockProps = useBlockProps();
    	return (
    		<div { ...blockProps }>
    			<Warning>
    				{ __( 'Post type does not support expiration dates.' ) }
    			</Warning>
    		</div>
    	);
    }

	const [ viewAsExpired, setViewAsExpired ] = useState( false );

	const controls = (
		<>
			<BlockControls group="block">
				<AlignmentControl
					value={ textAlign }
					onChange={ ( nextAlign ) => {
						setAttributes( { textAlign: nextAlign } );
					} }
				/>
				{ isSelected && ! isDescendentOfQueryLoop && (
					<ToolbarGroup>
						<Dropdown
							popoverProps={ { anchorRef: timeRef.current } }
							renderContent={ () => (
								<DateTimePicker
									currentDate={ date }
									onChange={ updateDate }
									is12Hour={ is12Hour }
								/>
							) }
							renderToggle={ ( { isOpen, onToggle } ) => {
								const openOnArrowDown = ( event ) => {
									if ( ! isOpen && event.keyCode === DOWN ) {
										event.preventDefault();
										onToggle();
									}
								};
								return (
									<ToolbarButton
										aria-expanded={ isOpen }
										icon={ edit }
										title={ __( 'Change Expiration Date' ) }
										onClick={ onToggle }
										onKeyDown={ openOnArrowDown }
									/>
								);
							} }
						/>
					</ToolbarGroup>
				) }
			</BlockControls>

			{ date && (
			<InspectorControls>
				<PanelBody title={ __( 'Format settings' ) }>
					<CustomSelectControl
						hideLabelFromVision
						label={ __( 'Date Format' ) }
						options={ formatOptions }
						onChange={ ( { selectedItem } ) =>
							setAttributes( {
								format: selectedItem.key,
							} )
						}
						value={ formatOptions.find(
							( option ) => option.key === resolvedFormat
						) }
					/>
					<PanelRow>
						<ToggleControl
							label={ __( "Display label inline?" ) }
							help={ displayInline ? __( "Is displayed inline" ) : __( "Is stacked" ) }
							checked={ displayInline }
							onChange={ () => setAttributes( { displayInline: ! displayInline } ) }
						/>
					</PanelRow>
					<PanelRow>
						<ToggleControl
							label={ __( "View as expired?" ) }
							help={ viewAsExpired ? __( "Viewing as if expired" ) : __( "Viewing as if unexpired" ) }
							checked={ viewAsExpired }
							onChange={ () => {
                            	setViewAsExpired( ( state ) => ! state );
                            } }
						/>
                    </PanelRow>
				</PanelBody>
			</InspectorControls>
			) }
		</>
	);

	if ( !supportsExpirationDate ) {
		return <NoSupportError />
	}

	const labelControl = (
		<>
			<RichText
				className="expiration-date-label"
				tagName="p" // The tag here is the element output and editable in the admin
				value={ label } // Any existing content, either from the database or an attribute default
				allowedFormats={ [ 'core/bold', 'core/italic', 'core/underline', 'core/text-color', 'core/subscript', 'core/superscript' ] } // Allow the content to be made bold or italic, but do not allow other formatting options
				onChange={ ( newLabel ) => setAttributes( { label: newLabel } ) } // Store updated content as a block attribute
				placeholder={ __( 'Add Label: ' ) } // Display this text before any content has been added by the user
			/>
		</>
	);

	const expiredLabelControl = (
		<>
			<RichText
				className="expiration-date-label expiration-date-expired-label"
				tagName="p" // The tag here is the element output and editable in the admin
				value={ expiredLabel } // Any existing content, either from the database or an attribute default
				allowedFormats={ [ 'core/bold', 'core/italic', 'core/underline', 'core/text-color', 'core/subscript', 'core/superscript' ] } // Allow the content to be made bold or italic, but do not allow other formatting options
				onChange={ ( newExpiredLabel ) => setAttributes( { expiredLabel: newExpiredLabel } ) } // Store updated content as a block attribute
				placeholder={ __( 'Add expired label...' ) } // Display this text before any content has been added by the user
			/>
		</>
	);

	const view = viewAsExpired ? (
    		<>
				{ expiredLabelControl }
    		</>
    ) : (
    	<>
			{ displayInline ? (
				<>
					<Flex expanded={ false } justify="flex-start" >
						<FlexItem>{ labelControl }</FlexItem>
						<FlexItem>{ expirationDate }</FlexItem>
					</Flex>
				</>
			) : (
				<>
					{ labelControl }
					<p className="expiration-date">{ expirationDate }</p>
            	</>
			) }
		</>
    );

	return (
		<>
			{ controls }
			<div { ...blockProps }>
				{ view }
			</div>
		</>
	);
}
