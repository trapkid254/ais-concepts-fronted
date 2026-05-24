// ===== portal-script.js =====

var __portalCache = {};

function getStored(key, fallback) {
    if (__portalCache[key] !== undefined) return __portalCache[key];
    return fallback;
}

function setStored(key, value) {
    __portalCache[key] = value;
    syncPortalKey(key, value);
}

function syncPortalKey(key, value) {
    var token = sessionStorage.getItem('authToken');
    if (!token) return;
    var API_BASE = window.API_BASE || '';
    if (!syncPortalKey._timers) syncPortalKey._timers = {};
    clearTimeout(syncPortalKey._timers[key]);
    syncPortalKey._timers[key] = setTimeout(function () {
        fetch(API_BASE + '/api/portal/key/' + encodeURIComponent(key), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify(value)
        }).catch(function () {});
    }, 200);
}

async function refreshNotificationsBadge() {
    var API_BASE = window.API_BASE || '';
    var token = sessionStorage.getItem('authToken');
    if (!token) return;
    var path = window.location.pathname || '';
    try {
        var r = await fetch(API_BASE + '/api/notifications', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!r.ok) return;
        var data = await r.json();
        var unread = data.unreadCount || 0;
        if (path.indexOf('/admin/') !== -1) {
            try {
                var pr = await fetch(API_BASE + '/api/admin/pending-users', {
                    headers: { Authorization: 'Bearer ' + token }
                });
                if (pr.ok) {
                    var pending = await pr.json();
                    unread += (pending && pending.length) || 0;
                }
            } catch (e2) {}
        }
        var countEl =
            path.indexOf('/client/') !== -1
                ? document.getElementById('clientNotificationCount')
                : path.indexOf('/employee/') !== -1
                  ? document.getElementById('employeeNotificationCount')
                  : document.getElementById('adminNotificationCount');
        if (countEl) {
            if (unread > 0) {
                countEl.textContent = unread > 99 ? '99+' : String(unread);
                countEl.style.display = 'inline-block';
            } else {
                countEl.style.display = 'none';
            }
        }
    } catch (e) {}
}

async function openPortalNotificationsModal(modalId) {
    var API_BASE = window.API_BASE || '';
    var token = sessionStorage.getItem('authToken');
    var modal = document.getElementById(modalId);
    if (!modal) return;
    var listEl = modal.querySelector('.portal-notifications-list');
    if (!listEl) return;
    listEl.innerHTML = '<p class="empty-state">Loading\u2026</p>';
    try {
        var r = await fetch(API_BASE + '/api/notifications', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!r.ok) {
            listEl.innerHTML = '<p class="empty-state">Could not load notifications.</p>';
            return;
        }
        var data = await r.json();
        var items = data.items || [];
        if (!items.length) {
            listEl.innerHTML = '<p class="empty-state">No notifications yet.</p>';
        } else {
            listEl.innerHTML = items
                .map(function (n) {
                    return (
                        '<div class="notification-item' +
                        (n.read ? '' : ' notification-unread') +
                        '"><div class="notification-title">' +
                        escapeHtml(n.title || '') +
                        '</div><div class="notification-meta">' +
                        (n.createdAt ? new Date(n.createdAt).toLocaleString() : '') +
                        '</div><div class="notification-body">' +
                        escapeHtml(n.message || '') +
                        '</div></div>'
                    );
                })
                .join('');
        }
        await fetch(API_BASE + '/api/notifications/mark-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({ ids: items.map(function (x) { return x.id; }) })
        });
        await refreshNotificationsBadge();
    } catch (e) {
        listEl.innerHTML = '<p class="empty-state">Error loading notifications.</p>';
    }
    modal.classList.add('open');
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatProjectClient(client) {
    if (client == null || client === '') return '';
    if (typeof client === 'string') return client;
    if (typeof client === 'object') return client.name || client.email || '';
    return String(client);
}

function formatProjectLocation(location) {
    if (location == null || location === '') return '';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
        return location.address || location.name || '';
    }
    return String(location);
}

function getProjectClientId(client) {
    if (!client) return '';
    if (typeof client === 'string') return client;
    return String(client._id || client.id || '');
}

function formatProjectForeman(project) {
    if (!project) return 'Not Assigned';
    if (project.assignedForeman && typeof project.assignedForeman === 'object') {
        return project.assignedForeman.name || project.assignedForeman.email || 'Not Assigned';
    }
    return project.foremanName || (typeof project.assignedForeman === 'string' ? project.assignedForeman : '') || 'Not Assigned';
}

function buildProjectDetailsHtml(project, opts) {
    opts = opts || {};
    var clientStr = formatProjectClient(project.client) || 'Not specified';
    var locStr = formatProjectLocation(project.location) || 'Not specified';
    var foremanStr = formatProjectForeman(project);
    var imgSrc = (project.images && project.images[0]) || project.image || '';
    var html = '<div class="project-details-view">';
    if (imgSrc) {
        html += '<div class="project-details-hero"><img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(project.name || 'Project') + '" onerror="this.parentElement.style.display=\'none\'"></div>';
    }
    html += '<h3>' + escapeHtml(project.name || '') + '</h3>';
    if (project.description) {
        html += '<p class="project-details-desc">' + escapeHtml(project.description) + '</p>';
    }
    html += '<div class="project-info-grid">' +
        '<div class="info-item"><label>Client:</label><span>' + escapeHtml(clientStr) + '</span></div>' +
        '<div class="info-item"><label>Location:</label><span>' + escapeHtml(locStr) + '</span></div>' +
        '<div class="info-item"><label>Foreman:</label><span>' + escapeHtml(foremanStr) + '</span></div>' +
        '<div class="info-item"><label>Budget:</label><span>' + escapeHtml(project.budget != null ? String(project.budget) : 'Not specified') + '</span></div>' +
        '<div class="info-item"><label>Progress:</label><span>' + (project.progress || 0) + '%</span></div>' +
        '<div class="info-item"><label>Status:</label><span class="status-badge status-' + escapeHtml((project.status || 'Active').toLowerCase().replace(/\s+/g, '-')) + '">' + escapeHtml(project.status || 'Active') + '</span></div>' +
        '<div class="info-item"><label>Deadline:</label><span>' + escapeHtml(project.deadline || project.endDate || project.completionDate || 'Not specified') + '</span></div>' +
        '<div class="info-item"><label>Category:</label><span>' + escapeHtml(project.category || 'Commercial') + '</span></div>';
    if (project.location && typeof project.location === 'object' && project.location.latitude != null && project.location.longitude != null) {
        html += '<div class="info-item"><label>Coordinates:</label><span>' + project.location.latitude + ', ' + project.location.longitude + '</span></div>';
    }
    if (project.moneyPaid || project.moneyUsed || project.moneyRemaining || project.moneyOwed) {
        html += '<div class="info-item"><label>Money Paid:</label><span>' + escapeHtml(String(project.moneyPaid || '0')) + '</span></div>' +
            '<div class="info-item"><label>Money Used:</label><span>' + escapeHtml(String(project.moneyUsed || '0')) + '</span></div>' +
            '<div class="info-item"><label>Money Remaining:</label><span>' + escapeHtml(String(project.moneyRemaining || '0')) + '</span></div>' +
            '<div class="info-item"><label>Money Owed:</label><span>' + escapeHtml(String(project.moneyOwed || '0')) + '</span></div>';
    }
    html += '</div></div>';
    if (opts.showRequestFunds && project._id) {
        html += '<div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">' +
            '<button class="btn btn-primary" onclick="openRequestFundsModal(\'' + escapeAttr(String(project._id || project.id)) + '\')" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);">' +
            '<i class="fas fa-hand-holding-usd"></i> Request Funds</button></div>';
    }
    return html;
}

function navigatePortalSection(sectionId, opts) {
    var sidebarLink = document.querySelector('.sidebar-nav a[data-section="' + sectionId + '"]');
    if (sidebarLink) {
        sidebarLink.click();
    } else {
        document.querySelectorAll('.portal-section').forEach(function (sec) {
            sec.style.display = sec.id === sectionId ? '' : 'none';
        });
        document.querySelectorAll('.sidebar-nav a[data-section]').forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('data-section') === sectionId);
        });
    }
    if (opts && opts.filter) {
        window._employeeProjectFilter = opts.filter;
        var tab = document.querySelector('#employeeProjectFilterTabs .filter-btn[data-filter="' + opts.filter + '"]');
        if (tab) {
            document.querySelectorAll('#employeeProjectFilterTabs .filter-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            tab.classList.add('active');
        }
        var clientTab = document.querySelector('#clientProjectFilterTabs .filter-btn[data-filter="' + opts.filter + '"]');
        if (clientTab) {
            document.querySelectorAll('#clientProjectFilterTabs .filter-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            clientTab.classList.add('active');
            window._clientProjectFilter = opts.filter;
            if (typeof window.applyClientProjectFilter === 'function') window.applyClientProjectFilter();
        }
        var adminTab = document.querySelector('#adminProjectFilterTabs .filter-btn[data-filter="' + opts.filter + '"]');
        if (adminTab) {
            document.querySelectorAll('#adminProjectFilterTabs .filter-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            adminTab.classList.add('active');
            window._adminProjectFilter = opts.filter;
            if (typeof window.renderAdminProjectsTable === 'function') window.renderAdminProjectsTable();
        }
    }
    if (sectionId === 'admin-analytics' && typeof initAdminCharts === 'function') initAdminCharts();
}

// ===== HELPER FUNCTIONS =====

function escapeAttr(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function apiFetch(url, options) {
    options = options || {};
    var token = sessionStorage.getItem('authToken');
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch((window.API_BASE || '') + url, Object.assign({}, options, { headers: headers }));
}

function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    
    // Determine correct login page based on current path
    var currentPath = window.location.pathname;
    
    if (currentPath.includes('/admin/')) {
        window.location.href = '../staff/login/';
    } else if (currentPath.includes('/client/')) {
        window.location.href = '../login/';
    } else if (currentPath.includes('/employee/')) {
        window.location.href = '../staff/login/';
    } else if (currentPath.includes('/foreman/')) {
        window.location.href = '../login/';
    } else {
        // Fallback to main index
        window.location.href = '../index.html';
    }
}

function displayUserInfo(user) {
    document.querySelectorAll('.user-avatar img').forEach(function (img) {
        img.src = user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=20c4b4&color=fff&size=128';
    });
    document.querySelectorAll('.user-name').forEach(function (el) {
        el.textContent = user.name || user.email.split('@')[0];
    });
    document.querySelectorAll('.user-email').forEach(function (el) {
        el.textContent = user.email;
    });
    document.querySelectorAll('.user-role').forEach(function (el) {
        el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        el.className = 'user-role role-' + user.role;
    });
}

function getProfileKey(email) {
    return email ? 'portalProfile_' + email.replace(/[^a-z0-9]/gi, '_') : null;
}

function setupPortalProfile(portal, currentUser) {
    if (!currentUser || !currentUser.email) return;
    var key = getProfileKey(currentUser.email);
    var prof = window.__portalUserProfile || {};
    var profile = {
        name: prof.name || currentUser.name,
        email: prof.email || currentUser.email,
        phone: prof.phone || '',
        avatar: prof.avatar || currentUser.avatar,
        password: prof.password || ''
    };
    var prefix = portal === 'client' ? 'client' : portal === 'admin' ? 'admin' : 'employee';
    var nameEl = document.getElementById(prefix + 'ProfileName');
    var emailEl = document.getElementById(prefix + 'ProfileEmail');
    var phoneEl = document.getElementById(prefix + 'ProfilePhone');
    var photoEl = document.getElementById(prefix + 'ProfilePhoto');
    var photoInput = document.getElementById(prefix + 'ProfilePhotoInput');
    var form = document.getElementById(prefix + 'ProfileForm');
    if (nameEl) nameEl.value = profile.name || currentUser.name || '';
    if (emailEl) emailEl.value = profile.email || currentUser.email || '';
    if (phoneEl) phoneEl.value = profile.phone || '';
    if (photoEl) photoEl.src = profile.avatar || currentUser.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name || currentUser.email) + '&background=20c4b4&color=fff&size=128';
    if (photoInput && photoEl) {
        photoInput.addEventListener('change', function () {
            var f = this.files[0];
            if (!f) return;
            var reader = new FileReader();
            reader.onload = function () {
                photoEl.src = reader.result;
                currentUser.avatar = reader.result;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                document.querySelectorAll('.user-avatar img').forEach(function (img) { img.src = reader.result; });
            };
            reader.readAsDataURL(f);
        });
    }
    if (form && key) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById(prefix + 'ProfileName').value;
            var email = document.getElementById(prefix + 'ProfileEmail').value;
            var phone = document.getElementById(prefix + 'ProfilePhone').value;
            var newPass = document.getElementById(prefix + 'ProfileNewPassword') ? document.getElementById(prefix + 'ProfileNewPassword').value : '';
            var avatar = photoEl ? photoEl.src : profile.avatar;
            var token = sessionStorage.getItem('authToken');
            fetch((window.API_BASE || '') + '/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ name: name, email: email, phone: phone, avatar: avatar, password: newPass || undefined })
            }).then(function (r) {
                if (!r.ok) throw new Error('save failed');
                window.__portalUserProfile = { name: name, email: email, phone: phone, avatar: avatar };
                currentUser.name = name;
                currentUser.email = email;
                currentUser.avatar = avatar;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                displayUserInfo(currentUser);
                alert('Profile saved.');
            }).catch(function () {
                alert('Could not save profile. Check your connection.');
            });
        });
    }
}

// ===== DOMContentLoaded =====

document.addEventListener('DOMContentLoaded', async function () {
    // Theme initialization - default to dark
    (function() {
        var saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    })();

    // Setup notification button event listeners
    setupNotificationButtons();

    // Generic close modal
    document.body.addEventListener('click', function (e) {
        var btn = e.target.closest('.close-modal');
        if (btn && btn.getAttribute('data-close')) {
            var modal = document.getElementById(btn.getAttribute('data-close'));
            if (modal) modal.classList.remove('open');
        }
    });

    // Click-outside to close modals
    ['clientInvoiceViewModal','adminInvoiceViewModal','employeeTimeEditModal','adminInvoiceEditModal',
     'clientProjectViewModal','clientUploadDocModal','clientNotificationsModal','clientAddProjectModal',
     'employeeTaskUpdateModal','employeeNotificationsModal','adminNotificationsModal','adminBroadcastModal',
     'adminWebsiteProjectModal','adminWebsiteServiceModal','adminBlogPostModal'].forEach(function (id) {
        var m = document.getElementById(id);
        if (m) m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('open'); });
    });

    var path = window.location.pathname;
    var token = sessionStorage.getItem('authToken');
    var currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

    if (!token || !currentUser) {
        var loginPage = path.includes('/client/') ? '../client/login.html' : '../staff/login.html';
        window.location.href = loginPage;
        return;
    }

    try {
        var r = await fetch((window.API_BASE || '') + '/api/portal/bootstrap', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (r.status === 401) {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            window.location.href = path.includes('/client/') ? '../client/login.html' : '../staff/login.html';
            return;
        }
        if (r.status === 403) {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            window.location.href = (path.includes('/client/') ? '../client/login.html' : '../staff/login.html') + '?pending=1';
            return;
        }
        var data = await r.json();
        Object.keys(data).forEach(function (k) {
            if (k === 'profile') {
                window.__portalUserProfile = data.profile || {};
            } else {
                __portalCache[k] = data[k];
            }
        });
    } catch (e) {
        console.error(e);
    }

    displayUserInfo(currentUser);

    if (path.includes('/client/')) {
        loadClientDashboard();
    } else if (path.includes('/employee/')) {
        loadEmployeeDashboard();
    } else if (path.includes('/admin/')) {
        await loadAdminDashboard();
    }

    refreshNotificationsBadge();

    document.body.addEventListener('click', function (e) {
        var card = e.target.closest('.stat-card-clickable');
        if (!card) return;
        var section = card.getAttribute('data-nav-section');
        if (!section) return;
        var filter = card.getAttribute('data-nav-filter') || '';
        e.preventDefault();
        navigatePortalSection(section, filter ? { filter: filter } : {});
    });

    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) { e.preventDefault(); logout(); });
    }

    function createSidebarOverlay() {
        var overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', function () {
            var sidebar = document.querySelector('.sidebar');
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    var menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            var sidebar = document.querySelector('.sidebar');
            var overlay = document.querySelector('.sidebar-overlay') || createSidebarOverlay();
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    document.addEventListener('click', function (e) {
        var sidebar = document.querySelector('.sidebar');
        var overlay = document.querySelector('.sidebar-overlay');
        var toggle = document.getElementById('menuToggle');
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active') &&
            toggle && !sidebar.contains(e.target) && !toggle.contains(e.target) &&
            overlay && !overlay.contains(e.target)) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });

    window.addEventListener('resize', function () {
        var sidebar = document.querySelector('.sidebar');
        var overlay = document.querySelector('.sidebar-overlay');
        if (window.innerWidth > 768) {
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    });

    if (path.includes('/admin/')) {
        setupAdminInteractions(currentUser);
        setupCommunicationHub();
        setupSiteManagement();
        setupFinancialManagement();
        setupMarketingManagement();
        setupApprovalsWorkflow();
        setupFAQManagement();
    }

    if (path.includes('/employee/')) {
        setupEmployeeInteractions(currentUser);
    }

    // Sidebar navigation
    var sidebarLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    var portalSections = document.querySelectorAll('.portal-section');

    if (sidebarLinks.length && portalSections.length) {
        var firstSectionId = sidebarLinks[0] && sidebarLinks[0].getAttribute('data-section');
        portalSections.forEach(function (sec) {
            sec.style.display = sec.id === firstSectionId ? '' : 'none';
        });
        sidebarLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                var sectionId = this.getAttribute('data-section');
                document.querySelectorAll('.sidebar-nav a').forEach(function (a) { a.classList.remove('active'); });
                this.classList.add('active');
                portalSections.forEach(function (sec) {
                    sec.style.display = sec.id === sectionId ? '' : 'none';
                });
                if (sectionId === 'admin-analytics' && typeof initAdminCharts === 'function') initAdminCharts();
            });
        });
    }

    // Client portal setup
    if (path.includes('/client/')) {
        var supportForm = document.getElementById('clientSupportForm');
        if (supportForm) {
            supportForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var name = document.getElementById('supportName').value;
                var email = document.getElementById('supportEmail').value;
                var subject = document.getElementById('supportSubject').value;
                var message = document.getElementById('supportMessage').value;
                var tickets = getStored('clientSupportTickets', []);
                tickets.push({ name: name, email: email, subject: subject, message: message, date: new Date().toISOString() });
                setStored('clientSupportTickets', tickets);
                supportForm.reset();
                if (currentUser) {
                    var sn = document.getElementById('supportName');
                    var se = document.getElementById('supportEmail');
                    if (sn) sn.value = currentUser.name || '';
                    if (se) se.value = currentUser.email || '';
                }
                alert('Thank you. Your support request has been submitted. We will get back to you shortly.');
            });
        }
        var clientNotificationBtn = document.getElementById('clientNotificationBtn');
        if (clientNotificationBtn) {
            clientNotificationBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openPortalNotificationsModal('clientNotificationsModal');
            });
        }
        setupPortalProfile('client', currentUser);
    }

    if (path.includes('/admin/')) {
        var adminNotificationsBtn = document.getElementById('adminNotificationsBtn');
        if (adminNotificationsBtn) {
            adminNotificationsBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openPortalNotificationsModal('adminNotificationsModal');
            });
        }
        setupPortalProfile('admin', currentUser);
    }

    if (path.includes('/employee/')) {
        var empNotificationsBtn = document.getElementById('employeeNotificationsBtn');
        if (empNotificationsBtn) {
            empNotificationsBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openPortalNotificationsModal('employeeNotificationsModal');
            });
        }
        setupPortalProfile('employee', currentUser);
    }

    // Add Funds modal (client)
    var addFundsBtn = document.getElementById('addFundsBtn');
    var addFundsModal = document.getElementById('clientAddFundsModal');
    var addFundsForm = document.getElementById('clientAddFundsForm');
    if (addFundsBtn && addFundsModal && addFundsForm) {
        addFundsBtn.addEventListener('click', function () { addFundsModal.classList.add('open'); });
        document.querySelectorAll('[data-close="clientAddFundsModal"]').forEach(function (el) {
            el.addEventListener('click', function () { addFundsModal.classList.remove('open'); });
        });
        addFundsModal.addEventListener('click', function (e) {
            if (e.target === addFundsModal) addFundsModal.classList.remove('open');
        });
        addFundsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var amount = document.getElementById('fundsAmount').value;
            var paymentMethod = document.getElementById('fundsPaymentMethod').value;
            var transactionId = document.getElementById('fundsTransactionId').value;
            var notes = document.getElementById('fundsNotes').value;
            var urlParams = new URLSearchParams(window.location.search);
            var projectId = urlParams.get('projectId');
            if (projectId) {
                var projects = getStored('clientProjects', []);
                var project = projects.find(function (p) { return p.id === projectId; });
                if (project) {
                    var currentPaid = parseFloat((project.moneyPaid || '0').replace(/[^0-9.]/g, '')) || 0;
                    var newPaid = currentPaid + parseFloat(amount);
                    var currentRemaining = parseFloat((project.moneyRemaining || '0').replace(/[^0-9.]/g, '')) || 0;
                    var newRemaining = currentRemaining + parseFloat(amount);
                    project.moneyPaid = 'KES ' + newPaid.toLocaleString();
                    project.moneyRemaining = 'KES ' + newRemaining.toLocaleString();
                    var updatedProjects = projects.map(function (p) { return p.id === projectId ? project : p; });
                    setStored('clientProjects', updatedProjects);
                    var transactions = getStored('clientTransactions', []);
                    transactions.push({
                        id: Date.now(), projectId: projectId, projectName: project.name,
                        amount: 'KES ' + parseFloat(amount).toLocaleString(),
                        paymentMethod: paymentMethod, transactionId: transactionId,
                        notes: notes, date: new Date().toISOString(), type: 'payment'
                    });
                    setStored('clientTransactions', transactions);
                    alert('Funds added successfully! Amount: KES ' + parseFloat(amount).toLocaleString());
                    addFundsModal.classList.remove('open');
                    addFundsForm.reset();
                    viewProjectDetails(projectId);
                }
            }
        });
    }

    // Request Funds modal (admin)
    var requestFundsBtn = document.getElementById('requestFundsBtn');
    var requestFundsModal = document.getElementById('adminRequestFundsModal');
    var requestFundsForm = document.getElementById('adminRequestFundsForm');
    if (requestFundsBtn && requestFundsModal && requestFundsForm) {
        requestFundsBtn.addEventListener('click', function () { requestFundsModal.classList.add('open'); });
        document.querySelectorAll('[data-close="adminRequestFundsModal"]').forEach(function (el) {
            el.addEventListener('click', function () { requestFundsModal.classList.remove('open'); });
        });
        requestFundsModal.addEventListener('click', function (e) {
            if (e.target === requestFundsModal) requestFundsModal.classList.remove('open');
        });
        requestFundsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var projectSelect = document.getElementById('requestFundsProject');
            var projectId = projectSelect.getAttribute('data-project-id');
            var amount = document.getElementById('requestFundsAmount').value;
            var reason = document.getElementById('requestFundsReason').value;
            var description = document.getElementById('requestFundsDescription').value;
            var dueDate = document.getElementById('requestFundsDueDate').value;
            if (projectId && amount && reason && description) {
                var projects = getStored('portalProjects', []);
                var project = projects.find(function (p) { return String(p.id) === projectId; });
                if (project) {
                    var requests = getStored('adminFundRequests', []);
                    requests.push({
                        id: Date.now(), projectId: projectId, projectName: project.name,
                        clientName: project.client, clientEmail: project.clientEmail || '',
                        amount: 'KSH ' + parseFloat(amount).toLocaleString(),
                        amountValue: parseFloat(amount), reason: reason,
                        description: description, dueDate: dueDate,
                        date: new Date().toISOString(), status: 'pending'
                    });
                    setStored('adminFundRequests', requests);
                    var clientNotifications = getStored('clientNotifications', []);
                    clientNotifications.push({
                        id: Date.now(), type: 'fund_request',
                        title: 'Fund Request - ' + project.name,
                        message: 'A fund request of KSH ' + parseFloat(amount).toLocaleString() + ' has been sent for ' + project.name + '. Reason: ' + reason + '. Due date: ' + dueDate + '.',
                        amount: amount, projectName: project.name, clientName: project.client,
                        date: new Date().toISOString(), read: false
                    });
                    setStored('clientNotifications', clientNotifications);
                    var messages = getStored('portalMessages', []);
                    messages.push({
                        from: 'admin@aisconcepts.com', to: project.clientEmail || 'client',
                        project: project.name,
                        subject: 'Fund Request - KSH ' + parseFloat(amount).toLocaleString(),
                        body: 'Dear ' + project.client + ',\n\nWe are requesting funds of KSH ' + parseFloat(amount).toLocaleString() + ' for the project "' + project.name + '".\n\nReason: ' + reason + '\nDescription: ' + description + '\nDue Date: ' + dueDate + '\n\nPlease process this request at your earliest convenience.\n\nThank you,\nAIS Concepts Team',
                        timestamp: new Date().toISOString(), type: 'fund_request'
                    });
                    setStored('portalMessages', messages);
                    alert('Fund request of KSH ' + parseFloat(amount).toLocaleString() + ' sent to ' + project.client + '! The client will be notified.');
                    requestFundsModal.classList.remove('open');
                    requestFundsForm.reset();
                    if (typeof refreshNotificationsBadge === 'function') refreshNotificationsBadge();
                }
            }
        });
    }
});

