(function (global) {
  var API_BASE = global.API_BASE || '';
  var __services = [];

  function defaults() {
    return [];
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
