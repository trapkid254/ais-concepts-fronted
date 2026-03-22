(function (global) {
  var API_BASE = global.API_BASE || '';
  var __services = [];

  function defaults() {
    return [
      {
        id: 1,
        title: 'Architectural Design',
        category: 'Architectural Design',
        image: 'images/service1.jpg',
        description:
          'From concept to construction, we create spaces that inspire and function. Our designs respond to context, climate, and culture.'
      },
      {
        id: 2,
        title: 'Interior Architecture',
        category: 'Interior Architecture',
        image: 'images/service2.jpg',
        description:
          'Seamless integration of structure and interior experience, focusing on materiality, light, and spatial flow.'
      },
      {
        id: 3,
        title: 'Urban Planning',
        category: 'Urban Planning',
        image: 'images/service3.jpg',
        description:
          'Master planning for resilient communities, balancing density, green space, and infrastructure for future cities.'
      },
      {
        id: 4,
        title: 'Sustainable Design',
        category: 'Sustainable Design',
        image: 'images/service4.jpg',
        description:
          'Passive strategies, renewable materials, and energy modeling to achieve carbon-neutral architecture.'
      }
    ];
  }

  global.loadWebsiteServices = function () {
    return fetch(API_BASE + '/api/services')
      .then(function (r) {
        if (!r.ok) throw new Error('bad response');
        return r.json();
      })
      .then(function (list) {
        __services = list || [];
        return __services;
      })
      .catch(function () {
        __services = defaults();
        return __services;
      });
  };

  global.getWebsiteServices = function () {
    return __services;
  };

  global.setWebsiteServices = function (services) {
    var token = global.sessionStorage && global.sessionStorage.getItem('authToken');
    return fetch(API_BASE + '/api/admin/services', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (token || '')
      },
      body: JSON.stringify(services)
    }).then(function (r) {
      if (!r.ok) throw new Error('Save failed');
      __services = services;
    });
  };

  global.SERVICE_CATEGORIES = ['Architectural Design', 'Interior Architecture', 'Urban Planning', 'Sustainable Design'];
})(typeof window !== 'undefined' ? window : this);