// ===== ADMIN INTERACTIONS =====

function setupAdminInteractions(currentUser) {
    var adminAddClientBtn = document.getElementById('adminAddClientBtn');
    var adminAddClientForm = document.getElementById('adminAddClientForm');
    var adminClientsTableBody = document.getElementById('adminClientsTableBody');

    if (adminAddClientBtn) {
        adminAddClientBtn.addEventListener('click', function () {
            var modal = document.getElementById('adminAddClientModal');
            if (modal) modal.classList.add('open');
        });
    }

    if (adminAddClientForm) {
        adminAddClientForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('clientName').value;
            var email = document.getElementById('clientEmail').value;
            var phone = document.getElementById('clientPhone').value;
            var company = document.getElementById('clientCompany').value;
            var address = document.getElementById('clientAddress').value;
            var notes = document.getElementById('clientNotes').value;
            if (!name || !email) { alert('Please fill in at least name and email'); return; }
            var clients = getStored('portalClients', []);
            clients.push({ id: Date.now(), name: name, email: email, phone: phone, company: company, address: address, notes: notes, date: new Date().toISOString(), projects: [] });
            setStored('portalClients', clients);
            renderAdminClientsTable();
            adminAddClientForm.reset();
            document.getElementById('adminAddClientModal').classList.remove('open');
            alert('Client added successfully!');
        });
    }

    var adminAddForemanBtn = document.getElementById('adminAddForemanBtn');
    var adminForemanForm = document.getElementById('adminForemanForm');

    if (adminAddForemanBtn) {
        adminAddForemanBtn.addEventListener('click', function () {
            var modal = document.getElementById('adminForemanModal');
            if (modal) modal.classList.add('open');
        });
    }

    if (adminForemanForm) {
        adminForemanForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('adminForemanName').value;
            var id = document.getElementById('adminForemanId').value;
            var email = document.getElementById('adminForemanEmail').value;
            var phone = document.getElementById('adminForemanPhone').value;
            var password = document.getElementById('adminForemanPassword').value;
            var confirmPassword = document.getElementById('adminForemanConfirmPassword').value;
            if (password !== confirmPassword) { alert('Passwords do not match!'); return; }
            if (!name || !id || !password) { alert('Please fill in all required fields!'); return; }
            var newForeman = {
                name: name, id: id,
                email: email || (id.toLowerCase().replace(/\s/g, '') + '@aisconcepts.com'),
                phone: phone, password: password, role: 'foreman', status: 'active',
                assignedProjects: [], createdAt: new Date().toISOString()
            };
            var authToken = sessionStorage.getItem('authToken');
            fetch(window.API_BASE + '/api/foreman/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                body: JSON.stringify(newForeman)
            }).then(function (response) {
                if (!response.ok) {
                    return response.text().then(function (text) {
                        var errorData = JSON.parse(text);
                        if (errorData.error && errorData.error.includes('already exists')) {
                            throw new Error('Foreman already exists with this email or phone. Please use different credentials or update the existing foreman.');
                        }
                        throw new Error('Failed to save foreman to database: ' + response.status + ' ' + text);
                    });
                }
                return response.json();
            }).then(function () {
                var modal = document.getElementById('adminForemanModal');
                if (modal) modal.classList.remove('open');
                adminForemanForm.reset();
                renderAdminForemenTable();
                alert('Foreman created successfully!');
            }).catch(function (error) {
                console.error('Error creating foreman account:', error);
                alert('There was an issue creating the foreman account: ' + error.message);
            });
        });
    }

    renderAdminClientsTable();
    renderAdminForemenTable();

    async function renderAdminClientsTable() {
        var tbody = adminClientsTableBody;
        if (!tbody) return;
        
        // Fetch actual client users from database
        var clients = [];
        try {
            var response = await fetch((window.API_BASE || '') + '/api/admin/users?role=client', {
                headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') }
            });
            if (response.ok) {
                clients = await response.json();
            }
        } catch (e) {
            console.warn('Failed to fetch clients:', e);
        }
        
        // Filter to only show clients
        clients = clients.filter(function(u) {
            return (u.role || '').toLowerCase() === 'client';
        });
        
        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">No clients found. Clients will appear here when they register accounts.</td></tr>';
            return;
        }
        
        tbody.innerHTML = clients.map(function (client) {
            return '<tr>' +
                '<td>' + escapeHtml(client.name || client.email) + '</td>' +
                '<td>' + escapeHtml(client.email) + '</td>' +
                '<td>' + escapeHtml(client.phone || '-') + '</td>' +
                '<td>0</td>' +
                '<td>KES 0</td>' +
                '<td>' + (client.status || 'Active') + '</td>' +
                '<td>' + (client.lastLogin && client.lastLogin !== '-' ? new Date(client.lastLogin).toLocaleDateString() : 'Never') + '</td>' +
                '</tr>';
        }).join('');
        
        // Update stats
        var totalClientsCount = document.getElementById('totalClientsCount');
        if (totalClientsCount) totalClientsCount.textContent = String(clients.length);
    }

    window.editClient = function (clientId) {
        var clients = getStored('portalClients', []);
        var client = clients.find(function (c) { return c.id === clientId; });
        if (!client) return;
        document.getElementById('clientName').value = client.name || '';
        document.getElementById('clientEmail').value = client.email || '';
        document.getElementById('clientPhone').value = client.phone || '';
        document.getElementById('clientCompany').value = client.company || '';
        document.getElementById('clientAddress').value = client.address || '';
        document.getElementById('clientNotes').value = client.notes || '';
        document.getElementById('adminAddClientModal').classList.add('open');
    };

    window.deleteClient = function (clientId) {
        if (!confirm('Are you sure you want to delete this client?')) return;
        var clients = getStored('portalClients', []);
        setStored('portalClients', clients.filter(function (c) { return c.id !== clientId; }));
        renderAdminClientsTable();
        alert('Client deleted successfully!');
    };

    function renderAdminForemenTable() {
        var tbody = document.getElementById('adminForemenTableBody');
        if (!tbody) return;
        var authToken = sessionStorage.getItem('authToken');
        fetch(window.API_BASE + '/api/users?role=foreman', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        }).then(function (response) {
            if (!response.ok) throw new Error('Failed to load foremen: ' + response.status);
            return response.json();
        }).then(function (foremen) {
            if (!foremen.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">No foremen added yet. Click "Create Foreman Account" to get started.</td></tr>';
                return;
            }
            renderForemenTableData(foremen);
        }).catch(function (error) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#ff6b6b;">Error loading foremen: ' + escapeHtml(error.message) + '</td></tr>';
        });
    }

    function renderForemenTableData(foremen) {
        var tbody = document.getElementById('adminForemenTableBody');
        if (!tbody) return;
        tbody.innerHTML = foremen.map(function (foreman) {
            var fid = escapeAttr(foreman._id || foreman.id || '');
            return '<tr>' +
                '<td>' + escapeHtml(foreman.name) + '</td>' +
                '<td>' + escapeHtml(foreman.email) + '</td>' +
                '<td>' + escapeHtml(foreman.phone) + '</td>' +
                '<td>' + (foreman.assignedProjects ? foreman.assignedProjects.length : 0) + '</td>' +
                '<td><span class="status-badge status-' + escapeHtml(foreman.status || 'active') + '">' + escapeHtml(foreman.status || 'Active') + '</span></td>' +
                '<td>' + new Date(foreman.createdAt).toLocaleDateString() + '</td>' +
                '<td>' +
                '<button class="btn-icon" onclick="editForeman(\'' + fid + '\')" title="Edit foreman"><i class="fas fa-edit"></i></button> ' +
                '<button class="btn-icon" onclick="deleteForeman(\'' + fid + '\')" title="Delete foreman"><i class="fas fa-trash"></i></button>' +
                '</td></tr>';
        }).join('');
    }

    window.editForeman = function (foremanId) {
        var authToken = sessionStorage.getItem('authToken');
        fetch(window.API_BASE + '/api/users/' + foremanId, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        }).then(function (response) {
            if (!response.ok) throw new Error('Failed to load foreman data');
            return response.json();
        }).then(function (foreman) {
            document.getElementById('adminForemanName').value = foreman.name || '';
            document.getElementById('adminForemanId').value = foreman._id || foreman.id || '';
            document.getElementById('adminForemanEmail').value = foreman.email || '';
            document.getElementById('adminForemanPhone').value = foreman.phone || '';
            document.getElementById('adminForemanPassword').value = '';
            document.getElementById('adminForemanConfirmPassword').value = '';
            document.getElementById('adminForemanModal').classList.add('open');
        }).catch(function () {
            alert('Failed to load foreman data. Please try again.');
        });
    };

    window.deleteForeman = function (foremanId) {
        if (!confirm('Are you sure you want to delete this foreman?')) return;
        fetch(window.API_BASE + '/api/foreman/' + foremanId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
        }).then(function (response) {
            if (!response.ok) throw new Error('Failed to delete foreman');
            return response.json();
        }).then(function () {
            renderAdminForemenTable();
            alert('Foreman deleted successfully!');
        }).catch(function () {
            alert('Failed to delete foreman. Please try again.');
        });
    };

    // Invoices
    var newInvoiceBtn = document.getElementById('adminNewInvoiceBtn');
    var invoiceModal = document.getElementById('adminInvoiceModal');
    var invoiceForm = document.getElementById('adminInvoiceForm');
    if (newInvoiceBtn && invoiceModal) {
        newInvoiceBtn.addEventListener('click', function () { invoiceModal.classList.add('open'); });
    }
    document.querySelectorAll('[data-close="adminInvoiceModal"]').forEach(function (el) {
        el.addEventListener('click', function () { document.getElementById('adminInvoiceModal').classList.remove('open'); });
    });
    if (invoiceModal) invoiceModal.addEventListener('click', function (e) { if (e.target === invoiceModal) invoiceModal.classList.remove('open'); });
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var invoices = getStored('portalInvoices', []);
            invoices.push({
                id: Date.now(),
                number: document.getElementById('invNumber').value,
                client: document.getElementById('invClient').value,
                project: document.getElementById('invProject').value || '',
                amount: document.getElementById('invAmount').value,
                dueDate: document.getElementById('invDueDate').value,
                status: document.getElementById('invStatus').value
            });
            setStored('portalInvoices', invoices);
            renderAdminInvoices(document.getElementById('adminInvoicesBody'));
            invoiceForm.reset();
            invoiceModal.classList.remove('open');
        });
    }

    var invoiceEditModal = document.getElementById('adminInvoiceEditModal');
    var invoiceEditForm = document.getElementById('adminInvoiceEditForm');
    if (invoiceEditModal) {
        document.querySelectorAll('[data-close="adminInvoiceEditModal"]').forEach(function (el) {
            el.addEventListener('click', function () { invoiceEditModal.classList.remove('open'); });
        });
        invoiceEditModal.addEventListener('click', function (e) { if (e.target === invoiceEditModal) invoiceEditModal.classList.remove('open'); });
    }
    if (invoiceEditForm) {
        invoiceEditForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var num = document.getElementById('invEditNumber').value;
            var invoices = getStored('portalInvoices', []);
            var idx = invoices.findIndex(function (i) { return i.number === num; });
            if (idx >= 0) {
                invoices[idx] = Object.assign({}, invoices[idx], {
                    client: document.getElementById('invEditClient').value,
                    project: document.getElementById('invEditProject').value || '',
                    amount: document.getElementById('invEditAmount').value,
                    dueDate: document.getElementById('invEditDueDate').value,
                    status: document.getElementById('invEditStatus').value
                });
                setStored('portalInvoices', invoices);
                renderAdminInvoices(document.getElementById('adminInvoicesBody'));
                invoiceEditModal.classList.remove('open');
            }
        });
    }

    // Assignments
    var assignForm = document.getElementById('assignProjectForm');
    var assignmentsBody = document.getElementById('assignmentsTableBody');
    var assignments = getStored('assignments', []);
    renderAssignments(assignmentsBody, assignments);

    if (assignForm && assignmentsBody) {
        assignForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var project = document.getElementById('assignProjectName').value;
            var employeeEmail = document.getElementById('assignEmployeeEmail').value;
            var due = document.getElementById('assignDueDate').value;
            var notes = document.getElementById('assignNotes').value;
            var deadline = document.getElementById('assignDeadline') ? document.getElementById('assignDeadline').value : '';
            var clientEmailEl = document.getElementById('assignClientEmail');
            var clientEmail = clientEmailEl ? clientEmailEl.value.trim() : '';
            var updated = getStored('assignments', []);
            updated.push({ project: project, employeeEmail: employeeEmail, due: due, deadline: deadline, notes: notes, clientEmail: clientEmail || undefined });
            setStored('assignments', updated);
            renderAssignments(assignmentsBody, updated);
            assignForm.reset();
            alert('Project assigned.');
        });
    }

    // Messages
    var messages = getStored('portalMessages', []);
    var adminNotifInner = document.getElementById('adminMessagesListInner');
    if (adminNotifInner) renderMessagesAsCards(adminNotifInner, messages);

    var adminMessageForm = document.getElementById('adminMessageForm');
    if (adminMessageForm) {
        adminMessageForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var to = document.getElementById('messageTo').value;
            var project = document.getElementById('messageProject').value;
            var bodyEl = document.getElementById('messageBody');
            var body = bodyEl ? bodyEl.value : '';
            var token = sessionStorage.getItem('authToken');
            fetch((window.API_BASE || '') + '/api/admin/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ to: to, project: project, body: body })
            }).then(function (r) {
                if (!r.ok) throw new Error('fail');
                return r.json();
            }).then(function () {
                var updated = getStored('portalMessages', []);
                updated.push({ from: currentUser ? currentUser.email : 'admin', to: to, project: project, body: body, timestamp: new Date().toISOString() });
                setStored('portalMessages', updated);
                if (adminNotifInner) renderMessagesAsCards(adminNotifInner, updated);
                adminMessageForm.reset();
                refreshNotificationsBadge();
            }).catch(function () {
                alert('Could not send message.');
            });
        });
    }

    // Users
    var addUserBtn = document.getElementById('adminAddUserBtn');
    var userModal = document.getElementById('adminUserModal');
    var userForm = document.getElementById('adminUserForm');
    if (addUserBtn && userModal) {
        addUserBtn.addEventListener('click', function () {
            document.getElementById('adminUserModalTitle').textContent = 'Add User';
            document.getElementById('adminUserId').value = '';
            if (userForm) userForm.reset();
            userModal.classList.add('open');
        });
    }
    document.querySelectorAll('[data-close="adminUserModal"]').forEach(function (el) {
        el.addEventListener('click', function () { document.getElementById('adminUserModal').classList.remove('open'); });
    });
    if (userModal) userModal.addEventListener('click', function (e) { if (e.target === userModal) userModal.classList.remove('open'); });
    if (userForm && userModal) {
        userForm.addEventListener('submit', function (e) {
            e.preventDefault();
            alert('Users are created when they register on the Client login or Staff (employee) pages. Approve them under Pending approvals. This form is for reference only.');
            userModal.classList.remove('open');
        });
    }

    // Projects
    var newProjectBtn = document.getElementById('adminNewProjectBtn');
    var projectModal = document.getElementById('adminProjectModal');
    var projectForm = document.getElementById('adminProjectForm');
    var selectedForemanDisplay = document.getElementById('selectedForemanDisplay');
    var selectedForemanNameEl = document.querySelector('.selected-foreman-name');
    var selectedForeman = null;

    // Load clients for project creation dropdown
    function loadClientsForProject() {
        var clientSelect = document.getElementById('adminProjectClient');
        if (!clientSelect) return;
        
        fetch((window.API_BASE || '') + '/api/users?role=client&status=approved', {
            headers: { 'Authorization': 'Bearer ' + (sessionStorage.getItem('authToken') || '') }
        }).then(function(r) {
            if (!r.ok) throw new Error('Failed to load clients');
            return r.json();
        }).then(function(clients) {
            clientSelect.innerHTML = '<option value="">Select a client</option>';
            clients.forEach(function(client) {
                var option = document.createElement('option');
                option.value = client._id;
                option.textContent = client.name + ' (' + client.email + ')';
                clientSelect.appendChild(option);
            });
        }).catch(function(err) {
            console.error('Error loading clients:', err);
        });
    }

    if (newProjectBtn && projectModal) {
        newProjectBtn.addEventListener('click', function () {
            document.getElementById('adminProjectModalTitle').textContent = 'New Project';
            document.getElementById('adminProjectId').value = '';
            if (projectForm) projectForm.reset();
            selectedForeman = null;
            if (selectedForemanDisplay) selectedForemanDisplay.style.display = 'none';
            if (selectedForemanNameEl) selectedForemanNameEl.textContent = '';
            document.getElementById('projectLocationName').value = '';
            document.getElementById('projectLatitude').value = '';
            document.getElementById('projectLongitude').value = '';
            loadClientsForProject();
            projectModal.classList.add('open');
        });
    }
    var projectExitBtn = document.getElementById('adminProjectExitBtn');
    if (projectExitBtn && projectModal) {
        projectExitBtn.addEventListener('click', function () { projectModal.classList.remove('open'); });
    }
    document.querySelectorAll('[data-close="adminProjectModal"]').forEach(function (el) {
        el.addEventListener('click', function () { document.getElementById('adminProjectModal').classList.remove('open'); });
    });
    if (projectModal) projectModal.addEventListener('click', function (e) { if (e.target === projectModal) projectModal.classList.remove('open'); });

    // Broadcast modal
    var broadcastModal = document.getElementById('adminBroadcastModal');
    var broadcastForm = document.getElementById('adminBroadcastForm');
    document.querySelectorAll('[data-close="adminBroadcastModal"]').forEach(function (el) {
        el.addEventListener('click', function () { if (broadcastModal) broadcastModal.classList.remove('open'); });
    });
    if (broadcastModal) {
        broadcastModal.addEventListener('click', function (e) { if (e.target === broadcastModal) broadcastModal.classList.remove('open'); });
    }
    if (broadcastForm && broadcastModal) {
        broadcastForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var pid = document.getElementById('broadcastProjectId').value;
            var pname = document.getElementById('broadcastProjectName').value;
            var cemail = document.getElementById('broadcastClientEmail').value;
            var msg = document.getElementById('broadcastMessage').value;
            var fileInput = document.getElementById('broadcastImages');
            var files = fileInput && fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
            var token = sessionStorage.getItem('authToken');
            function send(imgs) {
                fetch((window.API_BASE || '') + '/api/admin/client-progress-broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify({ projectId: pid, projectName: pname, clientEmail: cemail, message: msg, images: imgs || [] })
                }).then(function (r) {
                    if (!r.ok) throw new Error('fail');
                    return r.json();
                }).then(function () {
                    broadcastModal.classList.remove('open');
                    broadcastForm.reset();
                    refreshNotificationsBadge();
                    alert('Update sent to client.');
                }).catch(function () {
                    alert('Could not send. Ensure client email is set.');
                });
            }
            if (files.length) {
                Promise.all(files.map(function (file) {
                    return new Promise(function (resolve) {
                        var reader = new FileReader();
                        reader.onload = function () { resolve(reader.result); };
                        reader.readAsDataURL(file);
                    });
                })).then(send);
            } else {
                send([]);
            }
        });
    }

    // Foreman selection in project form
    if (projectForm) {
        var selectForemanBtn = document.getElementById('selectForemanBtn');
        var foremanSelectionModal = document.getElementById('foremanSelectionModal');
        var pickExistingForeman = document.getElementById('pickExistingForeman');
        var createNewForeman = document.getElementById('createNewForeman');
        var pickExistingForemanModal = document.getElementById('pickExistingForemanModal');
        var createNewForemanModal = document.getElementById('createNewForemanModal');
        var removeForemanBtn = document.getElementById('removeForemanBtn');

        function updateSelectedForemanDisplay(foreman) {
            if (selectedForemanDisplay && selectedForemanNameEl) {
                selectedForemanNameEl.textContent = foreman.name;
                selectedForemanDisplay.style.display = 'block';
            }
        }

        if (selectForemanBtn) {
            selectForemanBtn.addEventListener('click', function () {
                if (foremanSelectionModal) foremanSelectionModal.classList.add('open');
            });
        }
        if (pickExistingForeman) {
            pickExistingForeman.addEventListener('click', function () {
                if (foremanSelectionModal) foremanSelectionModal.classList.remove('open');
                if (pickExistingForemanModal) {
                    loadExistingForemen();
                    pickExistingForemanModal.classList.add('open');
                }
            });
        }
        if (createNewForeman) {
            createNewForeman.addEventListener('click', function () {
                if (foremanSelectionModal) foremanSelectionModal.classList.remove('open');
                if (createNewForemanModal) createNewForemanModal.classList.add('open');
            });
        }
        if (removeForemanBtn) {
            removeForemanBtn.addEventListener('click', function () {
                selectedForeman = null;
                if (selectedForemanDisplay) selectedForemanDisplay.style.display = 'none';
                if (selectedForemanNameEl) selectedForemanNameEl.textContent = '';
            });
        }

        async function loadExistingForemen() {
            var foremenList = document.getElementById('existingForemenList');
            if (!foremenList) return;
            foremenList.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">Loading foremen...</p>';
            try {
                var authToken = sessionStorage.getItem('authToken');
                var response = await fetch(window.API_BASE + '/api/users?role=foreman', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                var foremen = response.ok ? (await response.json()) : getStored('portalUsers', []).filter(function (u) { return u.role === 'foreman'; });
                displayForemen(foremen);
            } catch (error) {
                var foremen = getStored('portalUsers', []).filter(function (u) { return u.role === 'foreman'; });
                displayForemen(foremen);
            }
        }

        function displayForemen(foremen) {
            var foremenList = document.getElementById('existingForemenList');
            if (!foremenList) return;
            if (!foremen.length) {
                foremenList.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">No foremen found in the system</p>';
                return;
            }
            foremenList.innerHTML = '';
            foremen.forEach(function (foreman) {
                var item = document.createElement('div');
                item.className = 'foreman-item';
                item.innerHTML =
                    '<div class="foreman-avatar">' + foreman.name.charAt(0).toUpperCase() + '</div>' +
                    '<div class="foreman-info"><div class="foreman-name">' + escapeHtml(foreman.name) + '</div>' +
                    '<div class="foreman-details">ID: ' + escapeHtml(foreman.id || '') + ' | ' + escapeHtml(foreman.email || 'No email') + '</div></div>' +
                    '<div class="foreman-status">' + escapeHtml(foreman.status || 'Active') + '</div>';
                item.addEventListener('click', function () {
                    document.querySelectorAll('.foreman-item').forEach(function (i) { i.classList.remove('selected'); });
                    item.classList.add('selected');
                    selectedForeman = foreman;
                    updateSelectedForemanDisplay(foreman);
                    if (pickExistingForemanModal) pickExistingForemanModal.classList.remove('open');
                });
                foremenList.appendChild(item);
            });
        }

        var createNewForemanForm = document.getElementById('createNewForemanForm');
        if (createNewForemanForm) {
            createNewForemanForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var name = document.getElementById('newForemanName').value;
                var id = document.getElementById('newForemanId').value;
                var email = document.getElementById('newForemanEmail').value;
                var phone = document.getElementById('newForemanPhone').value;
                var password = document.getElementById('newForemanPassword').value;
                var confirmPassword = document.getElementById('newForemanConfirmPassword').value;
                if (password !== confirmPassword) { alert('Passwords do not match!'); return; }
                var newForemanObj = {
                    name: name, id: id,
                    email: email || (id.toLowerCase().replace(/\s/g, '') + '@aisconcepts.com'),
                    phone: phone, password: password, role: 'foreman', status: 'active',
                    assignedProjects: [], createdAt: new Date().toISOString()
                };
                var users = getStored('portalUsers', []);
                users.push(newForemanObj);
                setStored('portalUsers', users);
                selectedForeman = newForemanObj;
                updateSelectedForemanDisplay(newForemanObj);
                if (createNewForemanModal) createNewForemanModal.classList.remove('open');
                createNewForemanForm.reset();
                alert('Foreman created successfully!');
            });
        }

        projectForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var projectName = document.getElementById('adminProjectName').value;
            var projectClient = document.getElementById('adminProjectClient').value;
            var projectLocationName = document.getElementById('projectLocationName').value;
            if (!projectName || !projectClient || !projectLocationName) {
                alert('Please fill in all required fields: Project Name, Client, and Location Name.');
                return;
            }
            var shouldCreateForemanAccount = document.getElementById('createForemanAccount') && document.getElementById('createForemanAccount').checked;
            if (shouldCreateForemanAccount && !selectedForeman) {
                alert('Please select a foreman before creating a foreman account.');
                return;
            }
            if (shouldCreateForemanAccount && selectedForeman) {
                var fName = selectedForeman.name || selectedForeman.fullName || '';
                var fId = selectedForeman.id || selectedForeman._id || selectedForeman.username || '';
                if (!fName || !fId) {
                    alert('Selected foreman is missing required information (name and ID are required).');
                    return;
                }
            }

            var id = document.getElementById('adminProjectId').value;
            var name = document.getElementById('adminProjectName').value;
            var client = document.getElementById('adminProjectClient').value;
            var locationName = document.getElementById('projectLocationName').value;
            var latitude = document.getElementById('projectLatitude').value;
            var longitude = document.getElementById('projectLongitude').value;
            var location = { name: locationName, latitude: latitude || null, longitude: longitude || null };
            var budget = document.getElementById('adminProjectBudget').value || 'KSH 0';
            var deadline = document.getElementById('adminProjectDeadline') ? document.getElementById('adminProjectDeadline').value : '';
            var assignedForeman = selectedForeman ? {
                name: selectedForeman.name || selectedForeman.fullName || '',
                id: selectedForeman.id || selectedForeman._id || selectedForeman.username || '',
                email: selectedForeman.email || ''
            } : null;
            var progress = document.getElementById('adminProjectProgress') ? document.getElementById('adminProjectProgress').value : 0;
            var status = document.getElementById('adminProjectStatus').value;
            var category = document.getElementById('adminProjectCategory') ? document.getElementById('adminProjectCategory').value : 'Commercial';
            var moneyPaid = document.getElementById('adminProjectMoneyPaid') ? document.getElementById('adminProjectMoneyPaid').value : '';
            var moneyUsed = document.getElementById('adminProjectMoneyUsed') ? document.getElementById('adminProjectMoneyUsed').value : '';
            var moneyRemaining = document.getElementById('adminProjectMoneyRemaining') ? document.getElementById('adminProjectMoneyRemaining').value : '';
            var moneyOwed = document.getElementById('adminProjectMoneyOwed') ? document.getElementById('adminProjectMoneyOwed').value : '';
            
            var imageInput = document.getElementById('adminProjectImages');
            var images = imageInput && imageInput.files ? Array.prototype.slice.call(imageInput.files) : [];
            
            var authToken = sessionStorage.getItem('authToken');
            
            // Create FormData for file upload
            var formData = new FormData();
            formData.append('name', name);
            formData.append('client', client);
            formData.append('location', JSON.stringify(location));
            formData.append('budget', budget);
            formData.append('deadline', deadline);
            formData.append('assignedForeman', JSON.stringify(assignedForeman));
            formData.append('progress', progress || 0);
            formData.append('status', status);
            formData.append('category', category);
            formData.append('moneyPaid', moneyPaid);
            formData.append('moneyUsed', moneyUsed);
            formData.append('moneyRemaining', moneyRemaining);
            formData.append('moneyOwed', moneyOwed);
            formData.append('createForemanAccount', shouldCreateForemanAccount);
            
            // Add images to FormData
            images.forEach(function(image) {
                formData.append('images', image);
            });
            
            if (id) {
                // Update existing project
                fetch(window.API_BASE + '/api/projects/' + id, {
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + authToken },
                    body: formData
                }).then(function(response) {
                    if (!response.ok) throw new Error('Failed to update project');
                    return response.json();
                }).then(function(updatedProject) {
                    alert('Project updated successfully!');
                    renderAdminProjectsTable();
                    projectModal.classList.remove('open');
                }).catch(function(error) {
                    console.error('Update project error:', error);
                    alert('Failed to update project: ' + error.message);
                });
            } else {
                // Create new project
                fetch(window.API_BASE + '/api/projects', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + authToken },
                    body: formData
                }).then(function(response) {
                    if (!response.ok) {
                        return response.json().then(function(errData) {
                            throw new Error(errData.error || errData.details || 'Failed to create project');
                        }).catch(function(parseErr) {
                            if (parseErr.message && parseErr.message !== 'Failed to create project') throw parseErr;
                            throw new Error('Failed to create project (status ' + response.status + ')');
                        });
                    }
                    return response.json();
                }).then(function(newProject) {
                    alert('Project created successfully!');
                    renderAdminProjectsTable();
                    projectModal.classList.remove('open');
                }).catch(function(error) {
                    console.error('Create project error:', error);
                    alert('Failed to create project: ' + error.message);
                });
            }

            if (shouldCreateForemanAccount && selectedForeman && !(selectedForeman._id || selectedForeman.approvalStatus === 'approved')) {
                var foremanData = {
                    name: selectedForeman.name || '', username: selectedForeman.id || '',
                    email: selectedForeman.email || ((selectedForeman.id || '').toLowerCase().replace(/\s/g, '') + '@aisconcepts.com'),
                    password: selectedForeman.password || 'Temp123!',
                    role: 'foreman', assignedProjects: [name], phone: selectedForeman.phone || ''
                };
                var authToken = sessionStorage.getItem('authToken');
                fetch(window.API_BASE + '/api/auth/register-employee', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                    body: JSON.stringify(foremanData)
                }).then(function (response) {
                    if (!response.ok && response.status !== 400) throw new Error('Failed to create foreman account: ' + response.status);
                    return response.json();
                }).then(function () {
                    alert('Project "' + name + '" saved and foreman account created for ' + foremanData.name + '!');
                }).catch(function (error) {
                    alert('There was an issue creating the foreman account: ' + error.message);
                });
            } else if (shouldCreateForemanAccount && selectedForeman && (selectedForeman._id || selectedForeman.approvalStatus === 'approved')) {
                alert('Project "' + name + '" saved. Foreman ' + (selectedForeman.name || '') + ' already has an account.');
            }

            renderAdminProjectsTable();
            projectModal.classList.remove('open');
        });
    }
}

