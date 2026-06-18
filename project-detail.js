(function () {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');
    var root = document.getElementById('projectDetailContent');
    var loading = document.getElementById('projectDetailLoading');
    var err = document.getElementById('projectDetailError');
    var galleryImages = [];
    var lightboxIndex = 0;

    var lightbox = document.getElementById('projectLightbox');
    var lightboxImg = document.getElementById('projectLightboxImg');
    var lightboxCounter = document.getElementById('projectLightboxCounter');
    var lightboxPrev = lightbox ? lightbox.querySelector('.project-lightbox-prev') : null;
    var lightboxNext = lightbox ? lightbox.querySelector('.project-lightbox-next') : null;
    var lightboxClose = lightbox ? lightbox.querySelector('.project-lightbox-close') : null;

    function escHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escAttrUrl(s) {
        return String(s || '').replace(/"/g, '&quot;');
    }

    function section(title, imgs) {
        if (!imgs || !imgs.length) return '';
        var h = '<section class="project-detail-section"><h2>' + escHtml(title) + '</h2>';
        h += '<p class="project-gallery-hint"><i class="fas fa-search-plus"></i> Tap any image to enlarge</p>';
        h += '<div class="project-gallery-grid">';
        imgs.forEach(function (src) {
            if (!src) return;
            var idx = galleryImages.length;
            galleryImages.push(src);
            h += '<button type="button" class="gallery-thumb" data-gallery-index="' + idx + '" aria-label="View image ' + (idx + 1) + '">';
            h += '<img src="' + escAttrUrl(src) + '" alt="" loading="lazy">';
            h += '<span class="gallery-thumb-zoom" aria-hidden="true"><i class="fas fa-expand"></i></span>';
            h += '</button>';
        });
        h += '</div></section>';
        return h;
    }

    function updateLightbox() {
        if (!lightbox || !lightboxImg || !galleryImages.length) return;
        lightboxImg.src = galleryImages[lightboxIndex];
        if (lightboxCounter) {
            lightboxCounter.textContent = (lightboxIndex + 1) + ' / ' + galleryImages.length;
        }
        var showNav = galleryImages.length > 1;
        if (lightboxPrev) lightboxPrev.style.display = showNav ? 'flex' : 'none';
        if (lightboxNext) lightboxNext.style.display = showNav ? 'flex' : 'none';
    }

    function openLightbox(index) {
        if (!lightbox || !galleryImages.length) return;
        lightboxIndex = Math.max(0, Math.min(index, galleryImages.length - 1));
        updateLightbox();
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('lightbox-open');
        if (lightboxImg) lightboxImg.removeAttribute('src');
    }

    function showPrev() {
        if (!galleryImages.length) return;
        lightboxIndex = (lightboxIndex - 1 + galleryImages.length) % galleryImages.length;
        updateLightbox();
    }

    function showNext() {
        if (!galleryImages.length) return;
        lightboxIndex = (lightboxIndex + 1) % galleryImages.length;
        updateLightbox();
    }

    function bindGallery() {
        if (!root) return;

        root.addEventListener('click', function (e) {
            var thumb = e.target.closest('.gallery-thumb');
            if (thumb) {
                e.preventDefault();
                var idx = parseInt(thumb.getAttribute('data-gallery-index'), 10);
                if (!isNaN(idx)) openLightbox(idx);
                return;
            }
            var heroEl = e.target.closest('.project-hero-img');
            if (heroEl && galleryImages.length) {
                var heroSrc = heroEl.getAttribute('src');
                var idx = galleryImages.indexOf(heroSrc);
                openLightbox(idx >= 0 ? idx : 0);
            }
        });

        root.querySelectorAll('.project-hero-img').forEach(function (heroEl) {
            heroEl.setAttribute('title', 'Click to enlarge');
        });
    }

    if (lightboxClose) lightboxClose.addEventListener('click', function (e) { e.stopPropagation(); closeLightbox(); });
    if (lightboxPrev) lightboxPrev.addEventListener('click', function (e) { e.stopPropagation(); showPrev(); });
    if (lightboxNext) lightboxNext.addEventListener('click', function (e) { e.stopPropagation(); showNext(); });
    if (lightbox) {
        lightbox.querySelectorAll('[data-lightbox-close]').forEach(function (el) {
            el.addEventListener('click', closeLightbox);
        });
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox || e.target.classList.contains('project-lightbox-backdrop')) {
                closeLightbox();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (!lightbox || !lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'ArrowRight') showNext();
    });

    var touchStartX = 0;
    if (lightbox) {
        lightbox.addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        lightbox.addEventListener('touchend', function (e) {
            var diff = e.changedTouches[0].screenX - touchStartX;
            if (Math.abs(diff) < 50) return;
            if (diff > 0) showPrev();
            else showNext();
        }, { passive: true });
    }

    if (!slug) {
        if (loading) loading.style.display = 'none';
        if (err) err.style.display = 'block';
        return;
    }

    fetch((window.API_BASE || '') + '/api/projects/detail/' + encodeURIComponent(slug))
        .then(function (r) {
            if (!r.ok) throw new Error('not found');
            return r.json();
        })
        .then(function (p) {
            if (loading) loading.style.display = 'none';
            root.style.display = 'block';
            document.title = (p.title || 'Project') + ' | AIS Concepts';

            galleryImages = [];
            var mainGalleryImages = [];
            if (p.projectImages && Array.isArray(p.projectImages) && p.projectImages.length > 0) {
                mainGalleryImages = p.projectImages.filter(Boolean);
            }

            var hero = '';
            if (mainGalleryImages.length > 0) hero = mainGalleryImages[0];
            else if (p.heroImage) hero = p.heroImage;
            else if (p.image) hero = p.image;

            var m = p.metrics || {};
            var hasMetrics = p.hasMetrics || Object.keys(m).length > 0;

            var metricsHtml = '';
            if (hasMetrics) {
                metricsHtml = '<div class="project-metrics">' +
                    (m.costEfficiency != null ? '<div class="metric-card"><span>' + m.costEfficiency + '%</span><label>Cost efficiency</label></div>' : '') +
                    (m.sustainability != null ? '<div class="metric-card"><span>' + m.sustainability + '%</span><label>Sustainability</label></div>' : '') +
                    (m.innovation != null ? '<div class="metric-card"><span>' + m.innovation + '%</span><label>Innovation</label></div>' : '') +
                    '</div>';
            }

            var metricsSection = hasMetrics ? '<div class="project-detail-section"><h2>Key metrics</h2>' + metricsHtml + '</div>' : '';
            var cat = p.categorySecondary ? p.category + ' · ' + p.categorySecondary : p.category;

            var projectGallery = mainGalleryImages.length > 0 ? section('Project Gallery', mainGalleryImages) : '';
            var additionalSections = '';
            additionalSections += section('Concept sketches', p.conceptSketches);
            additionalSections += section('Site analysis', p.siteAnalysis);
            additionalSections += section('Floor plans & sections', p.floorPlans);
            additionalSections += section('Renderings', p.renderings);
            additionalSections += section('Construction photos', p.constructionPhotos);
            additionalSections += section('Completed photos', p.completedPhotos);

            root.innerHTML =
                '<h1 class="section-title project-detail-title">' + escHtml(p.title || '') + '</h1>' +
                '<p class="section-subtitle project-detail-category">' + escHtml(cat) + '</p>' +
                (hero ? '<img class="project-hero-img" src="' + escAttrUrl(hero) + '" alt="' + escHtml(p.title || 'Project') + '">' : '') +
                '<div class="project-detail-description-wrap">' +
                '<h2 class="project-detail-about-heading">About this project</h2>' +
                '<div class="project-detail-description">' + escHtml(p.description || '') + '</div>' +
                '</div>' +
                metricsSection +
                projectGallery +
                additionalSections +
                '<p class="project-detail-back"><a href="projects/" class="btn-primary">Back to portfolio</a></p>';

            bindGallery();
        })
        .catch(function () {
            if (loading) loading.style.display = 'none';
            if (err) err.style.display = 'block';
        });
})();
