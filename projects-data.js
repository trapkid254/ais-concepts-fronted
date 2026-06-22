(function (global) {
  var API_BASE = global.API_BASE || '';
  var __projects = [];

  var PROJECT_CATEGORIES = ['Hospitality', 'Residential', 'Commercial', 'Interior', 'Apartments'];
  var LEGACY_PROJECT_CATEGORIES = ['Urban', 'Conceptual'];

  function mapProject(p) {
    return {
      id: p.id,
      slug: p.slug || '',
      title: p.title,
      category: p.category,
      categorySecondary: p.categorySecondary || '',
      image: p.image,
      heroImage: p.heroImage || p.image,
      projectImages: p.projectImages || [],
      asDesignedImages: p.asDesignedImages || p.projectImages || [],
      asBuiltImages: p.asBuiltImages || [],
      description: p.description || '',
      conceptSketches: p.conceptSketches || [],
      siteAnalysis: p.siteAnalysis || [],
      floorPlans: p.floorPlans || [],
      renderings: p.renderings || [],
      constructionPhotos: p.constructionPhotos || [],
      completedPhotos: p.completedPhotos || [],
      metrics: p.metrics || {},
      hasMetrics: p.hasMetrics || false,
      featuredOnHomepage: !!p.featuredOnHomepage,
      homeSortOrder: p.homeSortOrder != null ? p.homeSortOrder : 0
    };
  }

  function defaultProjects() {
    return [];
  }

  function categoryFilterSlug(category) {
    return String(category || '').trim().toLowerCase();
  }

  function allCategoryOptions(includeLegacy) {
    var list = PROJECT_CATEGORIES.slice();
    if (includeLegacy) {
      LEGACY_PROJECT_CATEGORIES.forEach(function (c) {
        if (list.indexOf(c) === -1) list.push(c);
      });
    }
    return list;
  }

  function renderCategoryFilterButtons(container, activeFilter) {
    if (!container) return;
    var active = (activeFilter || 'all').toLowerCase();
    var html = '<button type="button" class="filter-btn' + (active === 'all' ? ' active' : '') + '" data-filter="all">All</button>';
    PROJECT_CATEGORIES.forEach(function (cat) {
      var slug = categoryFilterSlug(cat);
      html += '<button type="button" class="filter-btn' + (active === slug ? ' active' : '') + '" data-filter="' + slug + '">' + cat + '</button>';
    });
    container.innerHTML = html;
  }

  function renderCategorySelectOptions(currentValue, includeLegacy, includeBlank) {
    var html = includeBlank !== false ? '<option value="">Select category...</option>' : '';
    var seen = {};
    allCategoryOptions(includeLegacy).forEach(function (cat) {
      seen[cat] = true;
      var selected = currentValue === cat ? ' selected' : '';
      html += '<option value="' + cat + '"' + selected + '>' + cat + '</option>';
    });
    if (currentValue && !seen[currentValue]) {
      html += '<option value="' + currentValue + '" selected>' + currentValue + ' (legacy)</option>';
    }
    return html;
  }

  global.buildProjectCategorySelect = function (projectId, currentValue, includeLegacy) {
    var opts = renderCategorySelectOptions(currentValue || '', includeLegacy, false);
    return '<select class="form-control admin-category-select" title="Change category" onchange="changeWebsiteProjectCategory(\'' +
      String(projectId).replace(/'/g, "\\'") + '\', this.value)">' + opts + '</select>';
  };

  global.loadWebsiteProjects = function () {
    return fetch(API_BASE + '/api/projects')
      .then(function (r) {
        if (!r.ok) throw new Error('bad response');
        return r.json();
      })
      .then(function (list) {
        __projects = (list || []).map(mapProject);
        return __projects;
      })
      .catch(function () {
        __projects = defaultProjects();
        return __projects;
      });
  };

  global.getWebsiteProjects = function () {
    return __projects;
  };

  global.setWebsiteProjects = function (projects) {
    var token = global.sessionStorage && global.sessionStorage.getItem('authToken');
    return fetch(API_BASE + '/api/admin/projects', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (token || '')
      },
      body: JSON.stringify(projects)
    }).then(function (r) {
      if (!r.ok) throw new Error('Save failed');
      __projects = projects;
    });
  };

  global.filterProjectsByCategory = function (projects, filter) {
    if (!filter || filter === 'all' || filter === '') return projects.slice();
    var f = (filter + '').toLowerCase().replace(/\s*&\s*/g, ' & ');
    return projects.filter(function (p) {
      var cat = (p.category || '').toLowerCase().replace(/\s*&\s*/g, ' & ');
      var cat2 = (p.categorySecondary || '').toLowerCase().replace(/\s*&\s*/g, ' & ');
      return cat === f || cat2 === f || cat.indexOf(f) !== -1 || cat2.indexOf(f) !== -1;
    });
  };

  /** Homepage shows up to 4 projects: pinned first, then the rest in list order. */
  global.selectHomepageProjects = function (projects) {
    if (!projects || !projects.length) return [];
    var featured = projects.filter(function (p) { return p.featuredOnHomepage; })
      .sort(function (a, b) { return (a.homeSortOrder || 0) - (b.homeSortOrder || 0); });
    if (!featured.length) return projects.slice();
    var featuredIds = {};
    featured.forEach(function (p) { featuredIds[String(p.id)] = true; });
    var rest = projects.filter(function (p) { return !featuredIds[String(p.id)]; });
    return featured.concat(rest);
  };

  global.PROJECT_CATEGORIES = PROJECT_CATEGORIES;
  global.LEGACY_PROJECT_CATEGORIES = LEGACY_PROJECT_CATEGORIES;
  global.categoryFilterSlug = categoryFilterSlug;
  global.allCategoryOptions = allCategoryOptions;
  global.renderCategoryFilterButtons = renderCategoryFilterButtons;
  global.renderCategorySelectOptions = renderCategorySelectOptions;
})(typeof window !== 'undefined' ? window : this);