// ===== ADMIN PROJECT HELPERS =====

window.deleteUser = async function (userId) {
    if (!confirm('Permanently delete this user from the database?')) return;
    var token = sessionStorage.getItem('authToken');
    try {
        var r = await fetch((window.API_BASE || '') + '/api/admin/users/' + encodeURIComponent(userId), {
            method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
        });
        if (!r.ok) {
            var err = await r.json().catch(function () { return {}; });
            alert(err.error || 'Could not delete user.');
            return;
        }
        __portalCache.portalUsers = (__portalCache.portalUsers || []).filter(function (u) { return String(u.id) !== String(userId); });
        renderAdminUsers(document.querySelector('.users-list tbody'), __portalCache.portalUsers);
    } catch (e) {
        alert('Could not delete user.');
    }
};

window.editProject = function (projectId) {
    fetch(window.API_BASE + '/api/projects', {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
    }).then(function (r) {
        if (!r.ok) throw new Error('Failed to load projects');
        return r.json();
    }).then(function (projects) {
        var project = projects.find(function (p) { return String(p._id || p.id) === projectId; });
        if (!project) return;
        document.getElementById('adminProjectModalTitle').textContent = 'Edit Project';
        document.getElementById('adminProjectId').value = project._id || project.id || '';
        document.getElementById('adminProjectName').value = project.name || '';
        document.getElementById('adminProjectClient').value = getProjectClientId(project.client);
        document.getElementById('adminProjectBudget').value = project.budget || '';
        document.getElementById('adminProjectProgress').value = project.progress || 0;
        if (document.getElementById('adminProjectCategory')) document.getElementById('adminProjectCategory').value = project.category || 'Commercial';
        document.getElementById('adminProjectStatus').value = project.status || 'active';
        if (document.getElementById('adminProjectDeadline')) document.getElementById('adminProjectDeadline').value = project.deadline || project.completionDate || '';
        if (project.location && typeof project.location === 'object') {
            document.getElementById('projectLocationName').value = formatProjectLocation(project.location);
            document.getElementById('projectLatitude').value = project.location.latitude || '';
            document.getElementById('projectLongitude').value = project.location.longitude || '';
        } else {
            document.getElementById('projectLocationName').value = project.location || '';
            document.getElementById('projectLatitude').value = '';
            document.getElementById('projectLongitude').value = '';
        }
        if (document.getElementById('adminProjectMoneyPaid')) document.getElementById('adminProjectMoneyPaid').value = project.moneyPaid || '';
        if (document.getElementById('adminProjectMoneyUsed')) document.getElementById('adminProjectMoneyUsed').value = project.moneyUsed || '';
        if (document.getElementById('adminProjectMoneyRemaining')) document.getElementById('adminProjectMoneyRemaining').value = project.moneyRemaining || '';
        if (document.getElementById('adminProjectMoneyOwed')) document.getElementById('adminProjectMoneyOwed').value = project.moneyOwed || '';
        var sfd = document.getElementById('selectedForemanDisplay');
        var sfn = document.querySelector('.selected-foreman-name');
        if (project.assignedForeman && sfd && sfn) {
            sfn.textContent = project.assignedForeman.name;
            sfd.style.display = 'block';
        } else if (sfd) {
            sfd.style.display = 'none';
        }
        document.getElementById('adminProjectModal').classList.add('open');
    }).catch(function (error) {
        console.error(error);
        alert('Failed to load project details. Please try again.');
    });
};

window.viewProjectDetails = function (projectId) {
    var isClientPortal = window.location.pathname.indexOf('/client/') !== -1;
    var listUrl = window.API_BASE + '/api/projects' + (isClientPortal ? '?client=true' : '');
    fetch(listUrl, {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
    }).then(function (r) {
        if (!r.ok) throw new Error('Failed to load projects');
        return r.json();
    }).then(function (projects) {
        var project = projects.find(function (p) { return String(p._id || p.id) === String(projectId); });
        var modal = document.getElementById(isClientPortal ? 'clientProjectViewModal' : 'adminViewProjectModal');
        var content = document.getElementById(isClientPortal ? 'clientProjectViewContent' : 'adminViewProjectContent');
        if (!modal || !content) return;
        if (!project) { content.innerHTML = '<p>Project not found.</p>'; modal.classList.add('open'); return; }
        content.innerHTML = buildProjectDetailsHtml(project, { showRequestFunds: !isClientPortal });
        modal.classList.add('open');
    }).catch(function (error) {
        console.error(error);
        alert('Failed to load project details. Please try again.');
    });
};

window.viewProject = function (projectId) {
    var projects = getStored('portalProjects', []);
    var project = projects.find(function (p) { return p.id === projectId; });
    if (!project) return;
    var content = document.getElementById('adminViewProjectContent');
    if (content) {
        content.innerHTML =
            '<p><strong>Name:</strong> ' + escapeHtml(project.name) + '</p>' +
            '<p><strong>Client:</strong> ' + escapeHtml(formatProjectClient(project.client)) + '</p>' +
            '<p><strong>Location:</strong> ' + escapeHtml(formatProjectLocation(project.location) || '-') + '</p>' +
            '<p><strong>Foreman:</strong> ' + escapeHtml(formatProjectForeman(project)) + '</p>' +
            '<p><strong>Budget:</strong> ' + escapeHtml(project.budget || '-') + '</p>' +
            '<p><strong>Progress:</strong> ' + (project.progress || 0) + '%</p>' +
            '<p><strong>Deadline:</strong> ' + escapeHtml(project.deadline || '-') + '</p>' +
            '<p><strong>Status:</strong> ' + escapeHtml(project.status) + '</p>';
        document.getElementById('adminViewProjectModal').classList.add('open');
    }
};

window.viewProjectWorkers = function (projectId) {
    fetch(window.API_BASE + '/api/projects/' + projectId + '/workers', {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
    }).then(function (response) { return response.json(); })
    .then(function (data) {
        var workers = data.workers || [];
        var totalPayroll = workers.reduce(function (sum, w) { return sum + (parseFloat(w.dailyRate || 0)); }, 0);
        var content = document.getElementById('adminViewProjectContent');
        if (!content) return;
        content.innerHTML = '<h3>Workers (' + workers.length + ')</h3>' +
            '<div style="max-height:300px;overflow-y:auto;">' +
            '<table style="width:100%;border-collapse:collapse;">' +
            '<thead><tr><th>Name</th><th>ID</th><th>Phone</th><th>Daily Rate</th><th>Status</th><th>Actions</th></tr></thead>' +
            '<tbody>' +
            workers.map(function (w) {
                return '<tr>' +
                    '<td>' + escapeHtml(w.name || '-') + '</td>' +
                    '<td>' + escapeHtml(w.nationalId || '-') + '</td>' +
                    '<td>' + escapeHtml(w.phone || '-') + '</td>' +
                    '<td>$' + escapeHtml(w.dailyRate || '0') + '</td>' +
                    '<td><span class="status-badge status-' + escapeHtml(w.status || 'active') + '">' + escapeHtml(w.status || 'Active') + '</span></td>' +
                    '<td>' +
                    '<button class="btn btn-sm" onclick="editWorker(\'' + escapeAttr(w._id) + '\')">Edit</button> ' +
                    '<button class="btn btn-sm btn-danger" onclick="removeWorker(\'' + escapeAttr(w._id) + '\')">Remove</button>' +
                    '</td></tr>';
            }).join('') +
            '</tbody></table>' +
            '<div style="margin-top:20px;"><p><strong>Total Workers:</strong> ' + workers.length + '</p>' +
            '<p><strong>Total Daily Payroll:</strong> $' + totalPayroll.toFixed(2) + '</p></div></div>';
        document.getElementById('adminViewProjectModal').classList.add('open');
    }).catch(function () {
        var content = document.getElementById('adminViewProjectContent');
        if (content) content.innerHTML = '<p>Error loading workers data.</p>';
    });
};

window.deleteProject = function (projectId) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    var authToken = sessionStorage.getItem('authToken');
    console.log('Deleting project with ID:', projectId);
    
    // First check if project exists in database
    fetch(window.API_BASE + '/api/projects/' + projectId, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + authToken }
    }).then(function (response) {
        if (!response.ok) {
            if (response.status === 404) {
                // Project not in database, clear from localStorage only
                console.log('Project not in database, clearing from localStorage');
                var projects = getStored('portalProjects', []);
                setStored('portalProjects', projects.filter(function (p) { return String(p._id || p.id) !== String(projectId); }));
                renderAdminProjectsTable();
                alert('Project removed from local storage (not found in database).');
                return;
            }
            throw new Error('Failed to verify project existence');
        }
        return response.json();
    }).then(function (project) {
        if (!project) return; // Already handled in 404 case
        console.log('Project found, proceeding with deletion:', project.name);
        // Project exists, now delete it
        return fetch(window.API_BASE + '/api/projects/' + projectId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }
        });
    }).then(function (response) {
        if (!response) return; // Already handled
        console.log('Delete response status:', response.status);
        if (!response.ok) {
            return response.json().then(function (err) {
                throw new Error(err.error || 'Failed to delete project');
            });
        }
        return response.json();
    }).then(function () {
        var projects = getStored('portalProjects', []);
        setStored('portalProjects', projects.filter(function (p) { return String(p._id || p.id) !== String(projectId); }));
        renderAdminProjectsTable();
        alert('Project deleted successfully!');
    }).catch(function (error) {
        console.error('Delete project error:', error);
        alert('Failed to delete project: ' + error.message);
    });
};

