(function () {
  var h = window.location.hostname || '';
  var p = window.location.port || '';
  if (h === 'ais-concepts-fronted.vercel.app' || h.endsWith('.vercel.app')) {
    window.API_BASE = 'https://ais-concepts-backend.onrender.com';
    return;
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    if (p && p !== '3000') {
      window.API_BASE = 'http://localhost:3000';
      return;
    }
  }
  window.API_BASE = typeof window.API_BASE !== 'undefined' ? window.API_BASE : '';
})();
