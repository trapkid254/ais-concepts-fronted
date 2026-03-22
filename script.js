// ===== script.js =====

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {

    /* ===== THEME (light/dark) ===== */
    (function() {
        var saved = sessionStorage.getItem('theme');
        if (saved === 'dark') document.body.classList.add('dark');
        var btn = document.getElementById('themeToggle');
        if (btn) {
            btn.addEventListener('click', function() {
                document.body.classList.toggle('dark');
                sessionStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
            });
        }
    })();
    
    /* ===== SPLASH INTRO: only when landing on home (not when navigating from about/careers/etc) ===== */
    (function() {
        const splash = document.getElementById('splashIntro');
        if (!splash) return;
        const isHome = /index\.html?$|\/$/.test(window.location.pathname) || window.location.pathname === '' || window.location.pathname === '/';
        const referrer = document.referrer || '';
        const fromOtherPage = referrer.indexOf(window.location.origin) >= 0 && referrer.indexOf('index') === -1 && referrer.indexOf('/') !== referrer.length - 1;
        if (!isHome || fromOtherPage) {
            splash.style.display = 'none';
            return;
        }
        const bar = document.getElementById('splashLoadingBar');
        const pctEl = document.getElementById('splashLoadingPct');
        const duration = 3200;
        const start = performance.now();
        function tick(now) {
            const elapsed = now - start;
            const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
            if (pctEl) pctEl.textContent = pct + '%';
            if (bar) bar.style.width = pct + '%';
            if (bar) bar.style.marginLeft = (-pct / 2) + '%';
            if (elapsed < duration) requestAnimationFrame(tick);
            else {
                if (pctEl) pctEl.textContent = '100%';
                if (bar) { bar.style.width = '100%'; bar.style.marginLeft = '-50%'; }
                splash.classList.add('splash-hide');
                setTimeout(function() {
                    splash.style.display = 'none';
                }, 400);
            }
        }
        requestAnimationFrame(tick);
    })();

    /* ===== HERO VIDEO (smooth playback — no per-frame opacity that causes jank) ===== */
    const heroVideo = document.querySelector('.hero-video');
    const hero = document.querySelector('.hero');
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    if (heroVideo) {
        heroVideo.muted = true;
        heroVideo.playsInline = true;
        heroVideo.setAttribute('playsinline', '');
        var playPromise = heroVideo.play();
        if (playPromise !== undefined) {
            playPromise.catch(function () {});
        }
    }

    function updateNavbarOnScroll() {
        if (!hero || !navbar) return;
        var scroll = window.scrollY || window.pageYOffset;
        var h = hero.offsetHeight || 1;
        if (scroll > h * 0.35) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    }
    if (hero && navbar) {
        updateNavbarOnScroll();
        window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
    } else if (navbar) {
        navbar.classList.add('scrolled');
    }

    /* ===== MOBILE NAV TOGGLE ===== */
    if (navToggle && navbar) {
        navToggle.addEventListener('click', function() {
            navbar.classList.toggle('open');
        });
    }

    /* ===== MODALS (careers, etc. — login uses dedicated pages) ===== */
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.querySelector('.close-modal');
    const portalTabs = document.querySelectorAll('.portal-tab');
    const portalSelect = document.getElementById('portalType');
    const loginForm = document.getElementById('loginForm');

    // Close modal (any .close-modal closes its parent .modal)
    document.querySelectorAll('.close-modal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    const API_BASE = window.API_BASE || '';

    // Portal tabs (legacy modals on pages that still include them)
    if (portalSelect && portalTabs.length) {
        portalTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                portalTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const portal = this.getAttribute('data-portal');
                portalSelect.value = portal;
            });
        });
        portalSelect.addEventListener('change', function() {
            const value = this.value;
            portalTabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-portal') === value) {
                    tab.classList.add('active');
                }
            });
        });
    }

    /* ===== SMOOTH SCROLLING for anchor links ===== */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#' || href === '') return;
            if (this.id === 'loginBtn') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    /* ===== NEWSLETTER FORM ===== */
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            fetch(API_BASE + '/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            })
                .then(function (r) {
                    if (r.ok) {
                        alert('Thank you for subscribing to our newsletter!');
                        newsletterForm.reset();
                    } else {
                        return r.json().then(function (d) {
                            throw new Error(d.error);
                        });
                    }
                })
                .catch(function () {
                    alert('Could not subscribe right now. Please try again later.');
                });
        });
    }

    /* ===== TYPEWRITER EFFECT (all pages) ===== */
    function runTypewriter() {
        const els = document.querySelectorAll('[data-typewriter]');
        let delay = 0;
        els.forEach(function(el) {
            if (el.closest('.careers-hero')) return;
            const text = el.getAttribute('data-typewriter');
            if (!text) return;
            const speed = el.classList.contains('typewriter-text') ? 40 : 60;
            setTimeout(function() {
                el.textContent = '';
                el.classList.remove('typed');
                let i = 0;
                function type() {
                    if (i < text.length) {
                        el.textContent += text.charAt(i);
                        i++;
                        setTimeout(type, speed);
                    } else {
                        el.classList.add('typed');
                    }
                }
                type();
            }, delay);
            delay += 200;
        });
    }
    runTypewriter();

    /* ===== STATS COUNTER (index / about) ===== */
    function runStatsCounter() {
        const statsSection = document.querySelector('.stats-section');
        if (!statsSection) return;
        const numbers = document.querySelectorAll('.stat-number[data-count]');
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'), 10) || 0;
                let start = 0;
                const duration = 2000;
                const startTime = performance.now();
                function step(now) {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.floor(start + (target - start) * easeOut);
                    if (progress < 1) requestAnimationFrame(step);
                    else el.textContent = target;
                }
                requestAnimationFrame(step);
                observer.unobserve(el);
            });
        }, { threshold: 0.3 });
        numbers.forEach(function(n) { observer.observe(n); });
    }
    runStatsCounter();

    /* ===== MOBILE DROPDOWN TOGGLE ===== */
    document.querySelectorAll('.has-dropdown > a').forEach(function(a) {
        a.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                a.parentElement.classList.toggle('open');
            }
        });
    });

    /* ===== CONTACT FORM ===== */
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const inputs = contactForm.querySelectorAll('.form-control');
            const name = inputs[0] ? inputs[0].value.trim() : '';
            const email = inputs[1] ? inputs[1].value.trim() : '';
            const message = inputs[2] ? inputs[2].value.trim() : '';
            fetch(API_BASE + '/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, email: email, message: message })
            })
                .then(function (r) {
                    if (r.ok) {
                        alert('Thank you for your message. Our team will contact you shortly.');
                        contactForm.reset();
                    } else {
                        throw new Error();
                    }
                })
                .catch(function () {
                    alert('Could not send your message. Please try again later.');
                });
        });
    }

    /* ===== ACTIVE NAVIGATION HIGHLIGHTING ===== */
    const sections = document.querySelectorAll('section[id]');
    
    function updateActiveNavLink() {
        let scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-links a').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNavLink);

    /* Legacy #login hash → client login page */
    if (window.location.hash === '#login') {
        window.location.replace('client/login.html');
    }

    console.log('AIS Concepts website initialized');
});