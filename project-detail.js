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

    function buildGalleryGrid(imgs, indexOffset) {
        var h = '<div class="project-gallery-grid">';
        imgs.forEach(function (src, i) {
            if (!src) return;
            var idx = indexOffset + i;
            h += '<button type="button" class="gallery-thumb" data-gallery-index="' + idx + '" aria-label="View image ' + (i + 1) + '">';
            h += '<img src="' + escAttrUrl(src) + '" alt="" loading="lazy">';
            h += '<span class="gallery-thumb-zoom" aria-hidden="true"><i class="fas fa-expand"></i></span>';
            h += '</button>';
        });
        h += '</div>';
        return h;
    }

    function buildTabbedGallery(asDesignedImages, asBuiltImages) {
        var defaultTab = asDesignedImages.length ? 'designed' : 'built';
        var designedActive = defaultTab === 'designed';
        var builtActive = defaultTab === 'built';

        var h = '<section class="project-detail-section project-gallery-section">';
        h += '<h2>Project Gallery</h2>';
        h += '<div class="project-gallery-tabs" role="tablist" aria-label="Gallery categories">';
        h += '<button type="button" class="project-gallery-tab' + (designedActive ? ' is-active' : '') + '" role="tab" data-gallery-tab="designed" aria-selected="' + designedActive + '">As Designed';
        if (asDesignedImages.length) h += ' <span class="project-gallery-tab-count">' + asDesignedImages.length + '</span>';
        h += '</button>';
        h += '<button type="button" class="project-gallery-tab' + (builtActive ? ' is-active' : '') + '" role="tab" data-gallery-tab="built" aria-selected="' + builtActive + '">As Built';
        if (asBuiltImages.length) h += ' <span class="project-gallery-tab-count">' + asBuiltImages.length + '</span>';
        h += '</button>';
        h += '</div>';
        h += '<p class="project-gallery-hint"><i class="fas fa-search-plus"></i> Tap any image to enlarge</p>';
        h += '<div class="project-gallery-panels">';

        h += '<div class="project-gallery-panel' + (designedActive ? ' is-active' : '') + '" data-gallery-panel="designed" role="tabpanel"' + (designedActive ? '' : ' hidden') + '>';
        if (asDesignedImages.length) {
            h += buildGalleryGrid(asDesignedImages, 0);
        } else {
            h += '<p class="project-gallery-empty">No as designed images for this project yet.</p>';
        }
        h += '</div>';

        h += '<div class="project-gallery-panel' + (builtActive ? ' is-active' : '') + '" data-gallery-panel="built" role="tabpanel"' + (builtActive ? '' : ' hidden') + '>';
        if (asBuiltImages.length) {
            h += buildGalleryGrid(asBuiltImages, 0);
        } else {
            h += '<p class="project-gallery-empty">No as built images for this project yet.</p>';
        }
        h += '</div>';

        h += '</div></section>';
        return h;
    }

    var galleryByCategory = { designed: [], built: [] };
    var activeGalleryTab = 'designed';

    function setActiveGalleryTab(tab) {
        if (!root) return;
        activeGalleryTab = tab;
        galleryImages = tab === 'built'
            ? (galleryByCategory.built || []).slice()
            : (galleryByCategory.designed || []).slice();

        root.querySelectorAll('.project-gallery-tab').forEach(function (btn) {
            var isActive = btn.getAttribute('data-gallery-tab') === tab;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        root.querySelectorAll('.project-gallery-panel').forEach(function (panel) {
            var isActive = panel.getAttribute('data-gallery-panel') === tab;
            panel.classList.toggle('is-active', isActive);
            if (isActive) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
        });
    }

    function bindGalleryTabs() {
        if (!root) return;
        root.querySelectorAll('.project-gallery-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tab = btn.getAttribute('data-gallery-tab');
                if (tab) setActiveGalleryTab(tab);
            });
        });
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
                if (!thumb.closest('.project-gallery-panel.is-active')) return;
                e.preventDefault();
                var activePanel = root.querySelector('.project-gallery-panel.is-active');
                var thumbs = activePanel ? activePanel.querySelectorAll('.gallery-thumb') : [];
                var idx = Array.prototype.indexOf.call(thumbs, thumb);
                if (idx >= 0) openLightbox(idx);
                return;
            }
            var heroEl = e.target.closest('.project-hero-img');
            if (heroEl && galleryImages.length) {
                var heroSrc = heroEl.getAttribute('src');
                var idx = galleryImages.indexOf(heroSrc);
                openLightbox(idx >= 0 ? idx : 0);
                return;
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
            galleryByCategory = { designed: [], built: [] };
            var asDesignedImages = [];
            var asBuiltImages = [];
            if (p.asDesignedImages && Array.isArray(p.asDesignedImages) && p.asDesignedImages.length) {
                asDesignedImages = p.asDesignedImages.filter(Boolean);
            } else if (p.projectImages && Array.isArray(p.projectImages) && p.projectImages.length) {
                asDesignedImages = p.projectImages.filter(Boolean);
            }
            if (p.asBuiltImages && Array.isArray(p.asBuiltImages) && p.asBuiltImages.length) {
                asBuiltImages = p.asBuiltImages.filter(Boolean);
            }

            galleryByCategory.designed = asDesignedImages;
            galleryByCategory.built = asBuiltImages;
            activeGalleryTab = asDesignedImages.length ? 'designed' : 'built';
            galleryImages = activeGalleryTab === 'built' ? asBuiltImages.slice() : asDesignedImages.slice();

            var hero = '';
            if (asDesignedImages.length > 0) hero = asDesignedImages[0];
            else if (asBuiltImages.length > 0) hero = asBuiltImages[0];
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

            var tabbedGallery = buildTabbedGallery(asDesignedImages, asBuiltImages);

            root.innerHTML =
                '<h1 class="section-title project-detail-title">' + escHtml(p.title || '') + '</h1>' +
                '<p class="section-subtitle project-detail-category">' + escHtml(cat) + '</p>' +
                (hero ? '<img class="project-hero-img" src="' + escAttrUrl(hero) + '" alt="' + escHtml(p.title || 'Project') + '">' : '') +
                '<div class="project-detail-description-wrap">' +
                '<h2 class="project-detail-about-heading">About this project</h2>' +
                '<div class="project-detail-description">' + escHtml(p.description || '') + '</div>' +
                '</div>' +
                metricsSection +
                tabbedGallery +
                '<p class="project-detail-back"><a href="projects/" class="btn-primary">Back to portfolio</a></p>';

            bindGalleryTabs();
            bindGallery();
        })
        .catch(function () {
            if (loading) loading.style.display = 'none';
            if (err) err.style.display = 'block';
        });
})();
