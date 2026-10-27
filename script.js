// ===== script.js =====

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {

    /* ===== HERO CAROUSEL ===== */
    (function() {
        const carousel = document.getElementById('heroCarousel');
        if (!carousel) return;

        const defaultSlides = [
            {
                image: 'images/project1.jpg',
                category: 'Product Design',
                title: 'Objects built with intention',
                description: 'Custom furniture, fittings, and bespoke objects designed to complete the built environment with the same rigour as the architecture.'
            },
            {
                image: 'images/project3.jpg',
                category: 'Residential',
                title: 'Homes made for living',
                description: 'Thoughtful homes shaped around the people who live in them, balancing comfort, character, and a lasting connection to place.'
            },
            {
                image: 'images/service1.jpg',
                category: 'Commercial',
                title: 'Spaces for work that matters',
                description: 'Purposeful commercial environments that bring people together and help businesses do their best work.'
            },
            {
                image: 'images/service2.jpg',
                category: 'Residential',
                title: 'A better way to live',
                description: 'Considered residential design that makes everyday life feel more comfortable, connected, and inspiring.'
            }
        ];

        function renderCarousel(carouselItems, projects) {
            const projectList = Array.isArray(projects) ? projects : [];
            const slides = (carouselItems.length ? carouselItems : defaultSlides).map((item, index) => {
                const projectId = item.projectId && typeof item.projectId === 'object'
                    ? item.projectId._id || item.projectId.id
                    : item.projectId;
                const linkedProject = projectList.find(project => String(project.id) === String(projectId));
                const defaults = defaultSlides[index % defaultSlides.length];
                const category = item.category || defaults.category;
                const hasConfiguredCategory = Boolean(item.category);
                const categoryDefaults = defaultSlides.find(slide => slide.category === category) || defaults;

                return {
                    image: item.image || defaults.image,
                    category,
                    title: hasConfiguredCategory ? item.title || categoryDefaults.title : defaults.title,
                    description: hasConfiguredCategory ? item.description || categoryDefaults.description : defaults.description,
                    href: linkedProject && linkedProject.slug
                        ? `project-detail.html?slug=${encodeURIComponent(linkedProject.slug)}`
                        : 'projects/'
                };
            });
            const slidesContainer = document.createElement('div');
            slidesContainer.className = 'carousel-slides-container';
            const indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'carousel-indicators';

            slides.forEach((slide, index) => {
                const slideElement = document.createElement('div');
                slideElement.className = 'carousel-slide';
                const image = document.createElement('img');
                image.src = slide.image;
                image.alt = `${slide.category}: ${slide.title.replace(/\n/g, ' ')}`;
                image.className = 'carousel-image';
                slideElement.appendChild(image);
                slidesContainer.appendChild(slideElement);

                const indicator = document.createElement('button');
                indicator.type = 'button';
                indicator.className = `carousel-indicator${index === 0 ? ' active' : ''}`;
                indicator.dataset.slide = String(index);
                indicator.setAttribute('aria-label', `Slide ${index + 1}`);
                indicatorsContainer.appendChild(indicator);
            });

            carousel.replaceChildren(slidesContainer, indicatorsContainer);
            initCarousel(slides);
        }

        fetch((window.API_BASE || '') + '/api/hero-carousel')
            .then(response => {
                if (!response.ok) {
                    throw new Error('API error');
                }
                return response.json();
            })
            .then(carouselItems => {
                if (!Array.isArray(carouselItems)) {
                    throw new Error('Invalid hero carousel response');
                }
                if (carouselItems.length === 0) {
                    renderCarousel([], []);
                    return;
                }
                return fetch((window.API_BASE || '') + '/api/projects')
                    .then(response => {
                        if (!response.ok) throw new Error('Project API error');
                        return response.json();
                    })
                    .then(projects => renderCarousel(carouselItems, projects))
                    .catch(error => {
                        console.error('Error loading linked hero projects:', error);
                        renderCarousel(carouselItems, []);
                    });
            })
            .catch(error => {
                console.error('Error loading hero carousel:', error);
                renderCarousel([], []);
            });

        function initCarousel(slideContent) {
            const slidesContainer = carousel.querySelector('.carousel-slides-container');
            const slides = carousel.querySelectorAll('.carousel-slide');
            const indicators = carousel.querySelectorAll('.carousel-indicator');
            const progress = document.getElementById('heroSlideProgress');
            const slideDots = document.getElementById('heroSlideDots');
            const heroCategory = document.getElementById('heroProjectCategory');
            const heroTitle = document.getElementById('heroProjectTitle');
            const heroDescription = document.getElementById('heroProjectDescription');
            const heroProjectLink = document.getElementById('heroProjectLink');
            const prevBtn = document.getElementById('heroCarouselPrev');
            const nextBtn = document.getElementById('heroCarouselNext');

            console.log('Carousel init:', { slidesContainer, slides, indicators, prevBtn, nextBtn });
            
            if (!slidesContainer || slides.length === 0) {
                console.log('Carousel init skipped: no slides container or slides');
                return;
            }
            
            let currentSlide = 0;
            const interval = 10000; // 10 seconds per slide
            let isAnimating = false;

            if (slideDots) {
                slideDots.replaceChildren(...Array.from(slides, (_, index) => {
                    const dot = document.createElement('span');
                    dot.className = `hero-slide-dot${index === 0 ? ' active' : ''}`;
                    return dot;
                }));
            }

            function startProgress() {
                if (!progress) return;
                progress.style.transition = 'none';
                progress.style.width = '0';
                progress.offsetWidth;
                progress.style.transition = `width ${interval}ms linear`;
                progress.style.width = '100%';
            }

            // Clone first slide and append to end for infinite loop
            const firstSlideClone = slides[0].cloneNode(true);
            slidesContainer.appendChild(firstSlideClone);

            // Update slides NodeList after cloning
            const allSlides = carousel.querySelectorAll('.carousel-slide');
            const totalSlides = allSlides.length;

            function updateCarousel(instant = false) {
                const translateX = -(currentSlide * 100);
                slidesContainer.style.transition = instant ? 'none' : 'transform 0.6s ease-in-out';
                slidesContainer.style.transform = `translateX(${translateX}%)`;
                console.log('Carousel updated to slide:', currentSlide);
                
                // Update indicators (only for real slides, not the clone)
                const realSlideIndex = currentSlide % slides.length;
                indicators.forEach((indicator, index) => {
                    indicator.classList.toggle('active', index === realSlideIndex);
                });
                const content = slideContent[realSlideIndex];
                if (content) {
                    if (heroCategory) heroCategory.textContent = `-${content.category}-`;
                    if (heroTitle) heroTitle.textContent = content.title;
                    if (heroDescription) heroDescription.textContent = content.description;
                    if (heroProjectLink) heroProjectLink.href = content.href;
                }
                if (slideDots) {
                    slideDots.querySelectorAll('.hero-slide-dot').forEach((dot, index) => {
                        dot.classList.toggle('active', index === realSlideIndex);
                    });
                }
            }

            function nextSlide() {
                if (isAnimating) return;
                isAnimating = true;
                
                currentSlide++;
                startProgress();
                updateCarousel();
                
                // If we've reached the cloned first slide, reset to real first slide after animation
                if (currentSlide >= totalSlides - 1) {
                    setTimeout(() => {
                        currentSlide = 0;
                        updateCarousel(true);
                        isAnimating = false;
                    }, 600);
                } else {
                    setTimeout(() => {
                        isAnimating = false;
                    }, 600);
                }
            }

            function prevSlide() {
                if (isAnimating) return;
                isAnimating = true;
                
                currentSlide--;
                startProgress();
                updateCarousel();
                
                // If we've gone before the first slide, jump to the cloned slide then reset
                if (currentSlide < 0) {
                    setTimeout(() => {
                        currentSlide = totalSlides - 2;
                        updateCarousel(true);
                        isAnimating = false;
                    }, 600);
                } else {
                    setTimeout(() => {
                        isAnimating = false;
                    }, 600);
                }
            }

            function goToSlide(index) {
                if (isAnimating) return;
                isAnimating = true;
                
                currentSlide = index;
                startProgress();
                updateCarousel();
                
                setTimeout(() => {
                    isAnimating = false;
                }, 600);
            }

            // Auto-advance slides
            updateCarousel(true);
            let carouselInterval = setInterval(nextSlide, interval);
            startProgress();

            // Navigation arrows
            if (prevBtn) {
                console.log('Adding prev button listener');
                prevBtn.addEventListener('click', (e) => {
                    console.log('Prev button clicked, event:', e);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    clearInterval(carouselInterval);
                    prevSlide();
                    carouselInterval = setInterval(nextSlide, interval);
                });
            } else {
                console.log('Prev button not found');
            }

            if (nextBtn) {
                console.log('Adding next button listener');
                nextBtn.addEventListener('click', (e) => {
                    console.log('Next button clicked, event:', e);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    clearInterval(carouselInterval);
                    nextSlide();
                    carouselInterval = setInterval(nextSlide, interval);
                });
            } else {
                console.log('Next button not found');
            }

            // Click handlers for indicators
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearInterval(carouselInterval);
                    goToSlide(index);
                    carouselInterval = setInterval(nextSlide, interval);
                });
            });

            // Pause on hover
            carousel.addEventListener('mouseenter', () => {
                clearInterval(carouselInterval);
                if (progress) {
                    progress.style.transition = 'none';
                    progress.style.width = getComputedStyle(progress).width;
                }
            });

            carousel.addEventListener('mouseleave', () => {
                startProgress();
                carouselInterval = setInterval(nextSlide, interval);
            });

            // Touch/swipe support for mobile
            let touchStartX = 0;
            let touchEndX = 0;

            carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            carousel.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, { passive: true });

            function handleSwipe() {
                const swipeThreshold = 50;
                const diff = touchStartX - touchEndX;
                
                if (diff > swipeThreshold) {
                    // Swipe left - go to next
                    clearInterval(carouselInterval);
                    nextSlide();
                    carouselInterval = setInterval(nextSlide, interval);
                } else if (diff < -swipeThreshold) {
                    // Swipe right - go to previous
                    clearInterval(carouselInterval);
                    prevSlide();
                    carouselInterval = setInterval(nextSlide, interval);
                }
            }
        }
    })();

    /* ===== THEME (light/dark) ===== */
    (function() {
        var saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        var btn = document.getElementById('themeToggle');
        var icon = btn ? btn.querySelector('i') : null;

        function updateIcon(theme) {
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }

        updateIcon(saved);

        if (btn) {
            btn.addEventListener('click', function() {
                var current = document.documentElement.getAttribute('data-theme') || 'light';
                var newTheme = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateIcon(newTheme);
            });
        }
    })();

    /* ===== SPLASH INTRO: only when landing on home (not when navigating from about/careers/etc) ===== */
    (function() {
        const splash = document.getElementById('splashIntro');
        const splashLogo = document.getElementById('splashLogo');
        const navbar = document.getElementById('navbar');
        const navbarLogo = navbar ? navbar.querySelector('.logo-img') : null;

        if (!splash || !splashLogo || !navbarLogo) return;

        const path = window.location.pathname;
        const isHome = path === '/' || path === '' || /\/home\/?$/i.test(path) || /\/index\.html$/i.test(path);
        const referrer = document.referrer || '';
        const fromOtherPage = referrer.indexOf(window.location.origin) >= 0 && !/\/(index\.html|home\/?)?$/.test(referrer.replace(window.location.origin, ''));

        // Always hide splash if not on home page or coming from another page
        if (!isHome || fromOtherPage) {
            splash.style.display = 'none';
            return;
        }

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Show splash
        splash.style.display = 'flex';

        // Function to get element position
        function getElementPosition(element) {
            const rect = element.getBoundingClientRect();
            return {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            };
        }

        // Wait for page to be ready (DOM + images)
        function startTransition() {
            if (prefersReducedMotion) {
                // Skip animation for reduced motion
                splash.classList.add('splash-hide');
                setTimeout(function() {
                    splash.style.display = 'none';
                }, 300);
                return;
            }

            // Get navbar logo position
            const navbarPos = getElementPosition(navbarLogo);
            const navbarLogoImg = navbarLogo;
            const navbarLogoHeight = navbarLogoImg.offsetHeight || 60;
            const navbarLogoWidth = navbarLogoImg.offsetWidth || 200;

            // Calculate destination transform
            const currentRect = splashLogo.getBoundingClientRect();
            const deltaX = navbarPos.left - currentRect.left;
            const deltaY = navbarPos.top - currentRect.top;
            const scale = navbarLogoHeight / 220; // 220 is initial splash logo height

            // Apply transition to move logo to navbar
            splashLogo.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(${scale})`;
            splashLogo.style.opacity = '1';

            // Fade out splash background AFTER logo reaches navbar (800ms animation duration)
            setTimeout(function() {
                splash.classList.add('splash-hide');
            }, 800);

            // Hide splash after fade completes
            setTimeout(function() {
                splash.style.display = 'none';
                // Show navbar logo
                navbarLogo.style.opacity = '1';
            }, 1100);
        }

        // Wait for window load or timeout to prevent getting stuck
        let loaded = false;
        const maxWait = 3000; // 3 seconds max wait

        window.addEventListener('load', function() {
            if (!loaded) {
                loaded = true;
                setTimeout(startTransition, 200); // Small delay for smoother transition
            }
        });

        // Fallback timeout in case load event doesn't fire
        setTimeout(function() {
            if (!loaded) {
                loaded = true;
                startTransition();
            }
        }, maxWait);
    })();

    /* ===== HERO VIDEO + SOM-style scroll (fixed layer fades & lifts; content slides over) ===== */
    const heroVideo = document.querySelector('.hero-video');
    const heroFixedWrap = document.getElementById('heroFixedWrap');
    const heroScrollSpacer = document.getElementById('heroScrollSpacer');
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

    function updateHeroSOM() {
        if (!heroFixedWrap || !heroScrollSpacer) return;
        var max = heroScrollSpacer.offsetHeight || 1;
        var y = window.scrollY || window.pageYOffset;
        var p = Math.min(1, y / max);
        var opacity = Math.max(0, 1 - p * 0.8);
        var blur = p * 8; // Blur increases from 0 to 8px as user scrolls
        heroFixedWrap.style.opacity = opacity;
        heroFixedWrap.style.filter = 'blur(' + blur + 'px)';
        heroFixedWrap.style.visibility = p >= 0.97 ? 'hidden' : 'visible';
    }

    function updateNavbarOnScroll() {
        if (!navbar) return;
        var scroll = window.scrollY || window.pageYOffset;
        var h = heroScrollSpacer ? heroScrollSpacer.offsetHeight : (hero ? hero.offsetHeight : 0) || 1;
        if (scroll > h * 0.35) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    }

    function onScroll() {
        updateHeroSOM();
        updateNavbarOnScroll();
    }

    if (heroFixedWrap && heroScrollSpacer) {
        updateHeroSOM();
        window.addEventListener('scroll', onScroll, { passive: true });
    } else if (navbar) {
        updateNavbarOnScroll();
        window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
    }

    /* ===== MOBILE NAV TOGGLE ===== */
    if (navToggle && navbar) {
        navToggle.addEventListener('click', function() {
            navbar.classList.toggle('open');
        });
    }

    /* ===== MOBILE SOCIALS DROPDOWN ===== */
    (function() {
        const mobileSocialsToggle = document.getElementById('mobileSocialsToggle');
        const mobileSocialsDropdown = document.getElementById('mobileSocialsDropdown');
        
        if (mobileSocialsToggle && mobileSocialsDropdown) {
            mobileSocialsToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                mobileSocialsDropdown.classList.toggle('open');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!mobileSocialsDropdown.contains(e.target)) {
                    mobileSocialsDropdown.classList.remove('open');
                }
            });
        }
    })();

    /* ===== MOBILE DROPDOWN TOGGLES ===== */
    const hasDropdownItems = document.querySelectorAll('.has-dropdown');

    hasDropdownItems.forEach(function(item) {
        const link = item.querySelector('a');
        const dropdown = item.querySelector('.nav-dropdown');

        if (link && dropdown) {
            link.addEventListener('click', function(e) {
                // Only handle on desktop view - on mobile, let it navigate normally
                if (window.innerWidth > 768) {
                    e.preventDefault();

                    // Close other dropdowns
                    hasDropdownItems.forEach(function(otherItem) {
                        if (otherItem !== item) {
                            otherItem.classList.remove('mobile-open');
                        }
                    });

                    // Toggle current dropdown
                    item.classList.toggle('mobile-open');
                }
            });
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && navbar && navbar.classList.contains('open')) {
            if (!navbar.contains(e.target) && e.target !== navToggle) {
                navbar.classList.remove('open');
                // Close all dropdowns
                hasDropdownItems.forEach(function(item) {
                    item.classList.remove('mobile-open');
                });
            }
        }
    });

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
                .catch(function (err) {
                    console.error(err);
                });
        });
    }

    /* ===== STATS COUNTER - TYPEWRITER STYLE ===== */
    function runStatsCounter() {
        const numbers = document.querySelectorAll('.stat-number, .hero-stat-number');
        console.log('runStatsCounter called, found', numbers.length, 'elements');
        if (numbers.length > 0) {
            numbers.forEach(function(target) {
                const count = parseInt(target.getAttribute('data-count'));
                const countStr = count.toString();
                console.log('Animating:', target, 'with count:', count, 'as string:', countStr);
                target.textContent = '0';
                let i = 0;
                const typeNumber = () => {
                    if (i < countStr.length) {
                        target.textContent = countStr.substring(0, i + 1);
                        console.log('Setting textContent to:', countStr.substring(0, i + 1));
                        i++;
                        setTimeout(typeNumber, 100);
                    } else {
                        console.log('Animation complete for', target);
                    }
                };
                typeNumber();
            });
        }
    }
    // runStatsCounter() will be called after API data is loaded

    /* ===== CONTACT FORM (handled below in dedicated block) ===== */

    /* ===== TYPWRITER EFFECT ===== */
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
                    var href = link.getAttribute('href');
                    if (href === `#${sectionId}` || (sectionId === 'home' && (href === '/' || href === '/home' || href === '/home/'))) {
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

    /* ===== Footer: dynamic copyright year & clickable phone/email ===== */
    (function () {
        var year = new Date().getFullYear();
        document.querySelectorAll('.footer-copyright-year').forEach(function (el) {
            el.textContent = year;
        });
    })();

    (function () {
        document.querySelectorAll('.footer address').forEach(function (addr) {
            if (addr.dataset.contactLinked === '1') return;
            var html = addr.innerHTML;
            if (html.indexOf('tel:') === -1) {
                html = html.replace(
                    /(\+254\s*719\s*548\s*773|\+254719548773)/gi,
                    '<a href="tel:+254719548773" class="footer-contact-link">$1</a>'
                );
            }
            if (html.indexOf('mail.google.com') === -1) {
                html = html.replace(
                    /(info@aisconcepts\.com)/gi,
                    '<a href="https://mail.google.com/mail/?view=cm&fs=1&to=$1" class="footer-contact-link" target="_blank">$1</a>'
                );
            }
            addr.innerHTML = html;
            addr.dataset.contactLinked = '1';
        });
    })();

    /* ===== Footer: Load VLogs ===== */
    (function () {
        var vlogsContainer = document.getElementById('footerVlogsContainer');
        if (vlogsContainer) {
            fetch((window.API_BASE || '') + '/api/vlogs')
                .then(function(response) {
                    if (response.ok) {
                        return response.json();
                    }
                    return [];
                })
                .then(function(vlogs) {
                    if (vlogs.length === 0) {
                        vlogsContainer.innerHTML = '<p style="color: var(--footer-muted); font-size: 0.9rem;">No vlogs available yet.</p>';
                        return;
                    }

                    var vlogsHtml = '<div class="footer-vlogs">';
                    vlogs.slice(0, 3).forEach(function(vlog) {
                        var thumbnail = vlog.thumbnail || 'https://via.placeholder.com/60x40?text=VLog';
                        vlogsHtml += '<a href="' + vlog.youtubeUrl + '" target="_blank" class="footer-vlog-item">';
                        vlogsHtml += '<img src="' + thumbnail + '" alt="' + (vlog.title || 'VLog') + '" class="footer-vlog-thumbnail">';
                        vlogsHtml += '<div class="footer-vlog-info">';
                        vlogsHtml += '<div class="footer-vlog-title">' + (vlog.title || 'VLog') + '</div>';
                        vlogsHtml += '<div class="footer-vlog-category">' + (vlog.category || 'Video') + '</div>';
                        vlogsHtml += '</div>';
                        vlogsHtml += '</a>';
                    });
                    vlogsHtml += '</div>';
                    vlogsContainer.innerHTML = vlogsHtml;
                })
                .catch(function() {
                    vlogsContainer.innerHTML = '<p style="color: var(--footer-muted); font-size: 0.9rem;">Unable to load vlogs.</p>';
                });
        }
    })();

    /* ===== Contact page form → API + email ===== */
    (function () {
        var form = document.getElementById('contactForm');
        if (!form) return;
        var nameInput = document.getElementById('contactName');
        var emailInput = document.getElementById('contactEmail');
        var phoneInput = document.getElementById('contactPhone');
        var messageInput = document.getElementById('contactMessage');
        var submitBtn = form.querySelector('button[type="submit"]');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = nameInput ? nameInput.value.trim() : '';
            var email = emailInput ? emailInput.value.trim() : '';
            var phone = phoneInput ? phoneInput.value.trim() : '';
            var message = messageInput ? messageInput.value.trim() : '';
            if (!name || !email || !message) {
                alert('Please enter your name, email, and message.');
                return;
            }
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }
            var apiBase = window.API_BASE || '';
            fetch(apiBase + '/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, email: email, phone: phone, message: message })
            }).then(function (r) {
                return r.json().then(function (data) {
                    if (!r.ok) throw new Error(data.error || 'Failed to send message');
                    return data;
                });
            }).then(function (data) {
                alert(data.message || 'Thank you! Your message has been sent. We will get back to you soon.');
                form.reset();
            }).catch(function (err) {
                alert(err.message || 'Could not send your message. Please try again or email us directly.');
            }).finally(function () {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                }
            });
        });
    })();

    console.log('AIS Concepts website initialized');
});