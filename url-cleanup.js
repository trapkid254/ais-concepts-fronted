// Keep the address bar clean: aisconcepts.com (not /index.html or trailing #)
(function () {
    var loc = window.location;
    var path = loc.pathname;
    var hash = loc.hash;
    var origin = loc.origin;
    var newPath = path;
    var newHash = hash;
    var changed = false;

    if (/\/index\.html$/i.test(path)) {
        newPath = path.replace(/\/index\.html$/i, '/') || '/';
        changed = true;
    }

    if (hash === '#' || hash === '#home') {
        newHash = '';
        changed = true;
    }

    if (newPath === '/home' || newPath === '/home/') {
        newPath = '/';
        changed = true;
    }

    if (changed) {
        history.replaceState(null, '', origin + newPath + newHash + loc.search);
    }

    document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href="#"]');
        if (link) {
            e.preventDefault();
        }
    }, true);

    window.addEventListener('hashchange', function () {
        if (loc.hash === '#' || loc.hash === '#home') {
            history.replaceState(null, '', origin + loc.pathname + loc.search);
        }
    });
})();
