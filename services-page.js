(function () {
    var details = typeof getAllServiceDetails === 'function' ? getAllServiceDetails() : {};
    var groups = [
        {
            title: 'Architecture & Planning',
            services: [
                ['architectural design', 'Architectural Design'],
                ['master planning', 'Master Planning'],
                ['feasibility study', 'Feasibility Study']
            ]
        },
        {
            title: 'Interior & Visual Design',
            services: [
                ['interior design', 'Interior Design'],
                ['3d visualization', '3D Visualization']
            ]
        },
        {
            title: 'Technical Documentation',
            services: [
                ['tender documentation', 'Tender Documentation'],
                ['authority approvals', 'Authority Approvals']
            ]
        },
        {
            title: 'Project Delivery',
            services: [
                ['project management', 'Project Management'],
                ['construction supervision', 'Construction Supervision']
            ]
        },
        {
            title: 'Renovation & Transformation',
            services: [
                ['renovation & extension', 'Renovation & Extension']
            ]
        }
    ];

    var icons = {
        building: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 34V12l13-7 13 7v22M4 34h32M12 16h4m8 0h4M12 22h4m8 0h4M17 34V26h6v8"/></svg>',
        site: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 9h30v24H5zM5 17h30M14 9v8m12-8v8M10 22h6v6h-6zm14 0h6v6h-6zM7 6v3m26-3v3"/></svg>',
        plan: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 6h28v28H6zM6 18h13v16m0-16h15M19 24h8v10M12 12h3m10 0h3m-16 12h3"/></svg>',
        concept: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="14"/><circle cx="20" cy="20" r="7"/><path d="M20 3v8m0 18v8M3 20h8m18 0h8M8 8l6 6m12 12 6 6m0-24-6 6m-12 12-6 6"/></svg>',
        document: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 5h14l7 7v23H10zM24 5v8h7M15 19h11m-11 5h11m-11 5h7"/><path d="M7 10v25h18"/></svg>',
        cube: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 5 14 8v15l-14 8-14-8V13zM6 13l14 8 14-8M20 21v15M13 9l14 8v8l-7 4-7-4z"/></svg>',
        approval: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 5h14l7 7v12M24 5v8h7M15 19h10m-10 5h6"/><circle cx="26" cy="29" r="8"/><path d="m22 29 3 3 6-7"/></svg>',
        delivery: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34h28M9 34V15h22v19M6 15l14-9 14 9M14 21h5v5h-5zm9 0h5v5h-5zM18 34v-6h5v6"/></svg>',
        renovation: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 19 20 7l15 12M9 17v17h22V17M16 34V23h8v11"/><path d="m27 8 5-4m-4 10 6-2M7 10l-3-3"/></svg>'
    };

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function iconFor(key) {
        if (key === 'architectural design' || key === 'construction supervision') return icons.building;
        if (key === 'master planning') return icons.site;
        if (key === 'interior design') return icons.plan;
        if (key === 'feasibility study') return icons.concept;
        if (key === '3d visualization') return icons.cube;
        if (key === 'authority approvals') return icons.approval;
        if (key === 'tender documentation') return icons.document;
        if (key === 'project management') return icons.delivery;
        return icons.renovation;
    }

    function renderHeroDrawing() {
        return '<svg class="services-hero-art" viewBox="0 0 560 420" role="img" aria-labelledby="servicesDrawingTitle">' +
            '<title id="servicesDrawingTitle">Abstract architectural elevation and floor plan drawing</title>' +
            '<g class="drawing-muted"><path d="M22 40h516M22 368h516M72 20v380M488 20v380"/><path d="M42 352h454M91 70h377M118 50v285M444 50v285"/><circle cx="280" cy="203" r="154" stroke-dasharray="2 7"/></g>' +
            '<g class="drawing-fill"><path d="M179 317V170l101-72 101 72v147z"/><path d="M179 170h202M207 317V190h57v127m32 0V190h57v127"/><path d="M227 145h106v-33H227z"/><path d="m227 112 53-38 53 38"/></g>' +
            '<g class="drawing-line"><path d="M152 334h255M162 327V156l118-82 118 82v171M191 174h178M200 181v146m160-146v146M236 202h35v48h-35zm53 0h35v48h-35z"/><path d="M140 350h280M280 58v276M134 156h28m236 0h28M152 334l-7 7m262-7 7 7"/><path d="M115 103h52m226 0h52M115 103v21m330-21v21"/></g>' +
            '<g class="drawing-muted"><path d="M76 317h49m310 0h49M92 300v34m376-34v34M280 37v20m-8-10h16"/></g>' +
            '<circle class="gold-mark" cx="280" cy="74" r="3"/><text x="32" y="29">AIS / SPATIAL STUDY 01</text><text x="394" y="390">SECTION — A / 01</text><text x="34" y="390">DESIGN INTENT / 01</text>' +
            '</svg><div class="services-art-caption"><span>Spatial study / 01</span><span>Concept to detail</span></div>';
    }

    function renderHero() {
        var art = document.getElementById('servicesHeroDrawing');
        if (art) art.innerHTML = renderHeroDrawing();
    }

    function renderCatalogue() {
        var catalogue = document.getElementById('servicesCatalogueContent');
        if (!catalogue) return;

        var number = 0;
        catalogue.innerHTML = groups.map(function (group, groupIndex) {
            var cards = group.services.map(function (service) {
                var key = service[0];
                var record = details[key];
                if (!record) return '';
                number += 1;
                return '<a class="service-card" href="?filter=' + encodeURIComponent(key) + '#serviceDetail">' +
                    '<div class="service-card-top"><span class="service-card-icon">' + iconFor(key) + '</span><span class="service-card-number">0' + number + ' / 10</span></div>' +
                    '<h3>' + escapeHtml(record.title || service[1]) + '</h3>' +
                    '<p class="service-tagline">' + escapeHtml(record.tagline || '') + '</p>' +
                    '<p class="service-description">' + escapeHtml(record.description || '') + '</p>' +
                    '<span class="service-card-link">Explore service <span aria-hidden="true">-&gt;</span></span>' +
                    '</a>';
            }).join('');
            if (!cards) return '';
            return '<section class="service-group" aria-labelledby="serviceGroup' + groupIndex + '">' +
                '<h3 class="service-group-heading" id="serviceGroup' + groupIndex + '">' + escapeHtml(group.title) + '</h3>' +
                '<div class="service-cards">' + cards + '</div>' +
                '</section>';
        }).join('');
        if (!number) catalogue.innerHTML = '<p class="services-empty">Service information is currently unavailable.</p>';
    }

    function renderRelatedProjects(serviceKey) {
        if (serviceKey !== 'interior design' || typeof loadWebsiteProjects !== 'function') return;
        loadWebsiteProjects().then(function (projects) {
            var matching = (projects || []).filter(function (project) {
                var categories = [project.category, project.categorySecondary].map(function (category) {
                    return String(category || '').trim().toLowerCase();
                });
                return project.isPublished !== false && project.slug && categories.indexOf('interior design') !== -1;
            });
            if (!matching.length) return;

            var host = document.getElementById('serviceProjects');
            if (!host) return;
            host.innerHTML = '<h3>Design in Practice</h3><div class="service-project-list">' +
                matching.map(function (project) {
                    return '<a class="service-project-link" href="../project-detail.html?slug=' + encodeURIComponent(project.slug) + '">' +
                        '<strong>' + escapeHtml(project.title || 'View project') + '</strong>' +
                        '<span>' + escapeHtml(project.category || 'Interior Design') + '</span></a>';
                }).join('') +
                '</div>';
            host.hidden = false;
        }).catch(function () {
            // The portfolio is optional; the service detail remains complete without it.
        });
    }

    function renderDetail(serviceKey) {
        var detail = document.getElementById('serviceDetail');
        var catalogue = document.getElementById('servicesCatalogue');
        var hero = document.getElementById('servicesHero');
        var approach = document.getElementById('servicesApproach');
        var principles = document.getElementById('servicesPrinciples');
        var cta = document.getElementById('servicesCta');
        var matched = groups.reduce(function (result, group) {
            return result || group.services.find(function (service) { return service[0] === serviceKey; });
        }, null);
        var record = serviceKey && matched ? details[serviceKey] : null;

        if (!record) {
            if (detail) detail.hidden = true;
            return;
        }

        var deliverables = Array.isArray(record.deliverables) ? record.deliverables : [];
        var title = record.title || matched[1];
        var tagline = record.tagline || '';
        var description = record.description || '';
        var detailMarkup = '<a class="service-detail-back" href="../services/#servicesCatalogue"><span aria-hidden="true">&larr;</span> All services</a>' +
            '<div class="service-detail-hero"><p class="section-kicker">' + escapeHtml(matched ? matched[1] : 'AIS Concepts') + '</p>' +
            '<h2>' + escapeHtml(title) + '</h2>' +
            '<p class="service-detail-tagline">' + escapeHtml(tagline) + '</p>' +
            '<p>' + escapeHtml(description) + '</p></div>' +
            '<div class="service-detail-content"><div><h3>Scope of service</h3>' +
            '<p>' + escapeHtml(description) + '</p></div>' +
            (deliverables.length ? '<aside class="service-deliverables"><h3>Potential outputs</h3><ul>' +
                deliverables.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') +
                '</ul></aside>' : '') +
            '</div><div class="service-detail-action"><p>Project requirements and deliverables are shaped around the agreed scope. Get in touch to discuss what your project needs.</p>' +
            '<a class="services-button services-button-gold" href="../contact/">Request a consultation <span aria-hidden="true">-&gt;</span></a></div>' +
            '<div class="service-projects" id="serviceProjects" hidden></div>';

        if (detail) {
            detail.innerHTML = detailMarkup;
            detail.hidden = false;
            renderRelatedProjects(serviceKey);
        }
        if (catalogue) catalogue.hidden = true;
        if (hero) hero.hidden = true;
        if (approach) approach.hidden = true;
        if (principles) principles.hidden = true;
        if (cta) cta.hidden = true;
        document.title = title + ' | AIS Concepts';
    }

    renderHero();
    renderCatalogue();

    var filter = new URLSearchParams(window.location.search).get('filter');
    if (filter) renderDetail(filter.toLowerCase().trim());
})();
