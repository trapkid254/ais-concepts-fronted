// Careers page: modal, typewriter, counter
document.addEventListener('DOMContentLoaded', function() {
    var careerModal = document.getElementById('careerApplicationModal');
    var careerRoleDisplay = document.getElementById('careerRoleDisplay');
    var careerForm = document.getElementById('careerApplicationForm');

    var campusWrap = document.getElementById('careerCampusWrap');
    var yearWrap = document.getElementById('careerYearWrap');
    var yearStartSelect = document.getElementById('careerYearStart');
    var yearEndSelect = document.getElementById('careerYearEnd');
    var certWrap = document.getElementById('careerCertWrap');
    var careerTypeSelect = document.getElementById('careerType');
    
    // Portfolio handling
    var portfolioPhotos = document.getElementById('portfolioPhotos');
    var portfolioUrl = document.getElementById('portfolioUrl');
    var portfolioPdf = document.getElementById('portfolioPdf');
    var portfolioPhotosDiv = document.getElementById('portfolioPhotosDiv');
    var portfolioUrlDiv = document.getElementById('portfolioUrlDiv');
    var portfolioPdfDiv = document.getElementById('portfolioPdfDiv');
    
    function populateYearSelects() {
        if (!yearStartSelect || !yearEndSelect) return;
        if (yearStartSelect._populated && yearEndSelect._populated) return;
        var current = new Date().getFullYear();
        var start = current - 10;
        var end = current + 8;
        var opts = [];
        for (var y = start; y <= end; y++) {
            opts.push('<option value="' + y + '">' + y + '</option>');
        }
        yearStartSelect.innerHTML = '<option value="">Start year</option>' + opts.join('');
        yearEndSelect.innerHTML = '<option value="">Graduation year</option>' + opts.join('');
        yearStartSelect._populated = true;
        yearEndSelect._populated = true;
    }

    // pre-populate selects on load so they appear immediately when modal opens
    try { populateYearSelects(); } catch (e) { /* ignore */ }
    
    function toggleCampusYear() {
        var val = careerTypeSelect ? careerTypeSelect.value : '';
        var isAttachment = val === 'attachment';
        var isFullOrPart = val === 'full-time' || val === 'part-time';
        var showCampusYear = isAttachment || isFullOrPart;
        if (campusWrap) campusWrap.style.display = showCampusYear ? 'block' : 'none';
        if (yearWrap) {
            yearWrap.style.display = showCampusYear ? 'block' : 'none';
            if (showCampusYear) populateYearSelects();
        }
        if (certWrap) certWrap.style.display = isFullOrPart ? 'block' : 'none';
    }
    
    if (careerTypeSelect) careerTypeSelect.addEventListener('change', toggleCampusYear);
    
    // Portfolio type selection
    function handlePortfolioChange() {
        if (portfolioPhotosDiv) portfolioPhotosDiv.style.display = 'none';
        if (portfolioUrlDiv) portfolioUrlDiv.style.display = 'none';
        if (portfolioPdfDiv) portfolioPdfDiv.style.display = 'none';
        
        if (portfolioPhotos && portfolioPhotos.checked) {
            if (portfolioPhotosDiv) portfolioPhotosDiv.style.display = 'block';
        } else if (portfolioUrl && portfolioUrl.checked) {
            if (portfolioUrlDiv) portfolioUrlDiv.style.display = 'block';
        } else if (portfolioPdf && portfolioPdf.checked) {
            if (portfolioPdfDiv) portfolioPdfDiv.style.display = 'block';
        }
    }
    
    if (portfolioPhotos) portfolioPhotos.addEventListener('change', handlePortfolioChange);
    if (portfolioUrl) portfolioUrl.addEventListener('change', handlePortfolioChange);
    if (portfolioPdf) portfolioPdf.addEventListener('change', handlePortfolioChange);

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
            var cvInput = document.getElementById('careerCV');
            var needsCert = (type === 'full-time' || type === 'part-time');
            
            // Check CV is mandatory
            if (!cvInput || !cvInput.files || !cvInput.files.length) {
                alert('Please upload your CV/Resume. It is required for all applications.');
                return;
            }
            
            if (needsCert && (!certInput || !certInput.files || !certInput.files.length)) {
                alert('Please upload your certificate(s) for Full-Time and Part-Time positions.');
                return;
            }

            function readFileAsDataURL(file) {
                return new Promise(function(resolve, reject) {
                    var reader = new FileReader();
                    reader.onload = function() { resolve(reader.result); };
                    reader.onerror = function() { reject(new Error('Failed to read file')); };
                    reader.readAsDataURL(file);
                });
            }

            var certFiles = (certInput && certInput.files) ? Array.prototype.slice.call(certInput.files) : [];
            var cvFile = (cvInput && cvInput.files && cvInput.files.length) ? cvInput.files[0] : null;

            var certsPromise = Promise.resolve([]);
            if (certFiles.length) {
                certsPromise = Promise.all(certFiles.map(function(f) { return readFileAsDataURL(f).then(function(data) { return { name: f.name, data: data }; }); }));
            }

            var cvPromise = Promise.resolve(null);
            if (cvFile) {
                cvPromise = readFileAsDataURL(cvFile).then(function(data) { return { name: cvFile.name, data: data }; });
            }
            
            // Handle portfolio based on selected type
            var portfolioType = '';
            var portfolioPhotos = [];
            var portfolioUrl = '';
            var portfolioPdf = null;
            
            var photosRadio = document.getElementById('portfolioPhotos');
            var urlRadio = document.getElementById('portfolioUrl');
            var pdfRadio = document.getElementById('portfolioPdf');
            
            if (photosRadio && photosRadio.checked) {
                var photosInput = document.getElementById('portfolioPhotosInput');
                portfolioType = 'photos';
                if (photosInput && photosInput.files) {
                    var photoFiles = Array.prototype.slice.call(photosInput.files).slice(0, 10);
                    portfolioPhotos = photoFiles;
                }
            } else if (urlRadio && urlRadio.checked) {
                var urlInput = document.getElementById('portfolioUrlInput');
                portfolioType = 'url';
                portfolioUrl = (urlInput && urlInput.value) ? urlInput.value : '';
            } else if (pdfRadio && pdfRadio.checked) {
                var pdfInput = document.getElementById('portfolioPdfInput');
                portfolioType = 'pdf';
                if (pdfInput && pdfInput.files && pdfInput.files.length) {
                    portfolioPdf = pdfInput.files[0];
                }
            }

            Promise.all([certsPromise, cvPromise]).then(function(results) {
                var certificates = results[0] || [];
                var resume = results[1] || null;
                var yearOfStudyVal = '';
                var needsCampusYear = (type === 'attachment' || type === 'full-time' || type === 'part-time');
                if (needsCampusYear) {
                    var ys = document.getElementById('careerYearStart') ? document.getElementById('careerYearStart').value : '';
                    var ye = document.getElementById('careerYearEnd') ? document.getElementById('careerYearEnd').value : '';
                    if (ys && ye) yearOfStudyVal = ys + ' - ' + ye;
                    else if (ys) yearOfStudyVal = ys;
                }

                // Handle portfolio files
                var portfolioPromises = [];
                var portfolioPhotosData = [];
                
                if (portfolioType === 'photos' && portfolioPhotos.length > 0) {
                    portfolioPromises = portfolioPhotos.map(function(f) {
                        return readFileAsDataURL(f).then(function(data) { return data; });
                    });
                } else if (portfolioType === 'pdf' && portfolioPdf) {
                    portfolioPromises = [readFileAsDataURL(portfolioPdf)];
                }
                
                Promise.all(portfolioPromises).then(function(portfolioDataArray) {
                    var payload = {
                        name: document.getElementById('careerName').value,
                        email: document.getElementById('careerEmail').value,
                        phone: document.getElementById('careerPhone').value || '',
                        type: type,
                        campus: needsCampusYear ? (document.getElementById('careerCampus').value || '') : '',
                        yearOfStudy: needsCampusYear ? (yearOfStudyVal || '') : '',
                        certificates: certificates,
                        resume: resume,
                        message: document.getElementById('careerMessage').value || '',
                        portfolioType: portfolioType,
                        portfolioPhotos: portfolioType === 'photos' ? portfolioDataArray : [],
                        portfolioUrl: portfolioType === 'url' ? portfolioUrl : '',
                        portfolioPdf: portfolioType === 'pdf' ? portfolioDataArray[0] : ''
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
                            if (portfolioPhotosDiv) portfolioPhotosDiv.style.display = 'none';
                            if (portfolioUrlDiv) portfolioUrlDiv.style.display = 'none';
                            if (portfolioPdfDiv) portfolioPdfDiv.style.display = 'none';
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
                }).catch(function() {
                    alert('Could not process portfolio files. Please try again.');
                });
            }).catch(function() {
                alert('Could not read uploaded files. Please try again.');
            });
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
