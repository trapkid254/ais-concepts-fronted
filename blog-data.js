(function (global) {
  var API_BASE = global.API_BASE || '';
  var __posts = [];

  function defaults() {
    return [
      {
        id: 1,
        title: 'Designing the Sustainable High-Rise',
        date: '2026-03-01',
        excerpt:
          'How façade strategies, daylight modeling, and smart systems can reduce energy loads while keeping towers expressive and human.',
        image: 'images/blog1.jpg'
      },
      {
        id: 2,
        title: 'African Modernism, Reimagined',
        date: '2026-02-12',
        excerpt:
          'Blending local materials, craft, and climate intelligence to create contemporary spaces rooted in place.',
        image: 'images/blog2.jpg'
      },
      {
        id: 3,
        title: 'Designing for Experience',
        date: '2026-01-25',
        excerpt:
          'Why light, acoustics, and material tactility matter as much as the floor plan when crafting memorable interiors.',
        image: 'images/blog3.jpg'
      }
    ];
  }

  global.loadWebsiteBlogPosts = function () {
    return fetch(API_BASE + '/api/blog')
      .then(function (r) {
        if (!r.ok) throw new Error('bad response');
        return r.json();
      })
      .then(function (list) {
        __posts = list || [];
        return __posts;
      })
      .catch(function () {
        __posts = defaults();
        return __posts;
      });
  };

  global.getWebsiteBlogPosts = function () {
    return __posts;
  };

  global.setWebsiteBlogPosts = function (posts) {
    var token = global.sessionStorage && global.sessionStorage.getItem('authToken');
    return fetch(API_BASE + '/api/admin/blog', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (token || '')
      },
      body: JSON.stringify(posts)
    }).then(function (r) {
      if (!r.ok) throw new Error('Save failed');
      __posts = posts;
    });
  };
})(typeof window !== 'undefined' ? window : this);