window.openRequestFundsModal = function (projectId) {
    var projects = getStored('portalProjects', []);
    var project = projects.find(function (p) { return String(p.id) === String(projectId); });
    if (!project) return;
    var modal = document.getElementById('adminRequestFundsModal');
    if (!modal) return;
    var projEl = document.getElementById('requestFundsProject');
    if (projEl) { projEl.value = project.name || ''; projEl.setAttribute('data-project-id', projectId); }
    var today = new Date().toISOString().split('T')[0];
    var dueDateEl = document.getElementById('requestFundsDueDate');
    if (dueDateEl) dueDateEl.setAttribute('min', today);
    var viewModal = document.getElementById('adminViewProjectModal');
    if (viewModal) viewModal.classList.remove('open');
    modal.classList.add('open');
};

window.openAdminBroadcastModal = function (projectId) {
    var projects = getStored('portalProjects', []);
    var p = projects.find(function (x) { return String(x.id) === String(projectId); });
    if (!p) return;
    var modal = document.getElementById('adminBroadcastModal');
    if (!modal) return;
    document.getElementById('broadcastProjectId').value = p.id;
    document.getElementById('broadcastProjectName').value = p.name || '';
    var clientEmailEl = document.getElementById('broadcastClientEmail');
    if (clientEmailEl) clientEmailEl.value = (p.client && p.client.indexOf('@') !== -1) ? p.client : '';
    document.getElementById('broadcastMessage').value = '';
    var imgs = document.getElementById('broadcastImages');
    if (imgs) imgs.value = '';
    modal.classList.add('open');
};

window.openAssignEmployeeModal = function (projectId) {
    var modal = document.getElementById('assignEmployeeModal');
    if (!modal) return;
    
    // Load project details
    fetch(window.API_BASE + '/api/projects/' + projectId, {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
    }).then(function (response) {
        if (!response.ok) throw new Error('Failed to load project');
        return response.json();
    }).then(function (project) {
        document.getElementById('assignEmployeeProjectId').value = projectId;
        document.getElementById('assignEmployeeProjectName').value = project.name || '';
        
        // Load employees
        return fetch(window.API_BASE + '/api/admin/users?role=employee', {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
        });
    }).then(function (response) {
        if (!response.ok) throw new Error('Failed to load employees');
        return response.json();
    }).then(function (employees) {
        var employeeSelect = document.getElementById('assignEmployeeSelect');
        employeeSelect.innerHTML = '<option value="">Select an employee</option>';
        employees.forEach(function (employee) {
            var option = document.createElement('option');
            option.value = employee._id;
            option.textContent = employee.name + ' (' + employee.email + ')';
            employeeSelect.appendChild(option);
        });
        
        modal.classList.add('open');
    }).catch(function (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please try again.');
    });
};

window.viewProjectEmployees = function (projectId) {
    var modal = document.getElementById('viewProjectEmployeesModal');
    var content = document.getElementById('viewProjectEmployeesContent');
    if (!modal || !content) return;
    
    fetch(window.API_BASE + '/api/projects/' + projectId, {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
    }).then(function (response) {
        if (!response.ok) throw new Error('Failed to load project');
        return response.json();
    }).then(function (project) {
        var employees = project.assignedEmployees || [];
        if (employees.length === 0) {
            content.innerHTML = '<p style="text-align:center;padding:20px;">No employees assigned to this project yet.</p>';
        } else {
            content.innerHTML = '<table class="data-table"><thead><tr><th>Employee Name</th><th>Duties</th><th>Assigned Date</th><th>Actions</th></tr></thead><tbody>' +
                employees.map(function (assignment) {
                    return '<tr>' +
                        '<td>' + escapeHtml(assignment.employeeName || '') + '</td>' +
                        '<td>' + escapeHtml(assignment.duties || '-') + '</td>' +
                        '<td>' + (assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : '-') + '</td>' +
                        '<td>' +
                        '<button class="btn-icon" onclick="removeEmployeeFromProject(\'' + projectId + '\',\'' + assignment.employeeId + '\')" title="Remove"><i class="fas fa-trash"></i></button>' +
                        '</td></tr>';
                }).join('') + '</tbody></table>';
        }
        modal.classList.add('open');
    }).catch(function (error) {
        console.error('Error loading employees:', error);
        alert('Failed to load employees. Please try again.');
    });
};

window.removeEmployeeFromProject = function (projectId, employeeId) {
    if (!confirm('Are you sure you want to remove this employee from the project?')) return;
    
    fetch(window.API_BASE + '/api/projects/' + projectId + '/employees/' + employeeId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
    }).then(function (response) {
        if (!response.ok) throw new Error('Failed to remove employee');
        return response.json();
    }).then(function () {
        alert('Employee removed successfully!');
        viewProjectEmployees(projectId);
        renderAdminProjectsTable();
    }).catch(function (error) {
        console.error('Error removing employee:', error);
        alert('Failed to remove employee. Please try again.');
    });
};

// Assign Employee Form Submission
var assignEmployeeForm = document.getElementById('assignEmployeeForm');
if (assignEmployeeForm) {
    assignEmployeeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        
        var projectId = document.getElementById('assignEmployeeProjectId').value;
        var employeeId = document.getElementById('assignEmployeeSelect').value;
        var duties = document.getElementById('assignEmployeeDuties').value;
        
        if (!employeeId) {
            alert('Please select an employee');
            return;
        }
        
        fetch(window.API_BASE + '/api/projects/' + projectId + '/assign-employee', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('authToken')
            },
            body: JSON.stringify({
                employeeId: employeeId,
                duties: duties
            })
        }).then(function (response) {
            if (!response.ok) throw new Error('Failed to assign employee');
            return response.json();
        }).then(function (data) {
            alert('Employee assigned successfully!');
            document.getElementById('assignEmployeeModal').classList.remove('open');
            assignEmployeeForm.reset();
            renderAdminProjectsTable();
        }).catch(function (error) {
            console.error('Error assigning employee:', error);
            alert('Failed to assign employee. Please try again.');
        });
    });
}

window.adminAssignProjectPrefill = function (projectName, clientEmail) {
    navigatePortalSection('admin-assignments', {});
    var sel = document.getElementById('assignProjectName');
    if (sel && projectName) {
        var opt = Array.prototype.slice.call(sel.options).find(function (o) { return o.value === projectName; });
        if (!opt) {
            var o = document.createElement('option');
            o.value = projectName; o.textContent = projectName;
            sel.appendChild(o);
        }
        sel.value = projectName;
    }
    var ce = document.getElementById('assignClientEmail');
    if (ce && clientEmail) ce.value = clientEmail;
};

window.adminInvoicePrefill = function (client, projectName) {
    var modal = document.getElementById('adminInvoiceModal');
    var invClient = document.getElementById('invClient');
    var invProject = document.getElementById('invProject');
    if (invClient) invClient.value = client || '';
    if (invProject) invProject.value = projectName || '';
    if (modal) modal.classList.add('open');
};

window.openProjectInquiryModal = function (projectId, projectName) {
    var modal = document.getElementById('clientProjectInquiryModal');
    if (!modal) return;
    document.getElementById('inquiryProjectId').value = projectId;
    document.getElementById('inquiryProjectName').value = projectName;
    modal.classList.add('open');
};

// ===== RENDER HELPERS =====

function renderAdminUsers(tbody, users) {
    if (!tbody) return;
    var list = users && users.length ? users : [];
    tbody.innerHTML = list.length ? list.map(function (user) {
        var rid = String(user.id).replace(/'/g, "\\'");
        return '<tr>' +
            '<td>' + escapeHtml(user.name || '') + '</td>' +
            '<td>' + escapeHtml(user.email || '') + '</td>' +
            '<td><span class="user-role role-' + String(user.role || '').toLowerCase().replace(/\s+/g, '') + '">' + escapeHtml(user.role || '') + '</span></td>' +
            '<td><span class="status-badge status-' + String(user.status || 'Active').toLowerCase().replace(/\s+/g, '') + '">' + escapeHtml(user.status || 'Active') + '</span></td>' +
            '<td>' + (user.lastLogin && user.lastLogin !== '-' ? new Date(user.lastLogin).toLocaleString() : user.lastLogin || '-') + '</td>' +
            '<td>' +
            '<button type="button" class="btn-icon" onclick="editUser(\'' + rid + '\')"><i class="fas fa-edit"></i></button> ' +
            '<button type="button" class="btn-icon" onclick="deleteUser(\'' + rid + '\')"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="6">No users yet. Approved clients and employees appear here after registration.</td></tr>';
}

function adminPortalProjectGroup(p) {
    var s = (p.status || '').toLowerCase();
    if (s.indexOf('complete') !== -1) return 'completed';
    if (s === 'pending' || s === 'review') return 'pending';
    return 'ongoing';
}

function renderAdminProjects(tbody, projects) {
    if (!tbody) return;
    __portalCache.portalProjects = projects && projects.length ? projects : getStored('portalProjects', []);
    window.renderAdminProjectsTable();
}

window.renderAdminProjectsTable = function () {
    var tbody = document.querySelector('.admin-projects tbody');
    if (!tbody) return;
    fetch(window.API_BASE + '/api/projects', {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
    }).then(function (response) {
        if (!response.ok) throw new Error('Failed to load projects');
        return response.json();
    }).then(function (projects) {
        // Clear localStorage projects that aren't in database
        var localProjects = getStored('portalProjects', []);
        var validLocalProjects = localProjects.filter(function(lp) {
            return projects.some(function(dbProject) {
                return String(dbProject._id) === String(lp._id || lp.id);
            });
        });
        if (validLocalProjects.length !== localProjects.length) {
            setStored('portalProjects', validLocalProjects);
        }
        
        var f = window._adminProjectFilter || 'all';
        var filtered = f === 'all' ? projects : projects.filter(function (p) { return adminPortalProjectGroup(p) === f; });
        if (!projects.length) {
            tbody.innerHTML = '<tr><td colspan="10">No projects in this filter.</td></tr>';
            return;
        }
        tbody.innerHTML = filtered.map(function (project) {
            var st = (project.status || 'Active').toLowerCase().replace(/\s+/g, '-');
            var idStr = escapeAttr(String(project._id || project.id));
            var nameEsc = escapeAttr(project.name || '');
            var locStr = formatProjectLocation(project.location);
            var clientStr = formatProjectClient(project.client);
            var foremanStr = formatProjectForeman(project);
            var employeeCount = project.assignedEmployees ? project.assignedEmployees.length : 0;
            return '<tr>' +
                '<td>' + escapeHtml(project.name || '') + '</td>' +
                '<td>' + escapeHtml(clientStr) + '</td>' +
                '<td>' + escapeHtml(locStr) + '</td>' +
                '<td>' + escapeHtml(foremanStr) + '</td>' +
                '<td><a href="#" onclick="viewProjectWorkers(\'' + idStr + '\')" title="View Workers">' + (project.workerCount || 0) + ' workers</a></td>' +
                '<td><a href="#" onclick="viewProjectEmployees(\'' + idStr + '\')" title="View Employees">' + employeeCount + ' employees</a></td>' +
                '<td><div style="width:100px;"><div class="progress-bar"><div class="progress-fill" style="width:' + (project.progress || 0) + '%"></div></div></td>' +
                '<td>' + escapeHtml(adminPortalProjectGroup(project) === 'completed' ? '-' : project.deadline || '') + '</td>' +
                '<td><span class="status-badge status-' + st + '">' + escapeHtml(project.status || 'Active') + '</span></td>' +
                '<td>' +
                '<div class="action-buttons-container">' +
                '<button type="button" class="btn-icon assign" title="Assign Employee" onclick="openAssignEmployeeModal(\'' + idStr + '\')"><i class="fas fa-user-plus"></i></button>' +
                '<button type="button" class="btn-icon view" title="View Details" onclick="viewProjectDetails(\'' + idStr + '\')"><i class="fas fa-eye"></i></button>' +
                '<button type="button" class="btn-icon edit" title="Edit Project" onclick="editProject(\'' + idStr + '\')"><i class="fas fa-edit"></i></button>' +
                '<button type="button" class="btn-icon delete" title="Delete Project" onclick="deleteProject(\'' + idStr + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></td></tr>';
        }).join('');
    }).catch(function () {
        tbody.innerHTML = '<tr><td colspan="10" style="color:#ff6b6b;">Error loading projects. Please refresh the page.</td></tr>';
    });
};

function renderAdminInvoices(tbody) {
    if (!tbody) return;
    var invoices = getStored('portalInvoices', null);
    if (!invoices || !invoices.length) {
        tbody.innerHTML = '<tr><td colspan="7">No invoices yet. Create them from the Invoices section.</td></tr>';
        return;
    }
    tbody.innerHTML = invoices.map(function (inv) {
        return '<tr>' +
            '<td>' + escapeHtml(inv.number) + '</td>' +
            '<td>' + escapeHtml(inv.client) + '</td>' +
            '<td>' + escapeHtml(inv.project || '-') + '</td>' +
            '<td>' + escapeHtml(inv.amount) + '</td>' +
            '<td>' + escapeHtml(inv.dueDate) + '</td>' +
            '<td><span class="status-badge status-' + escapeHtml((inv.status || 'Pending').toLowerCase()) + '">' + escapeHtml(inv.status) + '</span></td>' +
            '<td>' +
            '<button class="btn-icon" onclick="viewInvoice(\'' + escapeAttr(inv.number) + '\')"><i class="fas fa-eye"></i></button> ' +
            '<button class="btn-icon" onclick="editInvoice(\'' + escapeAttr(inv.number) + '\')"><i class="fas fa-edit"></i></button>' +
            '</td></tr>';
    }).join('');
}

function editInvoice(invoiceNumber) {
    var invoices = getStored('portalInvoices', []);
    var inv = invoices.find(function (i) { return i.number === invoiceNumber; });
    if (!inv) return;
    document.getElementById('invEditNumber').value = inv.number;
    document.getElementById('invEditNumberDisplay').value = inv.number;
    document.getElementById('invEditClient').value = inv.client || '';
    document.getElementById('invEditProject').value = inv.project || '';
    document.getElementById('invEditAmount').value = inv.amount || '';
    document.getElementById('invEditDueDate').value = inv.dueDate || '';
    document.getElementById('invEditStatus').value = inv.status || 'Pending';
    document.getElementById('adminInvoiceEditModal').classList.add('open');
}

function viewInvoice(invoiceNumber) {
    var path = window.location.pathname || '';
    if (path.includes('/client/')) {
        var invoices = getStored('clientInvoices', []);
        var inv = invoices.find(function (i) { return i.number === invoiceNumber; });
        var content = document.getElementById('clientInvoiceViewContent');
        var modal = document.getElementById('clientInvoiceViewModal');
        if (content && modal) {
            content.innerHTML = inv ? (
                '<table class="invoice-view-table">' +
                '<tr><th>Invoice #</th><td>' + escapeHtml(inv.number || '') + '</td></tr>' +
                '<tr><th>Amount</th><td>' + escapeHtml(inv.amount || '') + '</td></tr>' +
                '<tr><th>Date</th><td>' + escapeHtml(inv.date || '') + '</td></tr>' +
                '<tr><th>Status</th><td><span class="status-badge status-' + escapeHtml((inv.status || 'pending').toLowerCase()) + '">' + escapeHtml(inv.status || '') + '</span></td></tr>' +
                (inv.client ? '<tr><th>Client</th><td>' + escapeHtml(inv.client) + '</td></tr>' : '') +
                (inv.project ? '<tr><th>Project</th><td>' + escapeHtml(inv.project) + '</td></tr>' : '') +
                '</table>'
            ) : '<p>Invoice not found.</p>';
            var actionsEl = document.getElementById('clientInvoiceViewActions');
            if (actionsEl && inv) {
                actionsEl.innerHTML = '<button type="button" class="btn btn-primary" onclick="downloadClientInvoice(\'' + escapeAttr(inv.number || '') + '\')"><i class="fas fa-download"></i> Download Invoice</button>';
            } else if (actionsEl) actionsEl.innerHTML = '';
            modal.classList.add('open');
        }
    } else if (path.includes('/admin/')) {
        var invoices = getStored('portalInvoices', []);
        var inv = invoices.find(function (i) { return i.number === invoiceNumber; });
        var content = document.getElementById('adminInvoiceViewContent');
        var modal = document.getElementById('adminInvoiceViewModal');
        if (content && modal) {
            content.innerHTML = inv ? (
                '<table class="invoice-view-table">' +
                '<tr><th>Invoice #</th><td>' + escapeHtml(inv.number || '') + '</td></tr>' +
                '<tr><th>Client</th><td>' + escapeHtml(inv.client || '') + '</td></tr>' +
                '<tr><th>Project</th><td>' + escapeHtml(inv.project || '-') + '</td></tr>' +
                '<tr><th>Amount</th><td>' + escapeHtml(inv.amount || '') + '</td></tr>' +
                '<tr><th>Due Date</th><td>' + escapeHtml(inv.dueDate || '') + '</td></tr>' +
                '<tr><th>Status</th><td><span class="status-badge status-' + escapeHtml((inv.status || 'pending').toLowerCase()) + '">' + escapeHtml(inv.status || '') + '</span></td></tr>' +
                '</table>'
            ) : '<p>Invoice not found.</p>';
            modal.classList.add('open');
        }
    }
}

function downloadDocument(docName) {
    var docs = getStored('clientDocuments', []);
    var doc = docs.find(function (d) { return d.name === docName; });
    if (doc && doc.data) {
        try {
            var a = document.createElement('a');
            a.href = doc.data; a.download = docName; a.click();
        } catch (e) { window.open(doc.data, '_blank'); }
    } else {
        var blob = new Blob(['Placeholder for ' + docName + '. Uploaded documents will download here.'], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = docName.replace(/\.pdf$/i, '') + '-details.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    }
}

function downloadClientInvoice(invoiceNumber) {
    var invoices = getStored('clientInvoices', []);
    var inv = invoices.find(function (i) { return i.number === invoiceNumber; });
    if (!inv) return;
    var text = 'Invoice ' + (inv.number || '') + '\nAmount: ' + (inv.amount || '') + '\nDate: ' + (inv.date || '') + '\nStatus: ' + (inv.status || '') + '\n' + (inv.project ? 'Project: ' + inv.project + '\n' : '');
    var blob = new Blob([text], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invoice-' + (inv.number || 'inv') + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
}

function editTimeEntry(entryId) {
    var entries = getStored('employeeTimeEntries', []);
    var entry = entries[entryId];
    if (!entry) return;
    var modal = document.getElementById('employeeTimeEditModal');
    if (document.getElementById('timeEditIndex')) document.getElementById('timeEditIndex').value = entryId;
    if (document.getElementById('timeEditDate')) document.getElementById('timeEditDate').value = entry.date || '';
    if (document.getElementById('timeEditProject')) document.getElementById('timeEditProject').value = entry.project || '';
    if (document.getElementById('timeEditDescription')) document.getElementById('timeEditDescription').value = entry.description || '';
    if (document.getElementById('timeEditHours')) document.getElementById('timeEditHours').value = entry.hours || '';
    if (modal) modal.classList.add('open');
}

// ===== ASSIGNMENTS =====

function renderAssignments(tbody, assignments, hideEmployeeColumn) {
    if (!tbody) return;
    if (hideEmployeeColumn && tbody.id === 'employeeAssignmentsBody') {
        renderEmployeeAssignmentsTable(tbody, assignments);
        return;
    }
    tbody.innerHTML = assignments.map(function (a) {
        return '<tr>' +
            '<td>' + escapeHtml(a.project) + '</td>' +
            (hideEmployeeColumn ? '' : '<td>' + escapeHtml(a.employeeEmail) + '</td>') +
            '<td>' + escapeHtml(a.due || '-') + '</td>' +
            '<td>' + escapeHtml(a.deadline || a.due || '-') + '</td>' +
            '<td>' + escapeHtml(a.notes || '-') + '</td>' +
            '</tr>';
    }).join('');
}

function getEmployeeAssignmentStatus() { return getStored('employeeAssignmentStatus', {}) || {}; }
function setEmployeeAssignmentStatus(map) { setStored('employeeAssignmentStatus', map); }

function renderEmployeeAssignmentsTable(tbody, assignments) {
    if (!tbody || tbody.id !== 'employeeAssignmentsBody') return;
    var statusMap = getEmployeeAssignmentStatus();
    var filter = window._employeeProjectFilter || 'all';
    function timelineText(dueStr) {
        if (!dueStr) return '-';
        var d = new Date(dueStr);
        var now = new Date();
        var days = Math.ceil((d - now) / (24 * 60 * 60 * 1000));
        if (days < 0) return 'Overdue';
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return 'Due in ' + days + ' days';
    }
    var filtered = assignments.filter(function (a) {
        var key = (a.project || '') + '|' + (a.employeeEmail || '');
        var st = statusMap[key] || 'not-started';
        if (filter === 'all') return true;
        if (filter === 'not-started' || filter === 'assigned') return st === 'not-started';
        if (filter === 'active') return st === 'active';
        if (filter === 'completed') return st === 'completed';
        return true;
    });
    tbody.innerHTML = filtered.map(function (a) {
        var key = (a.project || '') + '|' + (a.employeeEmail || '');
        var st = statusMap[key] || 'not-started';
        var keyEsc = escapeAttr(key);
        var projEsc = escapeAttr(a.project || '');
        var timeline = timelineText(a.deadline || a.due);
        var action = st === 'not-started'
            ? '<button type="button" class="btn btn-sm btn-primary" onclick="startAssignment(\'' + keyEsc + '\')">Start</button>'
            : st === 'active'
                ? '<span class="status-badge status-pending">In progress</span> <button type="button" class="btn btn-sm btn-secondary" onclick="completeAssignment(\'' + keyEsc + '\')">Mark done</button>'
                : '<span class="status-badge status-paid">Done</span>';
        var updBtn = st !== 'completed' ? ' <button type="button" class="btn btn-sm btn-secondary" onclick="openEmployeeProgressModal(\'' + projEsc + '\')"><i class="fas fa-upload"></i> Progress</button>' : '';
        return '<tr><td>' + escapeHtml(a.project || '') + '</td><td>' + escapeHtml(a.due || '-') + '</td><td>' + escapeHtml(a.deadline || a.due || '-') + '</td><td>' + timeline + '</td><td>' + escapeHtml(a.notes || '-') + '</td><td>' + action + updBtn + '</td></tr>';
    }).join('');
}

window.openEmployeeProgressModal = function (projectName) {
    var el = document.getElementById('taskUpdateProjectLabel');
    if (el) el.textContent = projectName || '';
    var hid = document.getElementById('taskUpdateProjectName');
    if (hid) hid.value = projectName || '';
    var ta = document.getElementById('taskUpdateDescription');
    if (ta) ta.value = '';
    var fi = document.getElementById('taskUpdateImages');
    if (fi) fi.value = '';
    var modal = document.getElementById('employeeTaskUpdateModal');
    if (modal) modal.classList.add('open');
};

window.startAssignment = function (key) {
    var map = getEmployeeAssignmentStatus();
    map[key] = 'active';
    setEmployeeAssignmentStatus(map);
    var cu = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    var path = window.location.pathname || '';
    if (path.includes('/employee/')) {
        var assignments = getStored('assignments', []).filter(function (a) { return a.employeeEmail === cu.email; });
        renderEmployeeAssignmentsTable(document.getElementById('employeeAssignmentsBody'), assignments);
        if (typeof renderEmployeeOngoingForUpdate === 'function') renderEmployeeOngoingForUpdate();
        if (typeof loadEmployeeDashboard === 'function') loadEmployeeDashboard();
    }
};

window.completeAssignment = function (key) {
    var map = getEmployeeAssignmentStatus();
    map[key] = 'completed';
    setEmployeeAssignmentStatus(map);
    var cu = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    var path = window.location.pathname || '';
    if (path.includes('/employee/')) {
        var assignments = getStored('assignments', []).filter(function (a) { return a.employeeEmail === cu.email; });
        renderEmployeeAssignmentsTable(document.getElementById('employeeAssignmentsBody'), assignments);
        if (typeof renderEmployeeOngoingForUpdate === 'function') renderEmployeeOngoingForUpdate();
        if (typeof loadEmployeeDashboard === 'function') loadEmployeeDashboard();
    }
};

// ===== MESSAGES =====

function renderMessagesAsCards(container, messages) {
    if (!container) return;
    container.innerHTML = messages.slice().reverse().map(function (m) {
        return '<div class="message-card">' +
            '<div class="message-from">' + escapeHtml(m.from) + ' \u2192 ' + escapeHtml(m.to) + '</div>' +
            '<div class="message-meta">' + (m.project ? 'Project: ' + escapeHtml(m.project) + ' \xb7 ' : '') + (m.timestamp ? new Date(m.timestamp).toLocaleString() : '') + '</div>' +
            '<div class="message-body">' + escapeHtml(m.body) + '</div>' +
            '</div>';
    }).join('') || '<p class="empty-state">No messages yet.</p>';
}

// ===== EMPLOYEE PORTAL =====

window.setupEmployeeInteractions = function (currentUser) {
    var assignmentsBody = document.getElementById('employeeAssignmentsBody');
    var allAssignments = getStored('assignments', []);
    var myAssignments = currentUser
        ? allAssignments.filter(function (a) { return a.employeeEmail.toLowerCase() === currentUser.email.toLowerCase(); })
        : allAssignments;
    if (assignmentsBody) renderAssignments(assignmentsBody, myAssignments, true);

    var projectFilterTabs = document.querySelectorAll('#employeeProjectFilterTabs .filter-btn');
    projectFilterTabs.forEach(function (btn) {
        btn.addEventListener('click', function () {
            projectFilterTabs.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            window._employeeProjectFilter = btn.getAttribute('data-filter') || 'all';
            renderEmployeeAssignmentsTable(assignmentsBody, myAssignments);
        });
    });

    var taskUpdateModal = document.getElementById('employeeTaskUpdateModal');
    var taskUpdateForm = document.getElementById('employeeTaskUpdateForm');
    document.querySelectorAll('[data-close="employeeTaskUpdateModal"]').forEach(function (el) {
        el.addEventListener('click', function () { document.getElementById('employeeTaskUpdateModal').classList.remove('open'); });
    });
    if (taskUpdateModal) taskUpdateModal.addEventListener('click', function (e) { if (e.target === taskUpdateModal) taskUpdateModal.classList.remove('open'); });
    if (taskUpdateForm) {
        taskUpdateForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var project = (document.getElementById('taskUpdateProjectName') && document.getElementById('taskUpdateProjectName').value) || '';
            var description = document.getElementById('taskUpdateDescription').value;
            var fileInput = document.getElementById('taskUpdateImages');
            var files = fileInput && fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
            var token = sessionStorage.getItem('authToken');
            function sendWithImages(imageArr) {
                fetch((window.API_BASE || '') + '/api/portal/employee-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify({ project: project, description: description, images: imageArr || [] })
                }).then(function (r) {
                    if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'failed'); });
                    return r.json();
                }).then(function () {
                    taskUpdateForm.reset();
                    if (taskUpdateModal) taskUpdateModal.classList.remove('open');
                    return fetch((window.API_BASE || '') + '/api/portal/bootstrap', { headers: { Authorization: 'Bearer ' + token } });
                }).then(function (r) {
                    if (r && r.ok) return r.json();
                }).then(function (data) {
                    if (data && data.employeeTaskUpdates) __portalCache.employeeTaskUpdates = data.employeeTaskUpdates;
                    refreshNotificationsBadge();
                    alert('Progress submitted.');
                }).catch(function () {
                    alert('Could not submit progress. Check assignment matches this project.');
                });
            }
            if (files.length) {
                Promise.all(files.map(function (file) {
                    return new Promise(function (resolve) {
                        var reader = new FileReader();
                        reader.onload = function () { resolve(reader.result); };
                        reader.readAsDataURL(file);
                    });
                })).then(sendWithImages);
            } else { sendWithImages([]); }
        });
    }

    var timeModal = document.getElementById('employeeTimeModal');
    var timeForm = document.getElementById('employeeTimeForm');
    var timeEntriesBody = document.querySelector('.time-entries tbody');
    var addTimeBtn = document.getElementById('employeeAddTimeBtn');
    if (addTimeBtn && timeModal) addTimeBtn.addEventListener('click', function () { timeModal.classList.add('open'); });
    document.querySelectorAll('[data-close="employeeTimeModal"]').forEach(function (el) {
        el.addEventListener('click', function () { document.getElementById('employeeTimeModal').classList.remove('open'); });
    });
    if (timeModal) timeModal.addEventListener('click', function (e) { if (e.target === timeModal) timeModal.classList.remove('open'); });
    if (timeForm && timeEntriesBody) {
        timeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var entries = getStored('employeeTimeEntries', []);
            entries.push({
                date: document.getElementById('timeEntryDate').value,
                project: document.getElementById('timeEntryProject').value,
                description: document.getElementById('timeEntryDescription').value,
                hours: parseFloat(document.getElementById('timeEntryHours').value),
                employeeEmail: currentUser ? currentUser.email : 'employee@demo.com'
            });
            setStored('employeeTimeEntries', entries);
            renderEmployeeTimeEntries(timeEntriesBody, entries);
            timeForm.reset();
            timeModal.classList.remove('open');
        });
    }

    var timeEditModal = document.getElementById('employeeTimeEditModal');
    var timeEditForm = document.getElementById('employeeTimeEditForm');
    if (timeEditModal) {
        document.querySelectorAll('[data-close="employeeTimeEditModal"]').forEach(function (el) {
            el.addEventListener('click', function () { timeEditModal.classList.remove('open'); });
        });
        timeEditModal.addEventListener('click', function (e) { if (e.target === timeEditModal) timeEditModal.classList.remove('open'); });
    }
    if (timeEditForm && timeEntriesBody) {
        timeEditForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var idx = parseInt(document.getElementById('timeEditIndex').value, 10);
            var entries = getStored('employeeTimeEntries', []);
            if (isNaN(idx) || idx < 0 || idx >= entries.length) { timeEditModal.classList.remove('open'); return; }
            entries[idx] = {
                date: document.getElementById('timeEditDate').value,
                project: document.getElementById('timeEditProject').value,
                description: document.getElementById('timeEditDescription').value,
                hours: parseFloat(document.getElementById('timeEditHours').value) || 0,
                employeeEmail: entries[idx].employeeEmail
            };
            setStored('employeeTimeEntries', entries);
            renderEmployeeTimeEntries(timeEntriesBody, entries);
            timeEditForm.reset();
            if (timeEditModal) timeEditModal.classList.remove('open');
        });
    }
};

