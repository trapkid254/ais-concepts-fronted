(function (global) {
  global.API_BASE = typeof global.API_BASE !== 'undefined' ? global.API_BASE : '';

  global.apiFetch = function (path, options) {
    var opts = options || {};
    var headers = Object.assign({}, opts.headers || {});
    var token = global.sessionStorage && global.sessionStorage.getItem('authToken');
    if (token && !headers.Authorization) {
      headers.Authorization = 'Bearer ' + token;
    }
    opts.headers = headers;
    return fetch((global.API_BASE || '') + path, opts);
  };
})(typeof window !== 'undefined' ? window : this);
