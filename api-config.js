(function () {
  var h = window.location.hostname || '';
  var p = window.location.port || '';
  
  // Configure production backend URL - change this for different deployments
  var PRODUCTION_API_URL = 'https://ais-concepts-backend.onrender.com';
  
  // Allow override via window.API_BASE before this script runs
  if (typeof window.API_BASE !== 'undefined' && window.API_BASE) {
    return;
  }
  
  // Production deployment URLs
  if (h === 'aisconcepts.com' || h === 'www.aisconcepts.com') {
    window.API_BASE = PRODUCTION_API_URL;
    return;
  }

  if (h === 'ais-concepts.netlify.app' || h.endsWith('.netlify.app')) {
    window.API_BASE = PRODUCTION_API_URL;
    return;
  }
  
  // Fallback for Vercel (if still needed)
  if (h === 'ais-concepts-fronted.vercel.app' || h.endsWith('.vercel.app')) {
    window.API_BASE = PRODUCTION_API_URL;
    return;
  }
  
  // Local development - can be overridden by setting window.API_BASE before loading this script
  if (h === 'localhost' || h === '127.0.0.1') {
    // Use production backend for local development by default
    // To use local backend, set window.API_BASE = 'http://localhost:3000' before loading this script
    window.API_BASE = PRODUCTION_API_URL;
    return;
  }
  
  // Default fallback
  window.API_BASE = PRODUCTION_API_URL;
})();