function renderEmployeeTimeEntries(tbody, entries) {
    if (!tbody) return;
    var list = entries && entries.length ? entries : [];
    tbody.innerHTML = list.map(function (entry, index) {
        return '<tr>' +
            '<td>' + escapeHtml(entry.date) + '</td>' +
            '<td>' + escapeHtml(entry.project) + '</td>' +
            '<td>' + escapeHtml(entry.description) + '</td>' +
            '<td>' + entry.hours + '</td>' +
            '<td><button class="btn-icon" onclick="editTimeEntry(' + index + ')"><i class="fas fa-edit"></i></button></td>' +
            '</tr>';
    }).join('');
    var remEl = document.getElementById('employeeTimeRemaining');
    if (remEl) {
        var now = new Date();
        var mon = new Date(now);
        mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        var weekStart = mon.toISOString().slice(0, 10);
        var weekEnd = new Date(mon);
        weekEnd.setDate(mon.getDate() + 6);
        var weekEndStr = weekEnd.toISOString().slice(0, 10);
        var weekHours = list.filter(function (e) { return e.date >= weekStart && e.date <= weekEndStr; }).reduce(function (sum, e) { return sum + (parseFloat(e.hours) || 0); }, 0);
        var remaining = Math.max(0, 40 - weekHours);
        remEl.innerHTML = '<p><strong>This week:</strong> ' + weekHours.toFixed(1) + ' hours logged &middot; <strong>' + remaining.toFixed(1) + ' hours remaining</strong> (out of 40h)</p>';
        remEl.className = 'time-remaining-bar';
    }
}

function renderEmployeeOngoingForUpdate() {
    var container = document.getElementById('employeeOngoingProgressList');
    if (!container) return;
    var cu = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    var assignments = getStored('assignments', []).filter(function (a) {
        return a.employeeEmail && cu && a.employeeEmail.toLowerCase() === (cu.email || '').toLowerCase();
    });
    var statusMap = getEmployeeAssignmentStatus();
    var ongoing = assignments.filter(function (a) {
        var key = (a.project || '') + '|' + (a.employeeEmail || '');
        return (statusMap[key] || 'not-started') !== 'completed';
    });
    container.innerHTML = ongoing.length ? ongoing.map(function (a) {
        var key = (a.project || '') + '|' + (a.employeeEmail || '');
        var st = statusMap[key] || 'not-started';
        var projEsc = escapeAttr(a.project || '');
        var dl = a.deadline || a.due || '-';
        return '<div class="deadline-item" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
            '<div><strong>' + escapeHtml(a.project || '') + '</strong>' +
            '<p style="margin:4px 0 0;">Deadline: ' + escapeHtml(dl) + ' \xb7 Status: ' + escapeHtml(st) + '</p></div>' +
            '<button type="button" class="btn btn-primary btn-sm" onclick="openEmployeeProgressModal(\'' + projEsc + '\')">Update progress</button></div>';
    }).join('') : '<p class="empty-state">No ongoing projects need updates.</p>';
}

function loadEmployeeDashboard() {
    var timeEntries = getStored('employeeTimeEntries', null);
    renderEmployeeTimeEntries(document.querySelector('.time-entries tbody'), timeEntries || []);
    var cu = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    var myAssignments = getStored('assignments', []).filter(function (a) {
        return a.employeeEmail && cu && a.employeeEmail.toLowerCase() === (cu.email || '').toLowerCase();
    });
    var statusMap = getEmployeeAssignmentStatus();
    var activeCount = myAssignments.filter(function (a) { return (statusMap[(a.project || '') + '|' + (a.employeeEmail || '')] || 'not-started') === 'active'; }).length;
    var completedCount = myAssignments.filter(function (a) { return (statusMap[(a.project || '') + '|' + (a.employeeEmail || '')] || 'not-started') === 'completed'; }).length;
    var now = new Date();
    var mon = new Date(now);
    mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    var weekStart = mon.toISOString().slice(0, 10);
    var weekEnd = new Date(mon); weekEnd.setDate(mon.getDate() + 6);
    var weekEndStr = weekEnd.toISOString().slice(0, 10);
    var entries = getStored('employeeTimeEntries', []);
    var weekHours = entries.filter(function (e) { return e.date >= weekStart && e.date <= weekEndStr; }).reduce(function (sum, e) { return sum + (parseFloat(e.hours) || 0); }, 0);
    var statActive = document.getElementById('employeeStatActive');
    var statHours = document.getElementById('employeeStatHours');
    var statAssigned = document.getElementById('employeeStatAssigned');
    var statDone = document.getElementById('employeeStatCompleted');
    if (statActive) statActive.textContent = String(activeCount);
    if (statHours) statHours.textContent = weekHours.toFixed(1);
    if (statAssigned) statAssigned.textContent = String(myAssignments.length);
    if (statDone) statDone.textContent = String(completedCount);
    var deadlinesList = document.getElementById('employeeScheduleDeadlines');
    if (deadlinesList) {
        deadlinesList.innerHTML = myAssignments.length ? myAssignments.slice(0, 10).map(function (a) {
            return '<div class="deadline-item"><i class="fas fa-calendar-alt" style="color:var(--primary);"></i><div><strong>' + escapeHtml(a.project || '') + '</strong><p>Due: ' + escapeHtml(a.deadline || a.due || '-') + '</p></div></div>';
        }).join('') : '<div class="deadline-item"><i class="fas fa-calendar-alt"></i><div><strong>No upcoming deadlines</strong><p>Assignments from admin will appear here.</p></div></div>';
    }
    var timesheetBody = document.getElementById('employeeTimesheetBody');
    if (timesheetBody) {
        var weekEntries = entries.filter(function (e) { return e.date >= weekStart && e.date <= weekEndStr; });
        timesheetBody.innerHTML = weekEntries.length ? weekEntries.map(function (e) {
            return '<tr><td>' + escapeHtml(e.date || '') + '</td><td>' + escapeHtml(e.project || '') + '</td><td>' + escapeHtml(e.description || '') + '</td><td>' + (e.hours || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="4">No entries this week. Add time from Time Tracking.</td></tr>';
    }
    renderEmployeeOngoingForUpdate();
}

// ===== CLIENT PORTAL =====

function clientPortalProjectGroup(p) {
    var s = (p.status || '').toLowerCase();
    if (s.indexOf('complete') !== -1) return 'completed';
    if (s === 'pending' || s === 'review') return 'pending';
    return 'ongoing';
}

window.applyClientProjectFilter = function () {
    var projectsContainer = document.getElementById('clientProjectsGrid');
    if (!projectsContainer) return;
    var f = window._clientProjectFilter || 'all';
    var list = window._clientProjectsList || [];
    var filtered = f === 'all' ? list : list.filter(function (p) { return clientPortalProjectGroup(p) === f; });
    var adminUpdates = getStored('adminClientProgressUpdates', []);
    if (!filtered.length) { projectsContainer.innerHTML = '<p class="empty-state">No projects in this view.</p>'; return; }
    projectsContainer.innerHTML = filtered.map(function (project) {
        var stClass = String(project.status || 'active').toLowerCase().replace(/\s+/g, '-');
        var deadline = project.deadline || project.completionDate || '-';
        var ups = adminUpdates.filter(function (u) {
            return String(u.projectId) === String(project._id || project.id) || (u.projectName && u.projectName === project.name);
        });
        var upHtml = ups.length ? '<div class="client-admin-updates"><strong>Updates from your team</strong>' +
            ups.slice().reverse().slice(0, 3).map(function (u) {
                return '<p class="small-meta">' + (u.at ? new Date(u.at).toLocaleString() : '') + ': ' + escapeHtml((u.message || '').slice(0, 160)) + '</p>';
            }).join('') + '</div>' : '';
        var pid = escapeAttr(String(project._id || project.id));
        var pname = escapeAttr(project.name || '');
        var budget = parseFloat(project.budget) || 0;
        var paid = parseFloat(project.moneyPaid) || 0;
        var used = parseFloat(project.moneyUsed) || 0;
        var remaining = parseFloat(project.moneyRemaining) || 0;
        var owed = parseFloat(project.moneyOwed) || 0;
        function fmtMoney(n) {
            if (n >= 1000000000) return 'KES ' + (n / 1000000000).toFixed(2) + 'B';
            if (n >= 1000000) return 'KES ' + (n / 1000000).toFixed(2) + 'M';
            if (n >= 1000) return 'KES ' + (n / 1000).toFixed(1) + 'K';
            return 'KES ' + n.toLocaleString();
        }
        var financeHtml = budget > 0 ? '<div class="project-finances">' +
            '<p><strong>Budget:</strong> ' + fmtMoney(budget) + '</p>' +
            '<p><strong>Paid:</strong> ' + fmtMoney(paid) + '</p>' +
            '<p><strong>Used:</strong> ' + fmtMoney(used) + '</p>' +
            '<p><strong>Remaining:</strong> ' + fmtMoney(remaining) + '</p>' +
            (owed > 0 ? '<p><strong>Owed:</strong> ' + fmtMoney(owed) + '</p>' : '') +
            '</div>' : '';
        var locLabel = formatProjectLocation(project.location);
        return '<div class="project-card client-project-card">' +
            '<div class="project-image client-project-image"><img src="' + escapeHtml((project.images && project.images[0]) || project.image || '/images/project1.jpg') + '" alt="' + escapeHtml(project.name) + '" onerror="this.src=\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y3ZjdmNyIvPjwvc3ZnPg==\'"></div>' +
            '<div class="project-details">' +
            '<h3>' + escapeHtml(project.name) + '</h3>' +
            '<p>Status: <span class="status-badge status-' + stClass + '">' + escapeHtml(project.status || '') + '</span></p>' +
            (locLabel ? '<p><strong>Location:</strong> ' + escapeHtml(locLabel) + '</p>' : '') +
            '<p><strong>Deadline:</strong> ' + escapeHtml(deadline) + '</p>' +
            financeHtml +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + (project.progress || 0) + '%"></div></div>' +
            '<p>Progress: ' + (project.progress || 0) + '%</p>' +
            '<p><strong>Next Milestone:</strong> ' + escapeHtml(project.nextMilestone || '-') + '</p>' +
            upHtml +
            '<div class="project-actions">' +
            '<button type="button" class="btn btn-primary" onclick="viewProjectDetails(\'' + pid + '\')">View Details</button> ' +
            '<button type="button" class="btn btn-secondary" onclick="openProjectInquiryModal(\'' + pid + '\',\'' + pname + '\')">Inquire</button>' +
            '</div></div></div>';
    }).join('');
};

function updateMoneyOverview(projects) {
    var totalPaid = 0, totalUsed = 0, totalBudget = 0, totalOwed = 0;
    projects.forEach(function (project) {
        totalPaid += parseFloat(project.moneyPaid) || 0;
        totalUsed += parseFloat(project.moneyUsed) || 0;
        totalBudget += parseFloat(project.budget) || 0;
        totalOwed += parseFloat(project.moneyOwed) || 0;
    });
    var totalLeft = totalBudget - totalUsed;
    function fmtMoney(n) {
        if (n >= 1000000000) return 'KES ' + (n / 1000000000).toFixed(2) + 'B';
        if (n >= 1000000) return 'KES ' + (n / 1000000).toFixed(2) + 'M';
        if (n >= 1000) return 'KES ' + (n / 1000).toFixed(1) + 'K';
        return 'KES ' + n.toLocaleString();
    }
    var tpEl = document.getElementById('totalPaid');
    var muEl = document.getElementById('moneyUsed');
    var mlEl = document.getElementById('moneyLeft');
    var tbEl = document.getElementById('totalBudget');
    var moEl = document.getElementById('moneyOwed');
    if (tpEl) tpEl.textContent = fmtMoney(totalPaid);
    if (muEl) muEl.textContent = fmtMoney(totalUsed);
    if (mlEl) mlEl.textContent = fmtMoney(totalLeft);
    if (tbEl) tbEl.textContent = fmtMoney(totalBudget);
    if (moEl) moEl.textContent = fmtMoney(totalOwed);
    
    console.log('Client money overview updated:', {
        totalPaid: totalPaid,
        totalUsed: totalUsed,
        totalBudget: totalBudget,
        totalLeft: totalLeft,
        totalOwed: totalOwed,
        projectCount: projects.length
    });
}

function loadClientDashboard() {
    var currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    var authToken = sessionStorage.getItem('authToken');

    function updateClientStats() {
        var projects = window._clientProjectsList || [];
        var pendingInv = (getStored('clientInvoices', []) || []).filter(function (i) {
            return (i.status || '').toLowerCase().indexOf('pending') !== -1 || (i.status || '').toLowerCase() === 'due';
        }).length;
        var docCount = (getStored('clientDocuments', []) || []).length;
        var activeProjects = projects.filter(function (p) { return clientPortalProjectGroup(p) === 'ongoing'; }).length;
        // Count actual milestones from projects, not just ongoing projects
        var milestones = 0;
        projects.forEach(function(p) {
            if (p.milestones && Array.isArray(p.milestones)) {
                milestones += p.milestones.filter(function(m) {
                    return m.status !== 'completed';
                }).length;
            }
        });
        var elP = document.getElementById('clientStatProjects');
        var elD = document.getElementById('clientStatDocs');
        var elI = document.getElementById('clientStatInvoices');
        var elM = document.getElementById('clientStatMilestones');
        if (elP) elP.textContent = String(activeProjects);
        if (elD) elD.textContent = String(docCount);
        if (elI) elI.textContent = String(pendingInv);
        if (elM) elM.textContent = String(milestones);
        updateMoneyOverview(projects);
    }

    if (authToken && currentUser) {
        // Clear any existing client data from localStorage to prevent showing old static data
        setStored('clientProjects', []);
        setStored('clientDocuments', []);
        setStored('clientInvoices', []);
        setStored('clientTransactions', []);
        setStored('clientNotifications', []);
        setStored('clientSupportTickets', []);
        
        // Load client's own projects
        fetch(window.API_BASE + '/api/projects?client=true', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        }).then(function (r) {
            if (!r.ok) throw new Error('Failed');
            return r.json();
        }).then(function (projects) {
            console.log('Client projects received:', projects);
            console.log('Number of projects:', projects.length);
            // Projects are already filtered by client user ID from backend
            window._clientProjectsList = projects.map(function (p) {
                return {
                    _id: p._id || p.id,
                    id: p._id || p.id,
                    name: p.name,
                    image: (p.images && p.images[0]) || p.image || '/images/project1.jpg',
                    images: p.images || [],
                    progress: p.progress || 0,
                    status: p.status || 'Active',
                    nextMilestone: p.nextMilestone || '-',
                    completionDate: p.completionDate || '-',
                    deadline: p.endDate || p.completionDate || '',
                    endDate: p.endDate,
                    description: p.description || '',
                    location: p.location,
                    category: p.category || 'Commercial',
                    client: p.client,
                    foremanName: p.foremanName,
                    assignedForeman: p.assignedForeman,
                    moneyPaid: p.moneyPaid || 0,
                    moneyUsed: p.moneyUsed || 0,
                    moneyRemaining: p.moneyRemaining || 0,
                    moneyOwed: p.moneyOwed || 0,
                    budget: p.budget || 0
                };
            });
            window._clientProjectFilter = window._clientProjectFilter || 'all';
            window.applyClientProjectFilter();
            updateClientStats();
        }).catch(function () {
            window._clientProjectsList = [];
            window._clientProjectFilter = window._clientProjectFilter || 'all';
            window.applyClientProjectFilter();
            updateClientStats();
        });
    } else {
        window._clientProjectsList = [];
        window._clientProjectFilter = window._clientProjectFilter || 'all';
        window.applyClientProjectFilter();
        updateClientStats();
    }

    var clientProjTabs = document.querySelectorAll('#clientProjectFilterTabs .filter-btn');
    if (clientProjTabs.length && !window._clientProjectsFilterBound) {
        window._clientProjectsFilterBound = true;
        clientProjTabs.forEach(function (btn) {
            btn.addEventListener('click', function () {
                clientProjTabs.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                window._clientProjectFilter = btn.getAttribute('data-filter') || 'all';
                window.applyClientProjectFilter();
            });
        });
    }

    function loadClientDocuments() {
        if (!authToken || !currentUser) { renderClientDocuments([]); return; }
        fetch(window.API_BASE + '/api/documents?client=true', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        }).then(function (r) {
            if (!r.ok) throw new Error('Failed');
            return r.json();
        }).then(renderClientDocuments).catch(function () { renderClientDocuments([]); });
    }

    function renderClientDocuments(docs) {
        var documentsList = document.getElementById('clientDocumentsBody');
        if (!documentsList) return;
        if (!docs || !docs.length) {
            documentsList.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">No documents available</td></tr>';
        } else {
            documentsList.innerHTML = docs.map(function (doc) {
                return '<tr>' +
                    '<td>' + escapeHtml(doc.name) + '</td>' +
                    '<td>' + new Date(doc.createdAt).toLocaleDateString() + '</td>' +
                    '<td>' + escapeHtml(doc.size || '-') + '</td>' +
                    '<td><button class="btn btn-sm btn-primary" onclick="downloadDocument(\'' + escapeAttr(doc._id || doc.id) + '\')">Download</button></td>' +
                    '</tr>';
            }).join('');
        }
    }

    loadClientDocuments();

    var uploadDocBtn = document.getElementById('clientUploadDocBtn');
    var uploadDocModal = document.getElementById('clientUploadDocModal');
    var uploadDocForm = document.getElementById('clientUploadDocForm');
    if (uploadDocBtn && uploadDocModal) uploadDocBtn.addEventListener('click', function () { uploadDocModal.classList.add('open'); });
    document.querySelectorAll('[data-close="clientUploadDocModal"]').forEach(function (el) {
        el.addEventListener('click', function () { document.getElementById('clientUploadDocModal').classList.remove('open'); });
    });
    if (uploadDocModal) uploadDocModal.addEventListener('click', function (e) { if (e.target === uploadDocModal) uploadDocModal.classList.remove('open'); });
    if (uploadDocForm) {
        uploadDocForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('clientDocName').value.trim() || 'Document';
            var fileInput = document.getElementById('clientDocFile');
            var file = fileInput && fileInput.files[0];
            var size = file ? (file.size < 1024 ? file.size + ' B' : (file.size / 1024).toFixed(1) + ' KB') : '0 KB';
            function saveDoc(data) {
                var docs = getStored('clientDocuments', []);
                docs.push({ name: name, date: new Date().toISOString().slice(0, 10), size: size, data: data });
                setStored('clientDocuments', docs);
                renderClientDocuments(docs);
                uploadDocForm.reset();
                uploadDocModal.classList.remove('open');
            }
            if (file) {
                var reader = new FileReader();
                reader.onload = function () { saveDoc(reader.result); };
                reader.readAsDataURL(file);
            } else { saveDoc(null); }
        });
    }

    function loadClientInvoices() {
        if (!authToken || !currentUser) { renderClientInvoices([]); return; }
        fetch(window.API_BASE + '/api/invoices?client=true', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        }).then(function (r) {
            if (!r.ok) throw new Error('Failed');
            return r.json();
        }).then(renderClientInvoices).catch(function () { renderClientInvoices([]); });
    }

    function renderClientInvoices(invoices) {
        var invoicesList = document.getElementById('clientInvoicesBody');
        if (!invoicesList) return;
        if (!invoices || !invoices.length) {
            invoicesList.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No invoices available</td></tr>';
        } else {
            invoicesList.innerHTML = invoices.map(function (invoice) {
                var iid = escapeAttr(String(invoice._id || invoice.id));
                return '<tr>' +
                    '<td>' + escapeHtml(invoice.number) + '</td>' +
                    '<td>' + escapeHtml(invoice.amount) + '</td>' +
                    '<td>' + new Date(invoice.createdAt).toLocaleDateString() + '</td>' +
                    '<td><span class="status-badge status-' + escapeHtml((invoice.status || '').toLowerCase()) + '">' + escapeHtml(invoice.status) + '</span></td>' +
                    '<td>' +
                    '<button class="btn-icon" onclick="viewInvoice(\'' + iid + '\')" title="View"><i class="fas fa-eye"></i></button> ' +
                    '<button class="btn-icon" onclick="downloadClientInvoice(\'' + iid + '\')" title="Download"><i class="fas fa-download"></i></button>' +
                    '</td></tr>';
            }).join('');
        }
    }

    var inquiryModal = document.getElementById('clientProjectInquiryModal');
    var inquiryForm = document.getElementById('clientProjectInquiryForm');
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var cu = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            if (!cu) { alert('Please log in to send inquiries.'); return; }
            var inquiryData = {
                projectId: document.getElementById('inquiryProjectId').value,
                projectName: document.getElementById('inquiryProjectName').value,
                clientEmail: cu.email, clientName: cu.name,
                subject: document.getElementById('inquirySubject').value,
                message: document.getElementById('inquiryMessage').value,
                priority: document.getElementById('inquiryPriority').value,
                createdAt: new Date().toISOString(), status: 'pending'
            };
            fetch(window.API_BASE + '/api/inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') },
                body: JSON.stringify(inquiryData)
            }).then(function (r) {
                if (!r.ok) throw new Error('Failed');
                return r.json();
            }).then(function () {
                alert('Your inquiry has been sent successfully! We will respond within 24 hours.');
                inquiryForm.reset();
                if (inquiryModal) inquiryModal.classList.remove('open');
            }).catch(function () { alert('Failed to send inquiry. Please try again.'); });
        });
    }

    loadClientInquiries();
    loadClientInvoices();

    var messagesList = document.getElementById('clientMessagesList');
    if (messagesList) {
        var msgs = getStored('portalMessages', []).filter(function (m) { return m.to === (currentUser && currentUser.email); });
        messagesList.innerHTML = msgs.length ? msgs.slice().reverse().map(function (m) {
            return '<div class="message-card">' +
                '<div class="message-from">From: ' + escapeHtml(m.from) + '</div>' +
                '<div class="message-meta">' + (m.project ? 'Project: ' + escapeHtml(m.project) + ' \xb7 ' : '') + (m.timestamp ? new Date(m.timestamp).toLocaleString() : '') + '</div>' +
                '<div class="message-body">' + escapeHtml(m.body) + '</div>' +
                '</div>';
        }).join('') : '<p class="empty-state">No messages yet.</p>';
    }

    var supportName = document.getElementById('supportName');
    var supportEmail = document.getElementById('supportEmail');
    if (currentUser && supportName) supportName.value = currentUser.name || '';
    if (currentUser && supportEmail) supportEmail.value = currentUser.email || '';
}

