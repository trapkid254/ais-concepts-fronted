(function (global) {
  var API_BASE = global.API_BASE || '';
  var __posts = [];

  function defaults() {
    return [];
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
