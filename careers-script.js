// Careers page: modal, typewriter, counter
document.addEventListener('DOMContentLoaded', function() {
    var careerModal = document.getElementById('careerApplicationModal');
    var careerRoleDisplay = document.getElementById('careerRoleDisplay');
    var careerForm = document.getElementById('careerApplicationForm');

    var campusWrap = document.getElementById('careerCampusWrap');
    var yearWrap = document.getElementById('careerYearWrap');
    var certWrap = document.getElementById('careerCertWrap');
    var careerTypeSelect = document.getElementById('careerType');
    function toggleCampusYear() {
        var isAttachment = careerTypeSelect && careerTypeSelect.value === 'attachment';
        var isFullOrPart = careerTypeSelect && (careerTypeSelect.value === 'full-time' || careerTypeSelect.value === 'part-time');
        if (campusWrap) campusWrap.style.display = isAttachment ? 'block' : 'none';
        if (yearWrap) yearWrap.style.display = isAttachment ? 'block' : 'none';
        if (certWrap) certWrap.style.display = isFullOrPart ? 'block' : 'none';
    }
    if (careerTypeSelect) careerTypeSelect.addEventListener('change', toggleCampusYear);

    document.querySelectorAll('.career-apply-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var role = this.getAttribute('data-role') || 'Position';
            if (careerRoleDisplay) careerRoleDisplay.textContent = role;
            if (careerModal) {
                careerModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
            var typeSelect = document.getElementById('careerType');
            if (typeSelect) {
                var v = role.toLowerCase();
                if (v.indexOf('attachment') !== -1) typeSelect.value = 'attachment';
                else if (v.indexOf('internship') !== -1) typeSelect.value = 'internship';
                else if (v.indexOf('part-time') !== -1) typeSelect.value = 'part-time';
                else if (v.indexOf('full-time') !== -1) typeSelect.value = 'full-time';
            }
            toggleCampusYear();
            if (certWrap) certWrap.style.display = (typeSelect.value === 'full-time' || typeSelect.value === 'part-time') ? 'block' : 'none';
        });
    });

    if (careerModal) {
        careerModal.addEventListener('click', function(e) {
            if (e.target === careerModal || e.target.classList.contains('close-modal')) {
                careerModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    if (careerForm) {
        careerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var type = document.getElementById('careerType').value;
            var certInput = document.getElementById('careerCertificate');
            var needsCert = (type === 'full-time' || type === 'part-time');
            if (needsCert && (!certInput || !certInput.files || !certInput.files.length)) {
                alert('Please upload your certificate(s) for Full-Time and Part-Time positions.');
                return;
            }
            var certificates = [];
            function addApp() {
                var payload = {
                    name: document.getElementById('careerName').value,
                    email: document.getElementById('careerEmail').value,
                    phone: document.getElementById('careerPhone').value || '',
                    type: type,
                    campus: type === 'attachment' ? (document.getElementById('careerCampus').value || '') : '',
                    yearOfStudy: type === 'attachment' ? (document.getElementById('careerYear').value || '') : '',
                    certificates: certificates,
                    message: document.getElementById('careerMessage').value || ''
                };
                fetch((window.API_BASE || '') + '/api/careers/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(r) {
                    if (r.ok) {
                        alert('Thank you for your application. Our team will review your submission and get back to you.');
                        careerForm.reset();
                        if (campusWrap) campusWrap.style.display = 'none';
                        if (yearWrap) yearWrap.style.display = 'none';
                        if (certWrap) certWrap.style.display = 'none';
                        if (careerModal) {
                            careerModal.style.display = 'none';
                            document.body.style.overflow = 'auto';
                        }
                    } else {
                        throw new Error();
                    }
                }).catch(function() {
                    alert('Could not submit application. Please try again later.');
                });
            }
            if (needsCert && certInput.files.length) {
                var read = 0;
                var total = certInput.files.length;
                Array.prototype.forEach.call(certInput.files, function(file) {
                    var reader = new FileReader();
                    reader.onload = function() {
                        certificates.push({ name: file.name, data: reader.result });
                        read++;
                        if (read === total) addApp();
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                addApp();
            }
        });
    }

    // Typewriter on this page
    function typewriter(el, text, speed, callback) {
        if (!el || !text) return;
        el.textContent = '';
        el.classList.remove('typed');
        var i = 0;
        function type() {
            if (i < text.length) {
                el.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                el.classList.add('typed');
                if (callback) callback();
            }
        }
        type();
    }

    var titleEl = document.querySelector('.careers-hero .typewriter-title');
    var subEl = document.querySelector('.careers-hero .typewriter-sub');
    if (titleEl && titleEl.getAttribute('data-typewriter')) {
        var titleText = titleEl.getAttribute('data-typewriter');
        typewriter(titleEl, titleText, 80, function() {
            if (subEl && subEl.getAttribute('data-typewriter')) {
                subEl.textContent = '';
                subEl.classList.remove('typed');
                typewriter(subEl, subEl.getAttribute('data-typewriter'), 60, runStats);
            } else {
                runStats();
            }
        });
    } else {
        runStats();
    }

    function runStats() {
        document.querySelectorAll('.stat-number[data-count]').forEach(function(el) {
            var target = parseInt(el.getAttribute('data-count'), 10) || 0;
            var duration = 2000;
            var start = 0;
            var startTime = null;
            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                var easeOut = 1 - Math.pow(1 - progress, 3);
                var current = Math.floor(start + (target - start) * easeOut);
                el.textContent = current;
                if (progress < 1) requestAnimationFrame(step);
                else el.textContent = target;
            }
            requestAnimationFrame(step);
        });
    }
});