function loadClientInquiries() {
    var authToken = sessionStorage.getItem('authToken');
    var currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!authToken || !currentUser) return;
    fetch(window.API_BASE + '/api/inquiries?client=' + encodeURIComponent(currentUser.email), {
        headers: { 'Authorization': 'Bearer ' + authToken }
    }).then(function (r) { return r.json(); }).then(function (inquiries) {
        var inquiriesList = document.getElementById('clientInquiriesList');
        if (!inquiriesList) return;
        inquiriesList.innerHTML = inquiries.length ? inquiries.map(function (inquiry) {
            return '<div class="inquiry-item">' +
                '<div class="inquiry-header"><strong>' + escapeHtml(inquiry.subject) + '</strong><span class="status-badge status-' + escapeHtml(inquiry.status) + '">' + escapeHtml(inquiry.status) + '</span></div>' +
                '<div class="inquiry-body">' + escapeHtml(inquiry.message) + '</div>' +
                '<div class="inquiry-footer"><small>Submitted: ' + new Date(inquiry.createdAt).toLocaleDateString() + '</small>' +
                (inquiry.response ? '<div class="inquiry-response"><strong>Response:</strong> ' + escapeHtml(inquiry.response) + '</div>' : '') +
                '</div></div>';
        }).join('') : '<p class="empty-state">No inquiries yet.</p>';
    }).catch(function (error) { console.error('Error loading inquiries:', error); });
}

// ===== ADMIN DASHBOARD =====

async function renderPendingApprovals() {
    var tbody = document.getElementById('adminPendingApprovalsBody');
    if (!tbody) return;
    var token = sessionStorage.getItem('authToken');
    try {
        var r = await fetch((window.API_BASE || '') + '/api/admin/pending-users', { headers: { Authorization: 'Bearer ' + token } });
        if (!r.ok) { tbody.innerHTML = '<tr><td colspan="5">Could not load pending accounts.</td></tr>'; return; }
        var list = await r.json();
        tbody.innerHTML = list.length ? list.map(function (u) {
            return '<tr>' +
                '<td>' + escapeHtml(u.name || '') + '</td>' +
                '<td>' + escapeHtml(u.email || '') + '</td>' +
                '<td>' + escapeHtml(u.role || '') + '</td>' +
                '<td>' + (u.createdAt ? new Date(u.createdAt).toLocaleString() : '') + '</td>' +
                '<td><button type="button" class="btn btn-primary" data-approve-id="' + escapeHtml(u.id) + '">Approve</button></td>' +
                '</tr>';
        }).join('') : '<tr><td colspan="5">No pending accounts.</td></tr>';
        tbody.querySelectorAll('[data-approve-id]').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var id = btn.getAttribute('data-approve-id');
                var r2 = await fetch((window.API_BASE || '') + '/api/admin/users/' + id + '/approve', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
                if (r2.ok) {
                    await renderPendingApprovals();
                    refreshNotificationsBadge();
                    try {
                        var ur = await fetch((window.API_BASE || '') + '/api/admin/users', { headers: { Authorization: 'Bearer ' + token } });
                        if (ur.ok) {
                            __portalCache.portalUsers = await ur.json();
                            renderAdminUsers(document.querySelector('.users-list tbody'), __portalCache.portalUsers);
                            var tu = document.getElementById('totalUsers');
                            if (tu) tu.textContent = String(__portalCache.portalUsers.length);
                        }
                    } catch (e2) {}
                    alert('Account approved.');
                } else { alert('Could not approve.'); }
            });
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5">Error loading list.</td></tr>';
    }
}

