/**
 * Image Optimization Helper
 * Automatically applies Cloudinary transformations for optimal performance
 */

(function(global) {
    'use strict';

    /**
     * Image type definitions with optimal widths
     */
    var IMAGE_TYPES = {
        HERO: { width: 1600, quality: 'auto:good' },
        PORTFOLIO_CARD: { width: 800, quality: 'auto:good' },
        GALLERY: { width: 1200, quality: 'auto:good' },
        THUMBNAIL: { width: 400, quality: 'auto:good' },
        WORKER: { width: 300, quality: 'auto:good' },
        LOGO: { width: 200, quality: 'auto:best' },
        BLOG: { width: 800, quality: 'auto:good' }
    };

    /**
     * Check if URL is a Cloudinary URL
     */
    function isCloudinaryUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return url.indexOf('cloudinary.com') > -1 || url.indexOf('res.cloudinary.com') > -1;
    }

    /**
     * Apply Cloudinary transformations to URL
     * @param {string} url - Original image URL
     * @param {string} type - Image type from IMAGE_TYPES
     * @param {object} options - Additional options (width, height, quality, format)
     * @returns {string} Optimized URL
     */
    function optimizeImageUrl(url, type, options) {
        if (!url) return url;
        
        // Only optimize Cloudinary URLs
        if (!isCloudinaryUrl(url)) {
            return url;
        }

        var config = IMAGE_TYPES[type] || IMAGE_TYPES.THUMBNAIL;
        var width = options && options.width ? options.width : config.width;
        var height = options && options.height ? options.height : null;
        var quality = options && options.quality ? options.quality : config.quality;
        var format = options && options.format ? options.format : 'auto';
        var crop = options && options.crop ? options.crop : 'limit';

        // Build transformation string
        var transformations = [];
        
        // Format optimization
        transformations.push('f_' + format);
        
        // Quality optimization
        transformations.push('q_' + quality);
        
        // Width limit
        transformations.push('c_' + crop);
        transformations.push('w_' + width);
        
        // Height if specified
        if (height) {
            transformations.push('h_' + height);
        }

        var transformString = transformations.join(',');

        // Insert transformations into Cloudinary URL
        // Cloudinary URL format: https://res.cloudinary.com/cloud/image/upload/v1234567890/folder/image.jpg
        // Transformations go after /upload/ and before /v
        var uploadIndex = url.indexOf('/upload/');
        if (uploadIndex > -1) {
            var beforeTransform = url.substring(0, uploadIndex + 8); // includes /upload/
            var afterTransform = url.substring(uploadIndex + 8);
            
            // Check if there's already a version number (v1234567890)
            var versionMatch = afterTransform.match(/^v\d+/);
            if (versionMatch) {
                return beforeTransform + transformString + '/' + afterTransform;
            } else {
                return beforeTransform + transformString + '/' + afterTransform;
            }
        }

        return url;
    }

    /**
     * Generate srcset for responsive images
     * @param {string} url - Original image URL
     * @param {string} type - Image type
     * @param {array} widths - Array of widths for srcset
     * @returns {string} srcset attribute value
     */
    function generateSrcset(url, type, widths) {
        if (!url) return '';
        
        widths = widths || [400, 800, 1200, 1600];
        
        return widths.map(function(width) {
            var optimizedUrl = optimizeImageUrl(url, type, { width: width });
            return optimizedUrl + ' ' + width + 'w';
        }).join(', ');
    }

    /**
     * Generate sizes attribute for responsive images
     * @param {string} type - Image type
     * @returns {string} sizes attribute value
     */
    function generateSizes(type) {
        var sizesMap = {
            HERO: '100vw',
            PORTFOLIO_CARD: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
            GALLERY: '(max-width: 768px) 100vw, 80vw',
            THUMBNAIL: '(max-width: 768px) 50vw, 25vw',
            WORKER: '36px',
            LOGO: '48px',
            BLOG: '(max-width: 768px) 100vw, 80vw'
        };
        return sizesMap[type] || '100vw';
    }

    /**
     * Get recommended dimensions for image type
     * @param {string} type - Image type
     * @returns {object} {width, height} or {width}
     */
    function getDimensions(type) {
        var config = IMAGE_TYPES[type] || IMAGE_TYPES.THUMBNAIL;
        return { width: config.width };
    }

    // Export to global scope
    global.ImageOptimizer = {
        optimizeImageUrl: optimizeImageUrl,
        generateSrcset: generateSrcset,
        generateSizes: generateSizes,
        getDimensions: getDimensions,
        IMAGE_TYPES: IMAGE_TYPES,
        isCloudinaryUrl: isCloudinaryUrl
    };

})(typeof window !== 'undefined' ? window : global);
