(function (global) {
  var API_BASE = global.API_BASE || '';
  var __projects = [];

  function mapProject(p) {
    return {
      id: p.id,
      slug: p.slug || '',
      title: p.title,
      category: p.category,
      categorySecondary: p.categorySecondary || '',
      image: p.image,
      heroImage: p.heroImage || p.image,
      description: p.description || '',
      conceptSketches: p.conceptSketches || [],
      siteAnalysis: p.siteAnalysis || [],
      floorPlans: p.floorPlans || [],
      renderings: p.renderings || [],
      constructionPhotos: p.constructionPhotos || [],
      completedPhotos: p.completedPhotos || [],
      metrics: p.metrics || {}
    };
  }

  function defaultProjects() {
    return [
      {
        id: '1',
        slug: 'horizon-tower',
        title: 'Horizon Tower',
        category: 'Commercial',
        categorySecondary: 'Urban',
        image: 'images/project1.jpg',
        heroImage: 'images/project1.jpg',
        description:
          'A 45-story landmark featuring a dynamic facade that responds to solar patterns, reducing energy consumption by 30%.',
        conceptSketches: ['images/project1.jpg'],
        siteAnalysis: ['images/service1.jpg'],
        floorPlans: ['images/service2.jpg'],
        renderings: ['images/project1.jpg'],
        constructionPhotos: ['images/project2.jpeg'],
        completedPhotos: ['images/project3.jpg'],
        metrics: { costEfficiency: 88, sustainability: 82, innovation: 91 }
      },
      {
        id: '2',
        slug: 'eco-sphere-residence',
        title: 'Eco-Sphere Residence',
        category: 'Residential',
        categorySecondary: 'Sustainable',
        image: 'images/project2.jpeg',
        heroImage: 'images/project2.jpeg',
        description:
          'Net-zero carbon home integrating living walls and geothermal systems within a minimalist concrete shell.',
        conceptSketches: ['images/project2.jpeg'],
        siteAnalysis: ['images/service3.jpg'],
        floorPlans: ['images/service4.jpg'],
        renderings: ['images/project2.jpeg'],
        constructionPhotos: ['images/project1.jpg'],
        completedPhotos: ['images/project3.jpg'],
        metrics: { costEfficiency: 92, sustainability: 96, innovation: 85 }
      },
      {
        id: '3',
        slug: 'nexus-cultural-center',
        title: 'Nexus Cultural Center',
        category: 'Urban',
        categorySecondary: 'Cultural',
        image: 'images/project3.jpg',
        heroImage: 'images/project3.jpg',
        description:
          'Floating volumes and translucent stone create a dialogue between ancient building traditions and contemporary form.',
        conceptSketches: ['images/project3.jpg'],
        siteAnalysis: ['images/service1.jpg'],
        floorPlans: ['images/service2.jpg'],
        renderings: ['images/project3.jpg'],
        constructionPhotos: ['images/project2.jpeg'],
        completedPhotos: ['images/project1.jpg'],
        metrics: { costEfficiency: 80, sustainability: 78, innovation: 94 }
      },
      {
        id: '4',
        slug: 'riverside-mixed-use',
        title: 'Riverside Mixed-Use',
        category: 'Commercial',
        categorySecondary: 'Interior',
        image: 'https://via.placeholder.com/600x400?text=Riverside+Mixed-Use',
        heroImage: 'https://via.placeholder.com/1200x600?text=Riverside',
        description: 'Integrated retail, office, and residential with public plazas and green corridors.',
        conceptSketches: ['https://via.placeholder.com/800x500?text=Sketches'],
        siteAnalysis: ['https://via.placeholder.com/800x500?text=Site+Analysis'],
        floorPlans: ['https://via.placeholder.com/800x500?text=Floor+Plans'],
        renderings: ['https://via.placeholder.com/800x500?text=Renderings'],
        constructionPhotos: ['https://via.placeholder.com/800x500?text=Construction'],
        completedPhotos: ['https://via.placeholder.com/800x500?text=Completed'],
        metrics: { costEfficiency: 85, sustainability: 88, innovation: 80 }
      },
      {
        id: '5',
        slug: 'concept-atelier',
        title: 'Concept Atelier',
        category: 'Conceptual',
        categorySecondary: 'Research',
        image: 'images/service1.jpg',
        heroImage: 'images/service1.jpg',
        description: 'Experimental pavilion exploring tensile structures and daylight as primary material.',
        conceptSketches: ['images/service2.jpg'],
        siteAnalysis: ['images/service3.jpg'],
        floorPlans: ['images/service4.jpg'],
        renderings: ['images/service1.jpg'],
        constructionPhotos: ['images/service2.jpg'],
        completedPhotos: ['images/service3.jpg'],
        metrics: { costEfficiency: 70, sustainability: 90, innovation: 98 }
      }
    ];
  }

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

  global.PROJECT_CATEGORIES = ['Residential', 'Commercial', 'Urban', 'Interior', 'Conceptual'];
})(typeof window !== 'undefined' ? window : this);