async function renderAdminEnquiries() {
    var tbody = document.getElementById('adminEnquiriesBody');
    if (!tbody) return;
    var list = [];
    try {
        var r = await fetch((window.API_BASE || '') + '/api/admin/enquiries', { headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') } });
        if (r.ok) list = await r.json();
    } catch (e) { list = []; }
    tbody.innerHTML = list.length ? list.slice().reverse().map(function (e) {
        return '<tr>' +
            '<td>' + escapeHtml(e.name || '') + '</td>' +
            '<td>' + escapeHtml(e.contact || '') + '</td>' +
            '<td>' + escapeHtml(e.type || '') + '</td>' +
            '<td>' + escapeHtml(e.location || '') + '</td>' +
            '<td>' + escapeHtml(e.timeline || '-') + '</td>' +
            '<td>' + escapeHtml(e.budget || '-') + '</td>' +
            '<td>' + (e.date ? new Date(e.date).toLocaleDateString() : '') + '</td>' +
            '</tr>';
    }).join('') : '<tr><td colspan="7">No enquiries yet.</td></tr>';
}

async function renderAdminWebsiteProjects() {
    var tbody = document.getElementById('adminWebsiteProjectsBody');
    if (!tbody) return;
    var list = [];
    try {
        if (typeof getWebsiteProjects === 'function') {
            list = getWebsiteProjects();
        }
    } catch (e) { list = []; }
    tbody.innerHTML = list.length ? list.map(function (p) {
        return '<tr>' +
            '<td><img src="' + escapeHtml(p.image || '') + '" alt="' + escapeHtml(p.title || '') + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;"></td>' +
            '<td>' + escapeHtml(p.title || '') + '</td>' +
            '<td>' + escapeHtml(p.category || '') + '</td>' +
            '<td>' + escapeHtml((p.description || '').substring(0, 100) + (p.description && p.description.length > 100 ? '...' : '')) + '</td>' +
            '<td>' +
            '<button class="btn-icon" onclick="editWebsiteProject(\'' + escapeAttr(String(p.id)) + '\')" title="Edit project"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-icon" onclick="deleteWebsiteProject(\'' + escapeAttr(String(p.id)) + '\')" title="Delete project"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:40px;">No website projects yet. Click "Add Website Project" to get started.</td></tr>';
}

async function renderAdminFAQsInContent() {
    var tbody = document.getElementById('adminFAQsInContentBody');
    if (!tbody) return;
    var faqs = { general: [], services: [], process: [], style: [] };
    try {
        var response = await fetch((window.API_BASE || '') + '/api/faqs');
        if (response.ok) {
            faqs = await response.json();
        }
    } catch (e) { console.warn('Failed to fetch FAQs:', e); }
    
    var allFAQs = [];
    Object.keys(faqs).forEach(function(category) {
        if (Array.isArray(faqs[category])) {
            faqs[category].forEach(function(faq) {
                allFAQs.push({ category: category, ...faq });
            });
        }
    });
    
    tbody.innerHTML = allFAQs.length ? allFAQs.map(function (faq) {
        return '<tr>' +
            '<td>' + escapeHtml(faq.category || '') + '</td>' +
            '<td>' + escapeHtml(faq.question || '') + '</td>' +
            '<td>' + escapeHtml((faq.answer || '').substring(0, 100) + (faq.answer && faq.answer.length > 100 ? '...' : '')) + '</td>' +
            '<td>' +
            '<button class="btn-icon" onclick="editFAQInContent(\'' + escapeAttr(faq.category) + '\',\'' + escapeAttr(faq.id) + '\')" title="Edit FAQ"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-icon" onclick="deleteFAQInContent(\'' + escapeAttr(faq.category) + '\',\'' + escapeAttr(faq.id) + '\')" title="Delete FAQ"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;padding:40px;">No FAQs yet. Click "Add FAQ" to get started.</td></tr>';
}

async function renderAdminBlogPosts() {
    var tbody = document.getElementById('adminBlogPostsBody');
    if (!tbody) return;
    var posts = [];
    try {
        if (typeof getWebsiteBlogPosts === 'function') {
            posts = getWebsiteBlogPosts();
        }
    } catch (e) { posts = []; }
    tbody.innerHTML = posts.length ? posts.map(function (p) {
        return '<tr>' +
            '<td><img src="' + escapeHtml(p.image || '') + '" alt="' + escapeHtml(p.title || '') + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;"></td>' +
            '<td>' + escapeHtml(p.title || '') + '</td>' +
            '<td>' + escapeHtml(p.date || '') + '</td>' +
            '<td>' + escapeHtml((p.excerpt || '').substring(0, 100) + (p.excerpt && p.excerpt.length > 100 ? '...' : '')) + '</td>' +
            '<td>' +
            '<button class="btn-icon" onclick="editBlogPost(\'' + escapeAttr(String(p.id)) + '\')" title="Edit post"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-icon" onclick="deleteBlogPost(\'' + escapeAttr(String(p.id)) + '\')" title="Delete post"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:40px;">No blog posts yet. Click "Add Blog Post" to get started.</td></tr>';
}

window.editBlogPost = function(id) {
    var list = typeof getWebsiteBlogPosts === 'function' ? getWebsiteBlogPosts() : [];
    var post = list.find(function(p) { return String(p.id) === String(id); });
    if (!post) return;
    
    var blogModal = document.getElementById('adminBlogPostModal');
    var blogForm = document.getElementById('adminBlogPostForm');
    var editIdField = document.getElementById('blogPostEditId');
    var modalTitle = blogModal.querySelector('h2');
    
    if (document.getElementById('blogPostTitle')) document.getElementById('blogPostTitle').value = post.title || '';
    if (document.getElementById('blogPostDate')) document.getElementById('blogPostDate').value = post.date || '';
    if (document.getElementById('blogPostAuthor')) document.getElementById('blogPostAuthor').value = post.author || '';
    if (document.getElementById('blogPostExcerpt')) document.getElementById('blogPostExcerpt').value = post.excerpt || '';
    if (editIdField) editIdField.value = String(post.id);
    if (modalTitle) modalTitle.textContent = 'Edit Blog Post';
    
    if (blogModal) blogModal.classList.add('open');
};

window.deleteBlogPost = function(id) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    
    var list = typeof getWebsiteBlogPosts === 'function' ? getWebsiteBlogPosts() : [];
    var index = list.findIndex(function(p) { return String(p.id) === String(id); });
    if (index !== -1) {
        list.splice(index, 1);
        if (typeof setWebsiteBlogPosts === 'function') {
            setWebsiteBlogPosts(list).then(function() {
                renderAdminBlogPosts();
                alert('Blog post deleted successfully!');
            }).catch(function() { alert('Could not delete blog post.'); });
        }
    }
};

window.editFAQInContent = function(category, id) {
    // Redirect to the FAQ management section
    var faqSection = document.getElementById('admin-faq');
    if (faqSection) {
        // Hide all sections
        document.querySelectorAll('.portal-section').forEach(function(sec) {
            sec.style.display = 'none';
        });
        // Show FAQ section
        faqSection.style.display = 'block';
        // Update sidebar active state
        document.querySelectorAll('.sidebar-nav a[data-section]').forEach(function(a) {
            a.classList.toggle('active', a.getAttribute('data-section') === 'admin-faq');
        });
        // Trigger edit
        if (typeof editFAQ === 'function') {
            editFAQ(category, id);
        }
    }
};

window.deleteFAQInContent = function(category, id) {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    
    apiFetch('/api/faqs/' + category + '/' + id, { method: 'DELETE' })
        .then(function (r) { return r.json().then(function (data) { if (!r.ok) throw data; return data; }); })
        .then(function () {
            renderAdminFAQsInContent();
            alert('FAQ deleted successfully!');
        })
        .catch(function (err) { alert('Error: ' + (err.error || err.message || 'Unknown error')); });
};

window.editWebsiteProject = function(id) {
    var list = typeof getWebsiteProjects === 'function' ? getWebsiteProjects() : [];
    var project = list.find(function(p) { return String(p.id) === String(id); });
    if (!project) return;
    
    var webProjModal = document.getElementById('adminWebsiteProjectModal');
    var webProjForm = document.getElementById('adminWebsiteProjectForm');
    var editIdField = document.getElementById('webProjectEditId');
    var modalTitle = webProjModal.querySelector('h2');
    
    if (document.getElementById('webProjectTitle')) document.getElementById('webProjectTitle').value = project.title || '';
    if (document.getElementById('webProjectSlug')) document.getElementById('webProjectSlug').value = project.slug || '';
    if (document.getElementById('webProjectCategory')) document.getElementById('webProjectCategory').value = project.category || '';
    if (document.getElementById('webProjectDescription')) document.getElementById('webProjectDescription').value = project.description || '';
    if (editIdField) editIdField.value = String(project.id);
    if (modalTitle) modalTitle.textContent = 'Edit Website Project';
    
    if (webProjModal) webProjModal.classList.add('open');
};

window.deleteWebsiteProject = function(id) {
    if (!confirm('Are you sure you want to delete this website project?')) return;
    
    var list = typeof getWebsiteProjects === 'function' ? getWebsiteProjects() : [];
    var index = list.findIndex(function(p) { return String(p.id) === String(id); });
    if (index !== -1) {
        list.splice(index, 1);
        if (typeof setWebsiteProjects === 'function') {
            setWebsiteProjects(list).then(function() {
                renderAdminWebsiteProjects();
                alert('Website project deleted successfully!');
            }).catch(function() { alert('Could not delete project.'); });
        }
    }
};

async function loadAdminDashboard() {
    // First, refresh data from backend to clear stale localStorage
    var token = sessionStorage.getItem('authToken');
    if (token) {
        try {
            var bootstrapData = await fetch((window.API_BASE || '') + '/api/portal/bootstrap', {
                headers: { Authorization: 'Bearer ' + token }
            });
            if (bootstrapData.ok) {
                var data = await bootstrapData.json();
                Object.keys(data).forEach(function (k) {
                    __portalCache[k] = data[k];
                    // Don't sync keys that shouldn't be synced to backend
                    // Only update cache to avoid 400 errors on unsupported keys
                });
            }
        } catch (e) {
            console.warn('Failed to refresh bootstrap data:', e);
        }
    }

    try {
        if (typeof loadWebsiteProjects === 'function') await loadWebsiteProjects();
        if (typeof loadWebsiteServices === 'function') await loadWebsiteServices();
        if (typeof loadWebsiteBlogPosts === 'function') await loadWebsiteBlogPosts();
    } catch (e) { console.warn(e); }

    var directoryUsers = [];
    try {
        var ur = await fetch((window.API_BASE || '') + '/api/admin/users', { headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') } });
        if (ur.ok) directoryUsers = await ur.json();
    } catch (e) { console.warn(e); }
    __portalCache.portalUsers = directoryUsers;
    renderAdminUsers(document.querySelector('.users-list tbody'), directoryUsers);
    
    // Update admin dashboard stats
    var clients = directoryUsers.filter(function (u) { return u.role && u.role.toLowerCase() === 'client'; });
    var totalClientsEl = document.getElementById('totalClients');
    if (totalClientsEl) totalClientsEl.textContent = String(clients.length);
    
    var activeProjects = 0;
    try {
        var pr = await fetch((window.API_BASE || '') + '/api/projects', { headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') } });
        if (pr.ok) {
            var projects = await pr.json();
            activeProjects = projects.filter(function (p) { return p.status === 'active' || p.status === 'ongoing'; }).length;
        }
    } catch (e) { console.warn(e); }
    var activeProjectsEl = document.getElementById('activeProjects');
    if (activeProjectsEl) activeProjectsEl.textContent = String(activeProjects);

    window._adminProjectFilter = 'all';
    window.renderAdminProjectsTable();

    var adminProjTabs = document.querySelectorAll('#adminProjectFilterTabs .filter-btn');
    adminProjTabs.forEach(function (btn) {
        btn.addEventListener('click', function () {
            adminProjTabs.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            window._adminProjectFilter = btn.getAttribute('data-filter') || 'all';
            window.renderAdminProjectsTable();
        });
    });

    var assignSel = document.getElementById('assignProjectName');
    if (assignSel) {
        var pl = getStored('portalProjects', []);
        var assignments = getStored('assignments', []);
        var assignedProjectNames = new Set(assignments.map(function (a) { return a.project; }));
        var activeUnassignedProjects = pl.filter(function (p) {
            var isActive = p.status === 'ongoing' || p.status === 'active' || p.status === 'Active';
            var isUnassigned = !assignedProjectNames.has(p.name);
            return isActive && isUnassigned;
        });
        assignSel.innerHTML = activeUnassignedProjects.length ? activeUnassignedProjects.map(function (p) {
            return '<option value="' + escapeHtml(p.name || '') + '">' + escapeHtml(p.name || '') + '</option>';
        }).join('') : '<option value="">No active unassigned projects</option>';
    }

    renderAdminInvoices(document.getElementById('adminInvoicesBody'));

    var careersBody = document.getElementById('adminCareersBody');
    var apps = [];
    try {
        var cr = await fetch((window.API_BASE || '') + '/api/admin/career-applications', { headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') } });
        if (cr.ok) apps = await cr.json();
    } catch (e) { apps = getStored('careerApplications', []); }
    careersBody.innerHTML = apps.length ? apps.map(function (a) {
        return '<tr>' +
            '<td>' + escapeHtml(a.name || '') + '</td>' +
            '<td>' + escapeHtml(a.email || '') + '</td>' +
            '<td>' + escapeHtml(a.type || '') + '</td>' +
            '<td>' + escapeHtml(a.campus || '-') + '</td>' +
            '<td>' + escapeHtml(a.yearOfStudy || '-') + '</td>' +
            '<td>' + (a.date ? new Date(a.date).toLocaleDateString() : '') + '</td>' +
            '</tr>';
    }).join('') : '<tr><td colspan="6">No applications yet.</td></tr>';

    var totalUsersEl = document.getElementById('totalUsers');
    var activeProjectsEl = document.getElementById('activeProjects');
    // Filter to show only admin, employees, and foreman (exclude clients)
    var teamMembers = directoryUsers.filter(function(u) {
        var role = (u.role || '').toLowerCase();
        return role === 'admin' || role === 'employee' || role === 'foreman';
    });
    if (totalUsersEl) totalUsersEl.textContent = String(teamMembers.length);
    if (activeProjectsEl) activeProjectsEl.textContent = '0';

    updateFinancialSummary();

    var pendingCount = 0;
    try {
        var pr = await fetch((window.API_BASE || '') + '/api/admin/pending-users', { headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') } });
        if (pr.ok) { var plist = await pr.json(); pendingCount = (plist && plist.length) || 0; }
    } catch (e) {}
    var pendingTasks = document.getElementById('pendingTasks');
    if (pendingTasks) pendingTasks.textContent = String(pendingCount);

    await renderAdminEnquiries();
    await renderPendingApprovals();
    await renderAdminWebsiteProjects();
    await renderAdminFAQsInContent();
    await renderAdminBlogPosts();

    // Website project/service modals
    var addWebProjBtn = document.getElementById('adminAddWebsiteProjectBtn');
    var addWebServBtn = document.getElementById('adminAddWebsiteServiceBtn');
    var webProjModal = document.getElementById('adminWebsiteProjectModal');
    var webServModal = document.getElementById('adminWebsiteServiceModal');
    var webProjForm = document.getElementById('adminWebsiteProjectForm');
    var webServForm = document.getElementById('adminWebsiteServiceForm');
    if (addWebProjBtn && webProjModal) addWebProjBtn.addEventListener('click', function () { if (webProjForm) webProjForm.reset(); webProjModal.classList.add('open'); });
    if (addWebServBtn && webServModal) addWebServBtn.addEventListener('click', function () { if (webServForm) webServForm.reset(); webServModal.classList.add('open'); });
    document.querySelectorAll('[data-close="adminWebsiteProjectModal"]').forEach(function (el) { el.addEventListener('click', function () { webProjModal.classList.remove('open'); }); });
    document.querySelectorAll('[data-close="adminWebsiteServiceModal"]').forEach(function (el) { el.addEventListener('click', function () { webServModal.classList.remove('open'); }); });
    if (webProjModal) webProjModal.addEventListener('click', function (e) { if (e.target === webProjModal) webProjModal.classList.remove('open'); });
    if (webServModal) webServModal.addEventListener('click', function (e) { if (e.target === webServModal) webServModal.classList.remove('open'); });

    if (webProjForm && typeof getWebsiteProjects === 'function') {
        webProjForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var title = document.getElementById('webProjectTitle').value;
            var slug = document.getElementById('webProjectSlug').value;
            var category = document.getElementById('webProjectCategory').value;
            var description = document.getElementById('webProjectDescription').value;
            var fileInput = document.getElementById('webProjectImage');
            var file = fileInput && fileInput.files[0];
            var editIdField = document.getElementById('webProjectEditId');
            var editId = editIdField ? editIdField.value : null;
            var modalTitle = webProjModal.querySelector('h2');
            
            function saveWebProj(image) {
                var list = getWebsiteProjects().slice();
                var projectSlug = slug || String(title || 'project').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                
                if (editId) {
                    // Edit existing project
                    var index = list.findIndex(function (p) { return String(p.id) === String(editId); });
                    if (index !== -1) {
                        list[index] = { 
                            id: list[index].id, 
                            slug: projectSlug, 
                            title: title, 
                            category: category, 
                            categorySecondary: list[index].categorySecondary || '', 
                            image: image || list[index].image, 
                            description: description 
                        };
                    }
                } else {
                    // Create new project
                    list.push({ id: Date.now(), slug: projectSlug, title: title, category: category, categorySecondary: '', image: image, description: description });
                }
                
                setWebsiteProjects(list).then(function () { 
                    webProjForm.reset(); 
                    if (editIdField) editIdField.value = '';
                    if (modalTitle) modalTitle.textContent = 'Add Website Project';
                    webProjModal.classList.remove('open'); 
                }).catch(function () { alert('Could not save project.'); });
            }
            
            if (file) { 
                var reader = new FileReader(); 
                reader.onload = function () { saveWebProj(reader.result); }; 
                reader.readAsDataURL(file); 
            } else if (editId) {
                // Keep existing image if editing and no new file
                var list = getWebsiteProjects();
                var existing = list.find(function (p) { return String(p.id) === String(editId); });
                saveWebProj(existing ? existing.image : 'https://via.placeholder.com/600x400?text=' + encodeURIComponent(title));
            } else {
                saveWebProj('https://via.placeholder.com/600x400?text=' + encodeURIComponent(title));
            }
        });
    }

    if (webServForm && typeof getWebsiteServices === 'function') {
        webServForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var title = document.getElementById('webServiceTitle').value;
            var category = document.getElementById('webServiceCategory').value;
            var description = document.getElementById('webServiceDescription').value;
            var fileInput = document.getElementById('webServiceImage');
            var file = fileInput && fileInput.files[0];
            function saveWebServ(image) {
                var list = getWebsiteServices().slice();
                list.push({ id: Date.now(), title: title, category: category, image: image, description: description });
                setWebsiteServices(list).then(function () { webServForm.reset(); webServModal.classList.remove('open'); }).catch(function () { alert('Could not save service.'); });
            }
            if (file) { var reader = new FileReader(); reader.onload = function () { saveWebServ(reader.result); }; reader.readAsDataURL(file); }
            else { saveWebServ('https://via.placeholder.com/400x300?text=' + encodeURIComponent(title)); }
        });
    }

    // Blog post modal
    var addBlogBtn = document.getElementById('adminAddBlogPostBtn');
    var blogModal = document.getElementById('adminBlogPostModal');
    var blogForm = document.getElementById('adminBlogPostForm');
    if (addBlogBtn && blogModal) addBlogBtn.addEventListener('click', function () {
        if (blogForm) blogForm.reset();
        var dateEl = document.getElementById('blogPostDate');
        if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0, 10);
        blogModal.classList.add('open');
    });
    document.querySelectorAll('[data-close="adminBlogPostModal"]').forEach(function (el) { el.addEventListener('click', function () { if (blogModal) blogModal.classList.remove('open'); }); });
    if (blogModal) blogModal.addEventListener('click', function (e) { if (e.target === blogModal) blogModal.classList.remove('open'); });
    if (blogForm && typeof getWebsiteBlogPosts === 'function') {
        blogForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var title = document.getElementById('blogPostTitle').value;
            var date = document.getElementById('blogPostDate').value;
            var author = document.getElementById('blogPostAuthor').value;
            var excerpt = document.getElementById('blogPostExcerpt').value;
            var fileInput = document.getElementById('blogPostImage');
            var file = fileInput && fileInput.files[0];
            var editIdField = document.getElementById('blogPostEditId');
            var editId = editIdField ? editIdField.value : null;
            var modalTitle = blogModal.querySelector('h2');
            
            function savePost(image) {
                var posts = getWebsiteBlogPosts().slice();
                
                if (editId) {
                    // Edit existing post
                    var index = posts.findIndex(function (p) { return String(p.id) === String(editId); });
                    if (index !== -1) {
                        posts[index] = { 
                            id: posts[index].id, 
                            title: title, 
                            date: date, 
                            author: author || posts[index].author || '',
                            excerpt: excerpt, 
                            image: image || posts[index].image 
                        };
                    }
                } else {
                    // Create new post
                    posts.push({ id: Date.now(), title: title, date: date, author: author || '', excerpt: excerpt, image: image });
                }
                
                setWebsiteBlogPosts(posts).then(function () { 
                    blogForm.reset(); 
                    if (editIdField) editIdField.value = '';
                    if (modalTitle) modalTitle.textContent = 'Add Blog Post';
                    blogModal.classList.remove('open'); 
                }).catch(function () { alert('Could not save post.'); });
            }
            
            if (file) { 
                var reader = new FileReader(); 
                reader.onload = function () { savePost(reader.result); }; 
                reader.readAsDataURL(file); 
            } else if (editId) {
                // Keep existing image if editing and no new file
                var posts = getWebsiteBlogPosts();
                var existing = posts.find(function (p) { return String(p.id) === String(editId); });
                savePost(existing ? existing.image : 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(title));
            } else {
                savePost('https://via.placeholder.com/400x300?text=' + encodeURIComponent(title));
            }
        });
    }

    var lastLoginEl = document.getElementById('adminLastLogin');
    if (lastLoginEl) {
        var cu = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        lastLoginEl.textContent = cu && cu.loginTime ? new Date(cu.loginTime).toLocaleString() : '\u2014';
    }

    var admSet = getStored('adminSettings', {});
    var dueDaysEl = document.getElementById('settingInvoiceDueDays');
    var emailNotifEl = document.getElementById('settingEmailNotifications');
    var remindersEl = document.getElementById('settingInvoiceReminders');
    if (dueDaysEl && admSet.invoiceDueDays) dueDaysEl.value = admSet.invoiceDueDays;
    if (emailNotifEl) emailNotifEl.checked = admSet.emailNotif === '1' || admSet.emailNotif === true;
    if (remindersEl) remindersEl.checked = admSet.invoiceReminders === '1' || admSet.invoiceReminders === true;
    var settingsSaveBtn = document.getElementById('adminSettingsSave');
    if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener('click', function () {
            var s = getStored('adminSettings', {});
            var dd = document.getElementById('settingInvoiceDueDays');
            var en = document.getElementById('settingEmailNotifications');
            var re = document.getElementById('settingInvoiceReminders');
            if (dd) s.invoiceDueDays = dd.value;
            if (en) s.emailNotif = en.checked ? '1' : '0';
            if (re) s.invoiceReminders = re.checked ? '1' : '0';
            setStored('adminSettings', s);
            alert('Settings saved.');
            settingsSaveBtn.disabled = true;
            setTimeout(function () { settingsSaveBtn.disabled = false; }, 1000);
        });
    }

    // Statistics form handler
    var statisticsForm = document.getElementById('adminStatisticsForm');
    if (statisticsForm) {
        fetch(window.API_BASE + '/api/statistics')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data) {
                    var projectsDoneEl = document.getElementById('statProjectsDone');
                    var happyClientsEl = document.getElementById('statHappyClients');
                    var yearsExperienceEl = document.getElementById('statYearsExperience');
                    var teamMembersEl = document.getElementById('statTeamMembers');
                    if (projectsDoneEl) projectsDoneEl.value = data.projectsDone || 150;
                    if (happyClientsEl) happyClientsEl.value = data.happyClients || 80;
                    if (yearsExperienceEl) yearsExperienceEl.value = data.yearsExperience || 15;
                    if (teamMembersEl) teamMembersEl.value = data.teamMembers || 25;
                }
            })
            .catch(function (err) { console.error('Failed to load statistics:', err); });

        statisticsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var projectsDone = document.getElementById('statProjectsDone').value;
            var happyClients = document.getElementById('statHappyClients').value;
            var yearsExperience = document.getElementById('statYearsExperience').value;
            var teamMembers = document.getElementById('statTeamMembers').value;
            var token = sessionStorage.getItem('authToken');

            fetch(window.API_BASE + '/api/admin/statistics', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({
                    projectsDone: parseInt(projectsDone),
                    happyClients: parseInt(happyClients),
                    yearsExperience: parseInt(yearsExperience),
                    teamMembers: parseInt(teamMembers)
                })
            })
                .then(function (r) {
                    if (r.ok) {
                        alert('Statistics saved successfully.');
                        statisticsForm.reset();
                    } else {
                        throw new Error('Failed to save statistics');
                    }
                })
                .catch(function (err) {
                    console.error(err);
                    alert('Failed to save statistics. Please try again.');
                });
        });
    }

    setupCommunicationHub();
}

// ===== COMMUNICATION HUB =====

function setupCommunicationHub() {
    var newMessageBtn = document.getElementById('adminNewMessageBtn');
    var messageModal = document.getElementById('adminNewMessageModal');
    var messageForm = document.getElementById('adminNewMessageForm');
    var communicationTableBody = document.getElementById('adminCommunicationTableBody');
    if (newMessageBtn && messageModal) {
        newMessageBtn.addEventListener('click', function () { if (messageForm) messageForm.reset(); messageModal.classList.add('open'); });
    }
    document.querySelectorAll('[data-close="adminNewMessageModal"]').forEach(function (el) { el.addEventListener('click', function () { messageModal.classList.remove('open'); }); });
    if (messageModal) messageModal.addEventListener('click', function (e) { if (e.target === messageModal) messageModal.classList.remove('open'); });
    if (messageForm) {
        messageForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var communication = {
                id: Date.now(),
                type: document.getElementById('messageType').value,
                recipients: document.getElementById('messageRecipients').value,
                subject: document.getElementById('messageSubject').value,
                content: document.getElementById('messageContent').value,
                date: new Date().toISOString(), status: 'sent'
            };
            var communications = getStored('adminCommunications', []);
            communications.push(communication);
            setStored('adminCommunications', communications);
            renderCommunications(communicationTableBody, communications);
            messageModal.classList.remove('open');
            messageForm.reset();
        });
    }
    renderCommunications(communicationTableBody, getStored('adminCommunications', []));
}

function renderCommunications(tbody, communications) {
    if (!tbody) return;
    tbody.innerHTML = communications.length ? communications.map(function (comm) {
        return '<tr>' +
            '<td>' + escapeHtml(comm.subject) + '</td>' +
            '<td>' + escapeHtml(comm.participants || comm.recipients || '') + '</td>' +
            '<td><span class="type-' + escapeHtml(comm.type) + '">' + escapeHtml(comm.type) + '</span></td>' +
            '<td>' + new Date(comm.date).toLocaleDateString() + '</td>' +
            '<td><span class="status-' + escapeHtml(comm.status) + '">' + escapeHtml(comm.status) + '</span></td>' +
            '<td>' +
            '<button class="btn-icon" onclick="viewCommunication(' + comm.id + ')"><i class="fas fa-eye"></i></button> ' +
            '<button class="btn-icon" onclick="replyCommunication(' + comm.id + ')"><i class="fas fa-reply"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="6">No communications found</td></tr>';
}

window.viewCommunication = function (id) { alert('View communication functionality would open conversation'); };
window.replyCommunication = function (id) { alert('Reply functionality would open message composer'); };

// ===== SITE MANAGEMENT =====

function setupSiteManagement() {
    var addSiteVisitBtn = document.getElementById('adminAddSiteVisitBtn');
    var siteModal = document.getElementById('adminAddSiteVisitModal');
    var siteForm = document.getElementById('adminAddSiteVisitForm');
    var siteTableBody = document.getElementById('adminSiteManagementTableBody');
    if (addSiteVisitBtn && siteModal) {
        addSiteVisitBtn.addEventListener('click', function () { if (siteForm) siteForm.reset(); populateProjectDropdown('siteVisitProject'); siteModal.classList.add('open'); });
    }
    document.querySelectorAll('[data-close="adminAddSiteVisitModal"]').forEach(function (el) { el.addEventListener('click', function () { siteModal.classList.remove('open'); }); });
    if (siteModal) siteModal.addEventListener('click', function (e) { if (e.target === siteModal) siteModal.classList.remove('open'); });
    if (siteForm) {
        siteForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var siteVisit = {
                id: Date.now(),
                name: document.getElementById('siteVisitName').value,
                project: document.getElementById('siteVisitProject').value,
                visitDate: document.getElementById('siteVisitDate').value,
                visitType: document.getElementById('siteVisitType').value,
                progress: parseInt(document.getElementById('siteVisitProgress').value),
                issues: parseInt(document.getElementById('siteVisitIssues').value),
                nextVisit: document.getElementById('siteVisitNextDate').value,
                notes: document.getElementById('siteVisitNotes').value,
                lastVisit: new Date().toISOString()
            };
            var sites = getStored('adminSites', []);
            sites.push(siteVisit);
            setStored('adminSites', sites);
            renderSites(siteTableBody, sites);
            siteModal.classList.remove('open');
            siteForm.reset();
        });
    }
    renderSites(siteTableBody, getStored('adminSites', []));
}

