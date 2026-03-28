(function () {
  var h = window.location.hostname || '';
  var p = window.location.port || '';
  
  // Production deployment URLs
  if (h === 'ais-concepts.netlify.app' || h.endsWith('.netlify.app')) {
    window.API_BASE = 'https://ais-concepts-backend.onrender.com';
    return;
  }
  
  // Fallback for Vercel (if still needed)
  if (h === 'ais-concepts-fronted.vercel.app' || h.endsWith('.vercel.app')) {
    window.API_BASE = 'https://ais-concepts-backend.onrender.com';
    return;
  }
  
  // Local development
  if (h === 'localhost' || h === '127.0.0.1') {
    // Allow any localhost port for development
    window.API_BASE = 'http://localhost:3000';
    return;
  }
  
  // Default fallback
  window.API_BASE = typeof window.API_BASE !== 'undefined' ? window.API_BASE : 'https://ais-concepts-backend.onrender.com';
})();