function renderSites(tbody, sites) {
    if (!tbody) return;
    tbody.innerHTML = sites.length ? sites.map(function (site) {
        return '<tr>' +
            '<td>' + escapeHtml(site.name) + '</td>' +
            '<td>' + escapeHtml(getProjectName(site.project)) + '</td>' +
            '<td>' + new Date(site.lastVisit).toLocaleDateString() + '</td>' +
            '<td><div class="progress-bar"><div class="progress-fill" style="width:' + site.progress + '%"></div><span>' + site.progress + '%</span></div></td>' +
            '<td><span class="issues-' + site.issues + '">' + site.issues + ' issues</span></td>' +
            '<td>' + (site.nextVisit ? new Date(site.nextVisit).toLocaleDateString() : 'Not scheduled') + '</td>' +
            '<td>' +
            '<button class="btn-icon" onclick="viewSite(' + site.id + ')"><i class="fas fa-eye"></i></button> ' +
            '<button class="btn-icon" onclick="editSite(' + site.id + ')"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-icon" onclick="deleteSite(' + site.id + ')"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="7">No sites found</td></tr>';
}

window.viewSite = function (siteId) {
    var sites = getStored('adminSites', []);
    var site = sites.find(function (s) { return s.id === siteId; });
    if (site) alert('Site: ' + site.name + '\nProject: ' + getProjectName(site.project) + '\nProgress: ' + site.progress + '%\nIssues: ' + site.issues + '\nNotes: ' + (site.notes || 'No notes'));
};
window.editSite = function (siteId) {
    var sites = getStored('adminSites', []);
    var site = sites.find(function (s) { return s.id === siteId; });
    if (!site) return;
    document.getElementById('siteVisitName').value = site.name;
    document.getElementById('siteVisitType').value = site.visitType;
    document.getElementById('siteVisitProgress').value = site.progress;
    document.getElementById('siteVisitIssues').value = site.issues;
    document.getElementById('siteVisitNotes').value = site.notes || '';
    document.getElementById('siteVisitDate').value = site.visitDate;
    document.getElementById('siteVisitNextDate').value = site.nextVisit || '';
    populateProjectDropdown('siteVisitProject');
    setTimeout(function () { document.getElementById('siteVisitProject').value = site.project; }, 100);
    document.getElementById('adminAddSiteVisitModal').classList.add('open');
};
window.deleteSite = function (siteId) {
    if (!confirm('Delete this site visit record?')) return;
    var sites = getStored('adminSites', []).filter(function (s) { return s.id !== siteId; });
    setStored('adminSites', sites);
    renderSites(document.getElementById('adminSiteManagementTableBody'), sites);
};

// ===== FINANCIAL MANAGEMENT =====

function setupFinancialManagement() {
    var addFinancialBtn = document.getElementById('adminAddFinancialBtn');
    var exportBtn = document.getElementById('adminExportFinancialBtn');
    var financialModal = document.getElementById('adminFinancialModal');
    var financialForm = document.getElementById('adminFinancialForm');
    var financialTableBody = document.getElementById('adminFinancialTableBody');
    if (addFinancialBtn && financialModal) {
        addFinancialBtn.addEventListener('click', function () {
            if (financialForm) financialForm.reset();
            document.getElementById('adminFinancialModalTitle').textContent = 'Add Financial Entry';
            document.getElementById('financialId').value = '';
            financialModal.classList.add('open');
        });
    }
    if (exportBtn) exportBtn.addEventListener('click', exportFinancialData);
    document.querySelectorAll('[data-close="adminFinancialModal"]').forEach(function (el) { el.addEventListener('click', function () { financialModal.classList.remove('open'); }); });
    if (financialModal) financialModal.addEventListener('click', function (e) { if (e.target === financialModal) financialModal.classList.remove('open'); });
    if (financialForm) {
        financialForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var financialId = document.getElementById('financialId').value;
            var entry = {
                id: financialId || Date.now(),
                type: document.getElementById('financialType').value,
                description: document.getElementById('financialDescription').value,
                client: document.getElementById('financialClient').value,
                amount: parseFloat(document.getElementById('financialAmount').value),
                date: document.getElementById('financialDate').value,
                status: document.getElementById('financialStatus').value,
                category: document.getElementById('financialCategory').value
            };
            var financials = getStored('adminFinancials', []);
            if (financialId) {
                var idx = financials.findIndex(function (f) { return String(f.id) == String(financialId); });
                if (idx !== -1) financials[idx] = entry;
            } else {
                financials.push(entry);
                if (entry.type === 'invoice' && entry.status === 'pending') {
                    var approvals = getStored('adminApprovals', []);
                    approvals.push({ id: Date.now(), document: entry.description, type: 'invoice', project: entry.client, submittedBy: 'Admin', approvalType: 'financial', status: 'pending', submitted: new Date().toISOString(), financialId: entry.id });
                    setStored('adminApprovals', approvals);
                }
            }
            setStored('adminFinancials', financials);
            renderFinancials(financialTableBody, financials);
            updateFinancialSummary();
            financialModal.classList.remove('open');
            financialForm.reset();
        });
    }
    renderFinancials(financialTableBody, getStored('adminFinancials', []));
    updateFinancialSummary();
}

function renderFinancials(tbody, financials) {
    if (!tbody) return;
    tbody.innerHTML = financials.length ? financials.map(function (fin) {
        return '<tr>' +
            '<td><span class="type-' + escapeHtml(fin.type) + '">' + escapeHtml(fin.type) + '</span></td>' +
            '<td>' + escapeHtml(fin.description) + '</td>' +
            '<td>' + escapeHtml(fin.client) + '</td>' +
            '<td>$' + (fin.amount || 0).toLocaleString() + '</td>' +
            '<td>' + new Date(fin.date).toLocaleDateString() + '</td>' +
            '<td><span class="status-' + escapeHtml(fin.status) + '">' + escapeHtml(fin.status) + '</span></td>' +
            '<td>' + escapeHtml(fin.category) + '</td>' +
            '<td>' +
            '<button class="btn-icon" onclick="viewFinancial(' + fin.id + ')"><i class="fas fa-eye"></i></button> ' +
            '<button class="btn-icon" onclick="editFinancial(' + fin.id + ')"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-icon" onclick="deleteFinancial(' + fin.id + ')"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="8">No financial entries found</td></tr>';
}

function updateFinancialSummary() {
    var financials = getStored('adminFinancials', []);
    var totalRevenue = financials.filter(function (f) { return f.type === 'revenue' && (f.status || '').toLowerCase() === 'paid'; }).reduce(function (sum, f) { return sum + (f.amount || 0); }, 0);
    var pendingInvoices = financials.filter(function (f) { return f.type === 'invoice' && (f.status || '').toLowerCase() === 'pending'; }).reduce(function (sum, f) { return sum + (f.amount || 0); }, 0);
    var totalExpenses = financials.filter(function (f) { return f.type === 'expense'; }).reduce(function (sum, f) { return sum + (f.amount || 0); }, 0);
    var revenueEl = document.getElementById('totalRevenueAmount');
    var pendingEl = document.getElementById('pendingInvoiceAmount');
    var expensesEl = document.getElementById('totalExpenses');
    if (revenueEl) revenueEl.textContent = '$' + totalRevenue.toLocaleString();
    if (pendingEl) pendingEl.textContent = '$' + pendingInvoices.toLocaleString();
    if (expensesEl) expensesEl.textContent = '$' + totalExpenses.toLocaleString();
}

window.viewFinancial = function (finId) {
    var financials = getStored('adminFinancials', []);
    var fin = financials.find(function (f) { return f.id === finId; });
    if (fin) alert('Type: ' + fin.type + '\nDescription: ' + fin.description + '\nClient: ' + fin.client + '\nAmount: $' + fin.amount + '\nStatus: ' + fin.status + '\nCategory: ' + fin.category);
};
window.editFinancial = function (finId) {
    var financials = getStored('adminFinancials', []);
    var fin = financials.find(function (f) { return f.id === finId; });
    if (!fin) return;
    document.getElementById('adminFinancialModalTitle').textContent = 'Edit Financial Entry';
    document.getElementById('financialId').value = fin.id;
    document.getElementById('financialType').value = fin.type;
    document.getElementById('financialDescription').value = fin.description;
    document.getElementById('financialClient').value = fin.client;
    document.getElementById('financialAmount').value = fin.amount;
    document.getElementById('financialDate').value = fin.date;
    document.getElementById('financialStatus').value = fin.status;
    document.getElementById('financialCategory').value = fin.category;
    document.getElementById('adminFinancialModal').classList.add('open');
};
window.deleteFinancial = function (finId) {
    if (!confirm('Delete this financial entry?')) return;
    var financials = getStored('adminFinancials', []).filter(function (f) { return f.id !== finId; });
    setStored('adminFinancials', financials);
    renderFinancials(document.getElementById('adminFinancialTableBody'), financials);
    updateFinancialSummary();
};

function exportFinancialData() {
    var financials = getStored('adminFinancials', []);
    var headers = ['Type','Description','Client','Amount','Date','Status','Category'];
    var csvContent = [headers.join(',')].concat(financials.map(function (fin) {
        return [fin.type, '"' + fin.description + '"', '"' + fin.client + '"', fin.amount, fin.date, fin.status, fin.category].join(',');
    })).join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'financial_data_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===== MARKETING MANAGEMENT =====

function setupMarketingManagement() {
    var addPortfolioBtn = document.getElementById('adminAddPortfolioBtn');
    var marketingTableBody = document.getElementById('adminMarketingTableBody');
    var portfolioModal = document.getElementById('adminAddPortfolioModal');
    var portfolioForm = document.getElementById('adminAddPortfolioForm');
    if (addPortfolioBtn && portfolioModal) {
        addPortfolioBtn.addEventListener('click', function () { portfolioModal.classList.add('open'); });
    }
    document.querySelectorAll('[data-close="adminAddPortfolioModal"]').forEach(function (el) { el.addEventListener('click', function () { portfolioModal.classList.remove('open'); }); });
    if (portfolioModal) portfolioModal.addEventListener('click', function (e) { if (e.target === portfolioModal) portfolioModal.classList.remove('open'); });
    if (portfolioForm) {
        portfolioForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var portfolioItem = {
                id: Date.now(),
                title: document.getElementById('portfolioTitle').value,
                category: document.getElementById('portfolioCategory').value,
                client: document.getElementById('portfolioClient').value,
                location: document.getElementById('portfolioLocation').value,
                completionDate: document.getElementById('portfolioCompletionDate').value,
                value: document.getElementById('portfolioValue').value,
                description: document.getElementById('portfolioDescription').value,
                features: document.getElementById('portfolioFeatures').value,
                featured: document.getElementById('portfolioFeatured').checked,
                status: document.getElementById('portfolioStatus').value,
                views: Math.floor(Math.random() * 1000) + 100,
                inquiries: Math.floor(Math.random() * 50) + 5,
                createdAt: new Date().toISOString()
            };
            var items = getStored('adminPortfolio', []);
            items.push(portfolioItem);
            setStored('adminPortfolio', items);
            renderPortfolio(marketingTableBody, items);
            portfolioModal.classList.remove('open');
            portfolioForm.reset();
            alert('Portfolio item added successfully!');
        });
    }
    renderPortfolio(marketingTableBody, getStored('adminPortfolio', []));
}

function renderPortfolio(tbody, portfolioItems) {
    if (!tbody) return;
    tbody.innerHTML = portfolioItems.length ? portfolioItems.map(function (item) {
        return '<tr>' +
            '<td>' + escapeHtml(item.title) + '</td>' +
            '<td>' + escapeHtml(item.category) + '</td>' +
            '<td>' + item.views + '</td>' +
            '<td>' + item.inquiries + '</td>' +
            '<td><span class="featured-' + item.featured + '">' + (item.featured ? 'Yes' : 'No') + '</span></td>' +
            '<td>' +
            '<button class="btn-icon" onclick="viewPortfolio(' + item.id + ')"><i class="fas fa-eye"></i></button> ' +
            '<button class="btn-icon" onclick="editPortfolio(' + item.id + ')"><i class="fas fa-edit"></i></button> ' +
            '<button class="btn-icon" onclick="deletePortfolio(' + item.id + ')"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="6">No portfolio items found</td></tr>';
}

window.viewPortfolio = function (id) { alert('View portfolio functionality would open portfolio item'); };
window.editPortfolio = function (id) { alert('Edit portfolio functionality would open portfolio editor'); };
window.deletePortfolio = function (itemId) {
    if (!confirm('Delete this portfolio item?')) return;
    var items = getStored('adminPortfolio', []).filter(function (item) { return item.id !== itemId; });
    setStored('adminPortfolio', items);
    renderPortfolio(document.getElementById('adminMarketingTableBody'), items);
};

// ===== APPROVALS WORKFLOW =====

function setupApprovalsWorkflow() {
    var approvalsTableBody = document.getElementById('adminApprovalsWorkflowTableBody');
    renderApprovals(approvalsTableBody, getStored('adminApprovals', []));
}

function renderApprovals(tbody, approvals) {
    if (!tbody) return;
    tbody.innerHTML = approvals.length ? approvals.map(function (approval) {
        return '<tr>' +
            '<td>' + escapeHtml(approval.document) + '</td>' +
            '<td>' + escapeHtml(approval.type) + '</td>' +
            '<td>' + escapeHtml(approval.project) + '</td>' +
            '<td>' + escapeHtml(approval.submittedBy) + '</td>' +
            '<td>' + escapeHtml(approval.approvalType) + '</td>' +
            '<td><span class="status-' + escapeHtml(approval.status) + '">' + escapeHtml(approval.status) + '</span></td>' +
            '<td>' + new Date(approval.submitted).toLocaleDateString() + '</td>' +
            '<td>' +
            '<button class="btn-icon" onclick="viewApproval(' + approval.id + ')"><i class="fas fa-eye"></i></button> ' +
            '<button class="btn-icon" onclick="approveApproval(' + approval.id + ')"><i class="fas fa-check"></i></button> ' +
            '<button class="btn-icon" onclick="rejectApproval(' + approval.id + ')"><i class="fas fa-times"></i></button>' +
            '</td></tr>';
    }).join('') : '<tr><td colspan="8">No approvals pending</td></tr>';
}

window.viewApproval = function (id) { alert('View approval functionality would open document viewer'); };
window.approveApproval = function (approvalId) {
    if (!confirm('Approve this request?')) return;
    var approvals = getStored('adminApprovals', []);
    var approval = approvals.find(function (a) { return a.id === approvalId; });
    if (approval) { approval.status = 'approved'; setStored('adminApprovals', approvals); renderApprovals(document.getElementById('adminApprovalsWorkflowTableBody'), approvals); }
};
window.rejectApproval = function (approvalId) {
    var reason = prompt('Reason for rejection:');
    if (!reason) return;
    var approvals = getStored('adminApprovals', []);
    var approval = approvals.find(function (a) { return a.id === approvalId; });
    if (approval) { approval.status = 'rejected'; approval.rejectionReason = reason; setStored('adminApprovals', approvals); renderApprovals(document.getElementById('adminApprovalsWorkflowTableBody'), approvals); }
};

// ===== FAQ MANAGEMENT =====

function setupFAQManagement() {
    var addFAQBtn = document.getElementById('adminAddFAQBtn');
    var faqForm = document.getElementById('adminFAQForm');
    var addNewFAQForm = document.getElementById('addNewFAQForm');
    var cancelFAQBtn = document.getElementById('cancelFAQBtn');
    if (addFAQBtn) {
        addFAQBtn.addEventListener('click', function () {
            if (faqForm) faqForm.style.display = faqForm.style.display === 'none' ? 'block' : 'none';
        });
    }
    if (cancelFAQBtn) {
        cancelFAQBtn.addEventListener('click', function () {
            if (faqForm) { faqForm.style.display = 'none'; if (addNewFAQForm) addNewFAQForm.reset(); }
            var editId = document.getElementById('editFAQId');
            if (editId) editId.value = '';
            var formTitle = document.getElementById('faqFormTitle');
            if (formTitle) formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New FAQ';
            var submitBtn = document.getElementById('submitFAQBtn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> <span id="submitFAQText">Add FAQ</span>';
        });
    }
    if (addNewFAQForm) {
        addNewFAQForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var category = document.getElementById('newFAQCategory').value;
            var question = document.getElementById('newFAQQuestion').value;
            var answer = document.getElementById('newFAQAnswer').value;
            if (!category || !question || !answer) { alert('Please fill in all fields'); return; }
            var editId = document.getElementById('editFAQId');
            var isEdit = editId && editId.value;
            var url = isEdit ? '/api/faqs/' + category + '/' + editId.value : '/api/faqs';
            var method = isEdit ? 'PUT' : 'POST';
            apiFetch(url, { method: method, body: JSON.stringify({ category: category, question: question, answer: answer }) })
                .then(function (r) { return r.json().then(function (data) { if (!r.ok) throw data; return data; }); })
                .then(function () {
                    renderAdminFAQs();
                    addNewFAQForm.reset();
                    if (editId) editId.value = '';
                    if (faqForm) faqForm.style.display = 'none';
                    alert(isEdit ? 'FAQ updated successfully!' : 'FAQ added successfully!');
                })
                .catch(function (err) { alert('Error: ' + (err.error || err.message || 'Unknown error')); });
        });
    }
    renderAdminFAQs();
}

function renderAdminFAQs() {
    apiFetch('/api/faqs')
        .then(function (r) { return r.json().then(function (data) { if (!r.ok) throw data; return data; }); })
        .then(function (faqs) {
            var generalFAQs = faqs.general || [];
            var servicesFAQs = faqs.services || [];
            var processFAQs = faqs.process || [];
            updateFAQStatistics(generalFAQs, servicesFAQs, processFAQs);
            [['adminGeneralFAQs', generalFAQs, 'general'], ['adminServicesFAQs', servicesFAQs, 'services'], ['adminProcessFAQs', processFAQs, 'process']].forEach(function (item) {
                var container = document.getElementById(item[0]);
                var list = item[1];
                var cat = item[2];
                if (!container) return;
                container.innerHTML = list.length ? list.map(function (faq) { return createAdminFAQItem(faq, cat); }).join('') :
                    '<div class="faq-empty-state"><i class="fas fa-inbox"></i> No ' + cat + ' FAQs available.</div>';
            });
        })
        .catch(function () {
            ['adminGeneralFAQs','adminServicesFAQs','adminProcessFAQs'].forEach(function (id) {
                var container = document.getElementById(id);
                if (container) container.innerHTML = '<div class="faq-empty-state"><i class="fas fa-exclamation-triangle"></i> Error loading FAQs.</div>';
            });
        });
}

function updateFAQStatistics(generalFAQs, servicesFAQs, processFAQs) {
    var ids = { generalCount: generalFAQs.length, servicesCount: servicesFAQs.length, processCount: processFAQs.length,
        totalGeneralFAQs: generalFAQs.length, totalServicesFAQs: servicesFAQs.length, totalProcessFAQs: processFAQs.length,
        totalAllFAQs: generalFAQs.length + servicesFAQs.length + processFAQs.length };
    Object.keys(ids).forEach(function (id) { var el = document.getElementById(id); if (el) el.textContent = ids[id]; });
}

function createAdminFAQItem(faq, category) {
    return '<div class="faq-item"><div class="faq-item-content"><div class="faq-item-main">' +
        '<div class="faq-item-question">' + escapeHtml(faq.question) + '</div>' +
        '<div class="faq-item-answer">' + escapeHtml(faq.answer) + '</div></div>' +
        '<div class="faq-item-actions">' +
        '<button class="faq-action-btn edit" onclick="editFAQ(\'' + escapeAttr(category) + '\',\'' + escapeAttr(faq.id) + '\')" title="Edit FAQ"><i class="fas fa-edit"></i></button> ' +
        '<button class="faq-action-btn delete" onclick="deleteFAQ(\'' + escapeAttr(category) + '\',\'' + escapeAttr(faq.id) + '\')" title="Delete FAQ"><i class="fas fa-trash"></i></button>' +
        '</div></div></div>';
}

function editFAQ(category, id) {
    apiFetch('/api/faqs/' + category + '/' + id)
        .then(function (r) { return r.json().then(function (data) { if (!r.ok) throw data; return data; }); })
        .then(function (faq) {
            var faqForm = document.getElementById('adminFAQForm');
            if (faqForm) {
                faqForm.style.display = 'block';
                var editId = document.getElementById('editFAQId');
                if (editId) editId.value = faq.id;
                document.getElementById('newFAQCategory').value = category;
                document.getElementById('newFAQQuestion').value = faq.question;
                document.getElementById('newFAQAnswer').value = faq.answer;
                var formTitle = document.getElementById('faqFormTitle');
                if (formTitle) formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit FAQ';
                var submitBtn = document.getElementById('submitFAQBtn');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update FAQ';
            }
        })
        .catch(function (err) { alert('Error loading FAQ for editing: ' + (err.error || err.message || 'Unknown error')); });
}

function deleteFAQ(category, id) {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    apiFetch('/api/faqs/' + category + '/' + id, { method: 'DELETE' })
        .then(function (r) { return r.json().then(function (data) { if (!r.ok) throw data; return data; }); })
        .then(function () { renderAdminFAQs(); alert('FAQ deleted successfully!'); })
        .catch(function (err) { alert('Error deleting FAQ: ' + (err.error || err.message || 'Unknown error')); });
}

function setupNotificationButtons() {
    var path = window.location.pathname || '';
    
    // Setup notification button click handlers
    var notificationBtn = null;
    var modalId = null;
    
    if (path.indexOf('/admin/') !== -1) {
        notificationBtn = document.getElementById('adminNotificationsBtn');
        modalId = 'adminNotificationsModal';
    } else if (path.indexOf('/client/') !== -1) {
        notificationBtn = document.getElementById('clientNotificationBtn');
        modalId = 'clientNotificationsModal';
    } else if (path.indexOf('/employee/') !== -1) {
        notificationBtn = document.getElementById('employeeNotificationsBtn');
        modalId = 'employeeNotificationsModal';
    } else if (path.indexOf('/foreman/') !== -1) {
        notificationBtn = document.getElementById('foremanNotificationsBtn');
        modalId = 'foremanNotificationsModal';
    }
    
    if (notificationBtn && modalId) {
        notificationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openPortalNotificationsModal(modalId);
        });
    }
    
    // Initial badge refresh
    refreshNotificationsBadge();
    
    // Refresh badge every 30 seconds
    setInterval(refreshNotificationsBadge, 30000);
}