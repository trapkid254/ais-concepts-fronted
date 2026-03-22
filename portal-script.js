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

document.addEventListener('DOMContentLoaded', async function() {
    // Generic close modal: any .close-modal with data-close="modalId" closes that modal
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.close-modal');
        if (btn && btn.getAttribute('data-close')) {
            const modal = document.getElementById(btn.getAttribute('data-close'));
            if (modal) modal.classList.remove('open');
        }
    });
    // Click outside to close modals
    ['clientInvoiceViewModal', 'adminInvoiceViewModal', 'employeeTimeEditModal', 'adminInvoiceEditModal', 'clientProjectViewModal', 'clientUploadDocModal', 'employeeTaskUpdateModal', 'adminWebsiteProjectModal', 'adminWebsiteServiceModal'].forEach(function(id) {
        const m = document.getElementById(id);
        if (m) m.addEventListener('click', function(e) { if (e.target === m) m.classList.remove('open'); });
    });

    const path = window.location.pathname;
    const token = sessionStorage.getItem('authToken');
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!token || !currentUser) {
        var loginPage = path.includes('/client/') ? '../client/login.html' : '../staff/login.html';
        window.location.href = loginPage;
        return;
    }
    try {
        const r = await fetch((window.API_BASE || '') + '/api/portal/bootstrap', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (r.status === 401) {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            var loginPage401 = path.includes('/client/') ? '../client/login.html' : '../staff/login.html';
            window.location.href = loginPage401;
            return;
        }
        if (r.status === 403) {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            var loginPage403 = path.includes('/client/') ? '../client/login.html' : '../staff/login.html';
            window.location.href = loginPage403 + '?pending=1';
            return;
        }
        const data = await r.json();
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

    // Display user info in sidebar
    displayUserInfo(currentUser);
    
    // Determine which portal we're in and load appropriate data
    if (path.includes('/client/')) {
        loadClientDashboard();
    } else if (path.includes('/employee/')) {
        loadEmployeeDashboard();
    } else if (path.includes('/admin/')) {
        await loadAdminDashboard();
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }

    // Admin-specific forms and tables
    if (path.includes('/admin/')) {
        setupAdminInteractions(currentUser);
    }

    // Employee-specific forms and views
    if (path.includes('/employee/')) {
        setupEmployeeInteractions(currentUser);
    }

    // Sidebar "pages" navigation (show one section at a time) – client, admin, employee
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    const portalSections = document.querySelectorAll('.portal-section');

    if (sidebarLinks.length && portalSections.length) {
        // On load: show only first section (dashboard)
        const firstSectionId = sidebarLinks[0] && sidebarLinks[0].getAttribute('data-section');
        portalSections.forEach(sec => {
            sec.style.display = sec.id === firstSectionId ? '' : 'none';
        });

        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
                this.classList.add('active');
                portalSections.forEach(sec => {
                    sec.style.display = sec.id === sectionId ? '' : 'none';
                });
                if (sectionId === 'admin-analytics' && typeof initAdminCharts === 'function') initAdminCharts();
            });
        });
    }

    // Client support form (in-portal)
    if (path.includes('/client/')) {
        const supportForm = document.getElementById('clientSupportForm');
        if (supportForm) {
            supportForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const name = document.getElementById('supportName').value;
                const email = document.getElementById('supportEmail').value;
                const subject = document.getElementById('supportSubject').value;
                const message = document.getElementById('supportMessage').value;
                const tickets = getStored('clientSupportTickets', []);
                tickets.push({ name, email, subject, message, date: new Date().toISOString() });
                setStored('clientSupportTickets', tickets);
                supportForm.reset();
                if (currentUser) {
                    document.getElementById('supportName').value = currentUser.name || '';
                    document.getElementById('supportEmail').value = currentUser.email || '';
                }
                alert('Thank you. Your support request has been submitted. We will get back to you shortly.');
            });
        }
        // Client notification badge: show count only if messages > 0, click -> Messages section
        const clientNotificationBtn = document.getElementById('clientNotificationBtn');
        const clientCountEl = document.getElementById('clientNotificationCount');
        const clientMessages = getStored('portalMessages', []).filter(m => m.to === (currentUser && currentUser.email));
        if (clientCountEl) {
            if (clientMessages.length > 0) {
                clientCountEl.textContent = clientMessages.length > 99 ? '99+' : clientMessages.length;
                clientCountEl.style.display = 'inline-block';
            } else {
                clientCountEl.style.display = 'none';
            }
        }
        if (clientNotificationBtn) {
            clientNotificationBtn.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
                const messagesLink = document.querySelector('.sidebar-nav a[data-section="client-messages"]');
                if (messagesLink) {
                    messagesLink.classList.add('active');
                    document.querySelectorAll('.portal-section').forEach(sec => {
                        sec.style.display = sec.id === 'client-messages' ? '' : 'none';
                    });
                }
            });
        }
        setupPortalProfile('client', currentUser);
    }

    // Admin: notification click -> Messages section
    if (path.includes('/admin/')) {
        const adminNotificationsBtn = document.getElementById('adminNotificationsBtn');
        const adminCountEl = document.getElementById('adminNotificationCount');
        const adminMessages = getStored('portalMessages', []);
        const toMe = adminMessages.filter(m => m.to === (currentUser && currentUser.email));
        if (adminCountEl) {
            if (toMe.length > 0) {
                adminCountEl.textContent = toMe.length > 99 ? '99+' : toMe.length;
                adminCountEl.style.display = 'inline-block';
            } else {
                adminCountEl.style.display = 'none';
            }
        }
        if (adminNotificationsBtn) {
            adminNotificationsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
                const link = document.querySelector('.sidebar-nav a[data-section="admin-messages"]');
                if (link) {
                    link.classList.add('active');
                    document.querySelectorAll('.portal-section').forEach(sec => {
                        sec.style.display = sec.id === 'admin-messages' ? '' : 'none';
                    });
                }
            });
        }
        setupPortalProfile('admin', currentUser);
    }

    // Employee: notification badge count, click -> modal or section
    if (path.includes('/employee/')) {
        const empNotificationsBtn = document.getElementById('employeeNotificationsBtn');
        const empCountEl = document.getElementById('employeeNotificationCount');
        const empMessages = getStored('portalMessages', []).filter(m => m.to === (currentUser && currentUser.email));
        const empAssignments = getStored('assignments', []).filter(a => a.employeeEmail === (currentUser && currentUser.email));
        const empNotifCount = empMessages.length + empAssignments.length;
        if (empCountEl) {
            if (empNotifCount > 0) {
                empCountEl.textContent = empNotifCount > 99 ? '99+' : empNotifCount;
                empCountEl.style.display = 'inline-block';
            } else {
                empCountEl.style.display = 'none';
            }
        }
        if (empNotificationsBtn) {
            empNotificationsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const modal = document.getElementById('employeeNotificationsModal');
                if (modal) modal.classList.add('open');
            });
        }
        setupPortalProfile('employee', currentUser);
    }
});

function getProfileKey(email) {
    return email ? 'portalProfile_' + email.replace(/[^a-z0-9]/gi, '_') : null;
}
function setupPortalProfile(portal, currentUser) {
    if (!currentUser || !currentUser.email) return;
    const key = getProfileKey(currentUser.email);
    const prof = window.__portalUserProfile || {};
    const profile = {
        name: prof.name || currentUser.name,
        email: prof.email || currentUser.email,
        phone: prof.phone || '',
        avatar: prof.avatar || currentUser.avatar,
        password: prof.password || ''
    };
    const prefix = portal === 'client' ? 'client' : portal === 'admin' ? 'admin' : 'employee';
    const nameEl = document.getElementById(prefix + 'ProfileName');
    const emailEl = document.getElementById(prefix + 'ProfileEmail');
    const phoneEl = document.getElementById(prefix + 'ProfilePhone');
    const photoEl = document.getElementById(prefix + 'ProfilePhoto');
    const photoInput = document.getElementById(prefix + 'ProfilePhotoInput');
    const form = document.getElementById(prefix + 'ProfileForm');
    if (nameEl) nameEl.value = profile.name || currentUser.name || '';
    if (emailEl) emailEl.value = profile.email || currentUser.email || '';
    if (phoneEl) phoneEl.value = profile.phone || '';
    if (photoEl) photoEl.src = profile.avatar || currentUser.avatar || 'https://ui-avatars.com/api/?name=' + (profile.name || currentUser.email) + '&background=20c4b4&color=fff&size=128';
    if (photoInput && photoEl) {
        photoInput.addEventListener('change', function() {
            const f = this.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = function() {
                photoEl.src = r.result;
                currentUser.avatar = r.result;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                document.querySelectorAll('.user-avatar img').forEach(img => { img.src = r.result; });
            };
            r.readAsDataURL(f);
        });
    }
    if (form && key) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = (prefix === 'client' ? document.getElementById('clientProfileName') : prefix === 'admin' ? document.getElementById('adminProfileName') : document.getElementById('employeeProfileName')).value;
            const email = (prefix === 'client' ? document.getElementById('clientProfileEmail') : prefix === 'admin' ? document.getElementById('adminProfileEmail') : document.getElementById('employeeProfileEmail')).value;
            const phone = (prefix === 'client' ? document.getElementById('clientProfilePhone') : prefix === 'admin' ? document.getElementById('adminProfilePhone') : document.getElementById('employeeProfilePhone')).value;
            const newPass = (prefix === 'client' ? document.getElementById('clientProfileNewPassword') : prefix === 'admin' ? document.getElementById('adminProfileNewPassword') : document.getElementById('employeeProfileNewPassword')).value;
            const avatar = photoEl ? photoEl.src : profile.avatar;
            const token = sessionStorage.getItem('authToken');
            fetch((window.API_BASE || '') + '/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
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

function setupAdminInteractions(currentUser) {
    const assignForm = document.getElementById('assignProjectForm');
    const assignmentsBody = document.getElementById('assignmentsTableBody');
    const adminMessageForm = document.getElementById('adminMessageForm');
    const notificationsBtn = document.getElementById('adminNotificationsBtn');
    const notificationsModal = document.getElementById('adminNotificationsModal');
    const closeNotifications = document.getElementById('closeAdminNotifications');

    const assignments = getStored('assignments', []);
    renderAssignments(assignmentsBody, assignments);

    const newInvoiceBtn = document.getElementById('adminNewInvoiceBtn');
    const invoiceModal = document.getElementById('adminInvoiceModal');
    const invoiceForm = document.getElementById('adminInvoiceForm');
    if (newInvoiceBtn && invoiceModal) {
        newInvoiceBtn.addEventListener('click', function() { invoiceModal.classList.add('open'); });
    }
    document.querySelectorAll('[data-close="adminInvoiceModal"]').forEach(el => {
        el.addEventListener('click', function() { document.getElementById('adminInvoiceModal').classList.remove('open'); });
    });
    if (invoiceModal) invoiceModal.addEventListener('click', function(e) { if (e.target === invoiceModal) invoiceModal.classList.remove('open'); });
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const invoices = getStored('portalInvoices', []);
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
    const invoiceEditModal = document.getElementById('adminInvoiceEditModal');
    const invoiceEditForm = document.getElementById('adminInvoiceEditForm');
    if (invoiceEditModal) {
        document.querySelectorAll('[data-close="adminInvoiceEditModal"]').forEach(el => {
            el.addEventListener('click', function() { invoiceEditModal.classList.remove('open'); });
        });
        invoiceEditModal.addEventListener('click', function(e) { if (e.target === invoiceEditModal) invoiceEditModal.classList.remove('open'); });
    }
    if (invoiceEditForm) {
        invoiceEditForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const num = document.getElementById('invEditNumber').value;
            const invoices = getStored('portalInvoices', []);
            const idx = invoices.findIndex(function(i) { return i.number === num; });
            if (idx >= 0) {
                invoices[idx] = {
                    ...invoices[idx],
                    client: document.getElementById('invEditClient').value,
                    project: document.getElementById('invEditProject').value || '',
                    amount: document.getElementById('invEditAmount').value,
                    dueDate: document.getElementById('invEditDueDate').value,
                    status: document.getElementById('invEditStatus').value
                };
                setStored('portalInvoices', invoices);
                renderAdminInvoices(document.getElementById('adminInvoicesBody'));
                invoiceEditModal.classList.remove('open');
            }
        });
    }

    if (assignForm && assignmentsBody) {
        assignForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const project = document.getElementById('assignProjectName').value;
            const employeeEmail = document.getElementById('assignEmployeeEmail').value;
            const due = document.getElementById('assignDueDate').value;
            const notes = document.getElementById('assignNotes').value;
            const deadline = document.getElementById('assignDeadline') ? document.getElementById('assignDeadline').value : '';
            const updated = getStored('assignments', []);
            updated.push({ project, employeeEmail, due, deadline, notes });
            setStored('assignments', updated);
            renderAssignments(assignmentsBody, updated);
            assignForm.reset();
            alert('Project assigned.');
        });
    }

    const messages = getStored('portalMessages', []);
    renderMessagesAsCards(document.getElementById('adminMessagesListInner'), messages);

    if (adminMessageForm) {
        adminMessageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const to = document.getElementById('messageTo').value;
            const project = document.getElementById('messageProject').value;
            const bodyEl = document.getElementById('messageBody');
            const body = bodyEl ? (bodyEl.tagName === 'TEXTAREA' ? bodyEl.value : bodyEl.value) : '';
            const updated = getStored('portalMessages', []);
            updated.push({ from: currentUser ? currentUser.email : 'admin@demo.com', to, project, body, timestamp: new Date().toISOString() });
            setStored('portalMessages', updated);
            renderMessagesAsCards(document.getElementById('adminMessagesListInner'), updated);
            adminMessageForm.reset();
        });
    }

    if (notificationsBtn && notificationsModal) {
        notificationsBtn.addEventListener('click', function() { notificationsModal.classList.add('open'); });
    }
    if (closeNotifications && notificationsModal) {
        closeNotifications.addEventListener('click', function() { notificationsModal.classList.remove('open'); });
    }

    // Add User button & modal
    const addUserBtn = document.getElementById('adminAddUserBtn');
    const userModal = document.getElementById('adminUserModal');
    const userForm = document.getElementById('adminUserForm');
    const usersList = document.querySelector('.users-list tbody');
    if (addUserBtn && userModal) {
        addUserBtn.addEventListener('click', function() {
            document.getElementById('adminUserModalTitle').textContent = 'Add User';
            document.getElementById('adminUserId').value = '';
            if (userForm) userForm.reset();
            userModal.classList.add('open');
        });
    }
    document.querySelectorAll('[data-close="adminUserModal"]').forEach(el => {
        el.addEventListener('click', function() { document.getElementById('adminUserModal').classList.remove('open'); });
    });
    if (userModal) userModal.addEventListener('click', function(e) { if (e.target === userModal) userModal.classList.remove('open'); });
    if (userForm && userModal && usersList) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('adminUserId').value;
            const users = getStored('portalUsers', [
                { id: 1, name: 'John Client', email: 'john@client.com', role: 'Client', status: 'Active', lastLogin: '2024-03-18' },
                { id: 2, name: 'Sarah Employee', email: 'sarah@employee.com', role: 'Employee', status: 'Active', lastLogin: '2024-03-19' },
                { id: 3, name: 'Mike Admin', email: 'mike@admin.com', role: 'Admin', status: 'Active', lastLogin: '2024-03-19' },
                { id: 4, name: 'Emma Client', email: 'emma@client.com', role: 'Client', status: 'Inactive', lastLogin: '2024-03-10' }
            ]);
            const name = document.getElementById('adminUserName').value;
            const email = document.getElementById('adminUserEmail').value;
            const role = document.getElementById('adminUserRole').value;
            const status = document.getElementById('adminUserStatus').value;
            if (id) {
                const idx = users.findIndex(u => String(u.id) === id);
                if (idx >= 0) { users[idx] = { ...users[idx], name, email, role, status }; }
            } else {
                users.push({ id: Date.now(), name, email, role, status, lastLogin: '-' });
            }
            setStored('portalUsers', users);
            renderAdminUsers(usersList, users);
            userModal.classList.remove('open');
        });
    }

    // New Project button & modal
    const newProjectBtn = document.getElementById('adminNewProjectBtn');
    const projectModal = document.getElementById('adminProjectModal');
    const projectForm = document.getElementById('adminProjectForm');
    const projectsList = document.querySelector('.admin-projects tbody');
    if (newProjectBtn && projectModal) {
        newProjectBtn.addEventListener('click', function() {
            document.getElementById('adminProjectModalTitle').textContent = 'New Project';
            document.getElementById('adminProjectId').value = '';
            if (projectForm) projectForm.reset();
            projectModal.classList.add('open');
        });
    }
    const projectExitBtn = document.getElementById('adminProjectExitBtn');
    if (projectExitBtn && projectModal) {
        projectExitBtn.addEventListener('click', function() {
            projectModal.classList.remove('open');
        });
    }
    document.querySelectorAll('[data-close="adminProjectModal"]').forEach(el => {
        el.addEventListener('click', function() { document.getElementById('adminProjectModal').classList.remove('open'); });
    });
    if (projectModal) projectModal.addEventListener('click', function(e) { if (e.target === projectModal) projectModal.classList.remove('open'); });
    if (projectForm && projectModal && projectsList) {
        projectForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('adminProjectId').value;
            const projects = getStored('portalProjects', [
                { id: 1, name: 'Horizon Tower', client: 'ABC Corp', progress: 75, status: 'Active', budget: '$2.5M' },
                { id: 2, name: 'Eco-Sphere', client: 'Green Living', progress: 30, status: 'Active', budget: '$1.8M' },
                { id: 3, name: 'Nexus Center', client: 'City Council', progress: 90, status: 'Review', budget: '$4.2M' }
            ]);
            const name = document.getElementById('adminProjectName').value;
            const client = document.getElementById('adminProjectClient').value;
            const budget = document.getElementById('adminProjectBudget').value || '$0';
            const progress = parseInt(document.getElementById('adminProjectProgress').value, 10) || 0;
            const status = document.getElementById('adminProjectStatus').value;
            const category = document.getElementById('adminProjectCategory') ? document.getElementById('adminProjectCategory').value : 'Commercial';
            const moneyPaid = document.getElementById('adminProjectMoneyPaid') ? document.getElementById('adminProjectMoneyPaid').value : '';
            const moneyUsed = document.getElementById('adminProjectMoneyUsed') ? document.getElementById('adminProjectMoneyUsed').value : '';
            const moneyRemaining = document.getElementById('adminProjectMoneyRemaining') ? document.getElementById('adminProjectMoneyRemaining').value : '';
            const moneyOwed = document.getElementById('adminProjectMoneyOwed') ? document.getElementById('adminProjectMoneyOwed').value : '';
            if (id) {
                const idx = projects.findIndex(p => String(p.id) === id);
                if (idx >= 0) { projects[idx] = { ...projects[idx], name, client, budget, progress, status, category, moneyPaid, moneyUsed, moneyRemaining, moneyOwed }; }
            } else {
                projects.push({ id: Date.now(), name, client, budget, progress, status, category, moneyPaid, moneyUsed, moneyRemaining, moneyOwed });
            }
            setStored('portalProjects', projects);
            renderAdminProjects(projectsList, projects);
            projectModal.classList.remove('open');
        });
    }
    document.querySelectorAll('[data-close="adminViewProjectModal"]').forEach(el => {
        el.addEventListener('click', function() { document.getElementById('adminViewProjectModal').classList.remove('open'); });
    });
    const viewProjectModal = document.getElementById('adminViewProjectModal');
    if (viewProjectModal) viewProjectModal.addEventListener('click', function(e) { if (e.target === viewProjectModal) viewProjectModal.classList.remove('open'); });

    window.editUser = function(userId) {
        const users = getStored('portalUsers', []);
        const user = users.find(u => u.id === userId);
        if (!user) return;
        document.getElementById('adminUserModalTitle').textContent = 'Edit User';
        document.getElementById('adminUserId').value = user.id;
        document.getElementById('adminUserName').value = user.name;
        document.getElementById('adminUserEmail').value = user.email;
        document.getElementById('adminUserRole').value = user.role;
        document.getElementById('adminUserStatus').value = user.status || 'Active';
        document.getElementById('adminUserModal').classList.add('open');
    };
    window.deleteUser = function(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        const users = getStored('portalUsers', []).filter(u => u.id !== userId);
        setStored('portalUsers', users);
        renderAdminUsers(document.querySelector('.users-list tbody'), users);
    };
    window.editProject = function(projectId) {
        const projects = getStored('portalProjects', []);
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        document.getElementById('adminProjectModalTitle').textContent = 'Edit Project';
        document.getElementById('adminProjectId').value = project.id;
        document.getElementById('adminProjectName').value = project.name;
        document.getElementById('adminProjectClient').value = project.client;
        document.getElementById('adminProjectBudget').value = project.budget || '';
        document.getElementById('adminProjectProgress').value = project.progress || 0;
        document.getElementById('adminProjectStatus').value = project.status || 'Active';
        const catEl = document.getElementById('adminProjectCategory');
        if (catEl) catEl.value = project.category || 'Commercial';
        const moneyPaidEl = document.getElementById('adminProjectMoneyPaid');
        const moneyUsedEl = document.getElementById('adminProjectMoneyUsed');
        const moneyRemainingEl = document.getElementById('adminProjectMoneyRemaining');
        const moneyOwedEl = document.getElementById('adminProjectMoneyOwed');
        if (moneyPaidEl) moneyPaidEl.value = project.moneyPaid || '';
        if (moneyUsedEl) moneyUsedEl.value = project.moneyUsed || '';
        if (moneyRemainingEl) moneyRemainingEl.value = project.moneyRemaining || '';
        if (moneyOwedEl) moneyOwedEl.value = project.moneyOwed || '';
        document.getElementById('adminProjectModal').classList.add('open');
    };
    window.viewProject = function(projectId) {
        const projects = getStored('portalProjects', []);
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        document.getElementById('adminViewProjectContent').innerHTML = `
            <p><strong>Name:</strong> ${project.name}</p>
            <p><strong>Client:</strong> ${project.client}</p>
            <p><strong>Budget:</strong> ${project.budget}</p>
            <p><strong>Progress:</strong> ${project.progress}%</p>
            <p><strong>Status:</strong> ${project.status}</p>
            <p><strong>Money Paid:</strong> ${project.moneyPaid || '-'}</p>
            <p><strong>Money Used:</strong> ${project.moneyUsed || '-'}</p>
            <p><strong>Money Remaining:</strong> ${project.moneyRemaining || '-'}</p>
            <p><strong>Money Owed:</strong> ${project.moneyOwed || '-'}</p>
        `;
        document.getElementById('adminViewProjectModal').classList.add('open');
    };
}

function setupEmployeeInteractions(currentUser) {
    const assignmentsBody = document.getElementById('employeeAssignmentsBody');
    const progressForm = document.getElementById('employeeProgressForm');
    const progressList = document.getElementById('employeeProgressList');
    const notificationsBtn = document.getElementById('employeeNotificationsBtn');
    const notificationsModal = document.getElementById('employeeNotificationsModal');
    const closeNotifications = document.getElementById('closeEmployeeNotifications');

    const allAssignments = getStored('assignments', []);
    const myAssignments = currentUser
        ? allAssignments.filter(a => a.employeeEmail.toLowerCase() === currentUser.email.toLowerCase())
        : allAssignments;
    if (assignmentsBody) renderAssignments(assignmentsBody, myAssignments, true);
    var projectFilterTabs = document.querySelectorAll('#employeeProjectFilterTabs .filter-btn');
    projectFilterTabs.forEach(function(btn) {
        btn.addEventListener('click', function() {
            projectFilterTabs.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            window._employeeProjectFilter = btn.getAttribute('data-filter') || 'all';
            renderEmployeeAssignmentsTable(document.getElementById('employeeAssignmentsBody'), myAssignments);
        });
    });

    const allProgress = getStored('employeeProgress', []);
    const myProgress = currentUser
        ? allProgress.filter(p => p.employee.toLowerCase() === currentUser.email.toLowerCase())
        : allProgress;
    if (progressList) renderEmployeeProgress(progressList, myProgress);

    if (progressForm && progressList) {
        progressForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const project = document.getElementById('progressProject').value;
            const photoUrl = document.getElementById('progressPhotoUrl').value;
            const description = document.getElementById('progressDescription').value;
            const entry = { employee: currentUser ? currentUser.email : 'employee@demo.com', project, photoUrl, description, timestamp: new Date().toISOString() };
            const updated = getStored('employeeProgress', []); updated.push(entry); setStored('employeeProgress', updated);
            const myUpdated = currentUser ? updated.filter(p => p.employee.toLowerCase() === currentUser.email.toLowerCase()) : updated;
            renderEmployeeProgress(progressList, myUpdated);
            progressForm.reset();
        });
    }

    if (notificationsBtn && notificationsModal) {
        notificationsBtn.addEventListener('click', function() { notificationsModal.classList.add('open'); });
    }
    if (closeNotifications && notificationsModal) {
        closeNotifications.addEventListener('click', function() { notificationsModal.classList.remove('open'); });
    }

    // Update Task modal (image + description)
    const taskUpdateModal = document.getElementById('employeeTaskUpdateModal');
    const taskUpdateForm = document.getElementById('employeeTaskUpdateForm');
    const tasksList = document.querySelector('.tasks-list');
    document.querySelectorAll('[data-close="employeeTaskUpdateModal"]').forEach(el => {
        el.addEventListener('click', function() { document.getElementById('employeeTaskUpdateModal').classList.remove('open'); });
    });
    if (taskUpdateModal) taskUpdateModal.addEventListener('click', function(e) { if (e.target === taskUpdateModal) taskUpdateModal.classList.remove('open'); });
    if (taskUpdateForm && tasksList) {
        taskUpdateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const taskId = document.getElementById('taskUpdateId').value;
            const description = document.getElementById('taskUpdateDescription').value;
            const fileInput = document.getElementById('taskUpdateImage');
            const file = fileInput && fileInput.files[0];
            let imageData = null;
            if (file) {
                const reader = new FileReader();
                reader.onload = function() {
                    const updates = getStored('employeeTaskUpdates', []);
                    updates.push({ taskId: taskId, description: description, imageData: reader.result, date: new Date().toISOString() });
                    setStored('employeeTaskUpdates', updates);
                    taskUpdateForm.reset();
                    taskUpdateModal.classList.remove('open');
                    renderEmployeeTasks(tasksList, getStored('employeeTasks', null));
                };
                reader.readAsDataURL(file);
            } else {
                const updates = getStored('employeeTaskUpdates', []);
                updates.push({ taskId: taskId, description: description, imageData: null, date: new Date().toISOString() });
                setStored('employeeTaskUpdates', updates);
                taskUpdateForm.reset();
                taskUpdateModal.classList.remove('open');
                renderEmployeeTasks(tasksList, getStored('employeeTasks', null));
            }
        });
    }
    window.openTaskUpdateModal = function(taskId) {
        document.getElementById('taskUpdateId').value = taskId;
        document.getElementById('taskUpdateDescription').value = '';
        document.getElementById('taskUpdateImage').value = '';
        document.getElementById('employeeTaskUpdateModal').classList.add('open');
    };

    // Add Time Entry modal
    const timeModal = document.getElementById('employeeTimeModal');
    const timeForm = document.getElementById('employeeTimeForm');
    const timeEntriesBody = document.querySelector('.time-entries tbody');
    const addTimeBtn = document.getElementById('employeeAddTimeBtn');
    if (addTimeBtn && timeModal) {
        addTimeBtn.addEventListener('click', function() { timeModal.classList.add('open'); });
    }
    document.querySelectorAll('[data-close="employeeTimeModal"]').forEach(el => {
        el.addEventListener('click', function() { document.getElementById('employeeTimeModal').classList.remove('open'); });
    });
    if (timeModal) timeModal.addEventListener('click', function(e) { if (e.target === timeModal) timeModal.classList.remove('open'); });
    if (timeForm && timeEntriesBody) {
        timeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const entries = getStored('employeeTimeEntries', []);
            entries.push({
                date: document.getElementById('timeEntryDate').value,
                project: document.getElementById('timeEntryProject').value,
                description: document.getElementById('timeEntryDescription').value,
                hours: parseFloat(document.getElementById('timeEntryHours').value),
                employeeEmail: currentUser ? currentUser.email : 'employee@demo.com'
            });
            setStored('employeeTimeEntries', entries);
            renderEmployeeTimeEntries(timeEntriesBody, entries);
            timeForm.reset(); timeModal.classList.remove('open');
        });
    }

    // Time entry edit modal: close and submit
    const timeEditModal = document.getElementById('employeeTimeEditModal');
    const timeEditForm = document.getElementById('employeeTimeEditForm');
    if (timeEditModal) {
        document.querySelectorAll('[data-close="employeeTimeEditModal"]').forEach(el => {
            el.addEventListener('click', function() { timeEditModal.classList.remove('open'); });
        });
        timeEditModal.addEventListener('click', function(e) { if (e.target === timeEditModal) timeEditModal.classList.remove('open'); });
    }
    if (timeEditForm && timeEntriesBody) {
        timeEditForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const idx = parseInt(document.getElementById('timeEditIndex').value, 10);
            const entries = getStored('employeeTimeEntries', []);
            if (isNaN(idx) || idx < 0 || idx >= entries.length) {
                timeEditModal.classList.remove('open');
                return;
            }
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
}

function renderAssignments(tbody, assignments, hideEmployeeColumn) {
    if (!tbody) return;
    if (hideEmployeeColumn && tbody.id === 'employeeAssignmentsBody') {
        renderEmployeeAssignmentsTable(tbody, assignments);
        return;
    }
    tbody.innerHTML = assignments.map(a => `
        <tr>
            <td>${a.project}</td>
            ${hideEmployeeColumn ? '' : `<td>${a.employeeEmail}</td>`}
            <td>${a.due || '-'}</td>
            <td>${a.deadline || a.due || '-'}</td>
            <td>${a.notes || '-'}</td>
        </tr>
    `).join('');
}
function getEmployeeAssignmentStatus() {
    return getStored('employeeAssignmentStatus', {}) || {};
}
function setEmployeeAssignmentStatus(map) {
    setStored('employeeAssignmentStatus', map);
}
function renderEmployeeAssignmentsTable(tbody, assignments) {
    if (!tbody || tbody.id !== 'employeeAssignmentsBody') return;
    var statusMap = getEmployeeAssignmentStatus();
    var filter = (window._employeeProjectFilter || 'all');
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
    var filtered = assignments.filter(function(a) {
        var key = (a.project || '') + '|' + (a.employeeEmail || '');
        var st = statusMap[key] || 'not-started';
        if (filter === 'all') return true;
        if (filter === 'not-started') return st === 'not-started';
        if (filter === 'active') return st === 'active';
        if (filter === 'completed') return st === 'completed';
        return true;
    });
    tbody.innerHTML = filtered.map(function(a) {
        var key = (a.project || '') + '|' + (a.employeeEmail || '');
        var st = statusMap[key] || 'not-started';
        var due = a.due || '-';
        var deadline = a.deadline || a.due || '-';
        var timeline = timelineText(a.deadline || a.due);
        var action = st === 'not-started' ? '<button type="button" class="btn btn-sm btn-primary" onclick="startAssignment(\'' + key.replace(/'/g, "\\'") + '\')">Start</button>' :
            st === 'active' ? '<span class="status-badge status-pending">In progress</span> <button type="button" class="btn btn-sm btn-secondary" onclick="completeAssignment(\'' + key.replace(/'/g, "\\'") + '\')">Mark done</button>' :
            '<span class="status-badge status-paid">Done</span>';
        return '<tr><td>' + (a.project || '') + '</td><td>' + due + '</td><td>' + deadline + '</td><td>' + timeline + '</td><td>' + (a.notes || '-') + '</td><td>' + action + '</td></tr>';
    }).join('');
}
window.startAssignment = function(key) {
    var map = getEmployeeAssignmentStatus();
    map[key] = 'active';
    setEmployeeAssignmentStatus(map);
    var path = window.location.pathname || '';
    if (path.includes('/employee/')) {
        var assignments = getStored('assignments', []).filter(function(a) { return (a.employeeEmail === (JSON.parse(sessionStorage.getItem('currentUser') || '{}').email)); });
        renderEmployeeAssignmentsTable(document.getElementById('employeeAssignmentsBody'), assignments);
    }
};
window.completeAssignment = function(key) {
    var map = getEmployeeAssignmentStatus();
    map[key] = 'completed';
    setEmployeeAssignmentStatus(map);
    var path = window.location.pathname || '';
    if (path.includes('/employee/')) {
        var assignments = getStored('assignments', []).filter(function(a) { return (a.employeeEmail === (JSON.parse(sessionStorage.getItem('currentUser') || '{}').email)); });
        renderEmployeeAssignmentsTable(document.getElementById('employeeAssignmentsBody'), assignments);
    }
};

function renderMessages(tbody, messages) {
    if (!tbody) return;
    tbody.innerHTML = messages.slice().reverse().map(m => `
        <tr>
            <td>${m.from}</td>
            <td>${m.to}</td>
            <td>${m.project || '-'}</td>
            <td>${m.body}</td>
        </tr>
    `).join('');
}

function renderMessagesAsCards(container, messages) {
    if (!container) return;
    container.innerHTML = messages.slice().reverse().map(m => `
        <div class="message-card">
            <div class="message-from">${m.from} → ${m.to}</div>
            <div class="message-meta">${m.project ? 'Project: ' + m.project + ' · ' : ''}${m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</div>
            <div class="message-body">${m.body}</div>
        </div>
    `).join('') || '<p class="empty-state">No messages yet.</p>';
}

function renderEmployeeProgress(container, progressEntries) {
    if (!container) return;
    container.innerHTML = progressEntries.slice().reverse().map(p => `
        <div class="deadline-item">
            <i class="fas fa-image" style="color: var(--primary);"></i>
            <div>
                <strong>${p.project}</strong>
                <p>${p.description}</p>
                ${p.photoUrl ? `<p><a href="${p.photoUrl}" target="_blank">View photo</a></p>` : ''}
            </div>
        </div>
    `).join('');
}

function displayUserInfo(user) {
    // Update all instances of user info across pages
    document.querySelectorAll('.user-avatar img').forEach(img => {
        img.src = user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=20c4b4&color=fff&size=128`;
    });
    
    document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = user.name || user.email.split('@')[0];
    });
    
    document.querySelectorAll('.user-email').forEach(el => {
        el.textContent = user.email;
    });
    
    document.querySelectorAll('.user-role').forEach(el => {
        el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        // Add role-specific styling
        el.className = `user-role role-${user.role}`;
    });
}

function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

// ===== CLIENT PORTAL FUNCTIONS =====
function loadClientDashboard() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    const defaultProjects = [
        { id: 1, name: 'Horizon Tower', image: '../images/project1.jpg', progress: 75, status: 'In Progress', nextMilestone: 'Foundation Complete', completionDate: 'Dec 2024', description: '45-story landmark with dynamic facade.', moneyPaid: '', moneyUsed: '', moneyRemaining: '', moneyOwed: '' },
        { id: 2, name: 'Eco-Sphere Residence', image: '../images/project2.jpg', progress: 30, status: 'Design Phase', nextMilestone: 'Permit Approval', completionDate: 'Mar 2025', description: 'Net-zero carbon home with living walls.', moneyPaid: '', moneyUsed: '', moneyRemaining: '', moneyOwed: '' }
    ];
    var portalProjects = getStored('portalProjects', []);
    var clientEmail = currentUser && (currentUser.email || '').toLowerCase();
    var clientName = (currentUser && currentUser.name) || '';
    var fromPortal = portalProjects.filter(function(p) {
        var c = (p.client || '').toLowerCase();
        return c === clientEmail || c === clientName.toLowerCase() || (p.client && currentUser && p.client.indexOf('@') !== -1 && p.client === currentUser.email);
    });
    var projects;
    if (fromPortal.length) {
        projects = fromPortal.map(function(p, i) {
            return {
                id: p.id,
                name: p.name,
                image: p.image || '../images/project1.jpg',
                progress: p.progress || 0,
                status: p.status || 'Active',
                nextMilestone: p.nextMilestone || '-',
                completionDate: p.completionDate || '-',
                description: p.description || '',
                moneyPaid: p.moneyPaid || '-',
                moneyUsed: p.moneyUsed || '-',
                moneyRemaining: p.moneyRemaining || '-',
                moneyOwed: p.moneyOwed || '-'
            };
        });
        setStored('clientProjects', projects);
    } else {
        projects = getStored('clientProjects', null);
        if (!projects || !projects.length) {
            setStored('clientProjects', defaultProjects);
            projects = defaultProjects;
        }
    }
    const projectsContainer = document.getElementById('clientProjectsGrid');
    if (projectsContainer) {
        projectsContainer.innerHTML = projects.map(project => `
            <div class="project-card">
                <div class="project-image">
                    <img src="${project.image}" alt="${project.name}" onerror="this.src='https://via.placeholder.com/400x300?text=${project.name.replace(/ /g, '+')}'">
                </div>
                <div class="project-details">
                    <h3>${project.name}</h3>
                    <p>Status: <span class="status-badge status-${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span></p>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${project.progress}%"></div></div>
                    <p>Progress: ${project.progress}%</p>
                    <p><strong>Next Milestone:</strong> ${project.nextMilestone}</p>
                    <p><strong>Est. Completion:</strong> ${project.completionDate}</p>
                    <button class="btn btn-primary" onclick="viewProjectDetails(${project.id})">View Details</button>
                </div>
            </div>
        `).join('');
    }

    const defaultDocs = [
        { name: 'Contract Agreement.pdf', date: '2024-01-15', size: '2.4 MB' },
        { name: 'Floor Plans - Rev 3.pdf', date: '2024-02-20', size: '5.1 MB' },
        { name: 'Permit Application.pdf', date: '2024-03-01', size: '1.8 MB' }
    ];
    let documents = getStored('clientDocuments', null);
    if (!documents || !documents.length) {
        setStored('clientDocuments', defaultDocs);
        documents = defaultDocs;
    }
    function renderClientDocuments() {
        const docs = getStored('clientDocuments', defaultDocs);
        const documentsList = document.getElementById('clientDocumentsBody');
        if (documentsList) {
            documentsList.innerHTML = docs.map(doc => `
                <tr>
                    <td><i class="fas fa-file-pdf" style="color: #ff6b6b;"></i> ${doc.name}</td>
                    <td>${doc.date}</td>
                    <td>${doc.size}</td>
                    <td><button class="btn-icon" onclick="downloadDocument('${doc.name.replace(/'/g, "\\'")}')"><i class="fas fa-download"></i></button></td>
                </tr>
            `).join('');
        }
    }
    renderClientDocuments();
    const uploadDocBtn = document.getElementById('clientUploadDocBtn');
    const uploadDocModal = document.getElementById('clientUploadDocModal');
    const uploadDocForm = document.getElementById('clientUploadDocForm');
    if (uploadDocBtn && uploadDocModal) uploadDocBtn.addEventListener('click', function() { uploadDocModal.classList.add('open'); });
    document.querySelectorAll('[data-close="clientUploadDocModal"]').forEach(function(el) {
        el.addEventListener('click', function() { document.getElementById('clientUploadDocModal').classList.remove('open'); });
    });
    if (uploadDocModal) uploadDocModal.addEventListener('click', function(e) { if (e.target === uploadDocModal) uploadDocModal.classList.remove('open'); });
    if (uploadDocForm) {
        uploadDocForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('clientDocName').value.trim() || 'Document';
            const fileInput = document.getElementById('clientDocFile');
            const file = fileInput && fileInput.files[0];
            let size = '0 KB';
            let data = null;
            if (file) {
                size = file.size < 1024 ? file.size + ' B' : (file.size / 1024).toFixed(1) + ' KB';
                const reader = new FileReader();
                reader.onload = function() {
                    const docs = getStored('clientDocuments', []);
                    docs.push({ name: name, date: new Date().toISOString().slice(0, 10), size: size, data: reader.result });
                    setStored('clientDocuments', docs);
                    renderClientDocuments();
                    uploadDocForm.reset();
                    uploadDocModal.classList.remove('open');
                };
                reader.readAsDataURL(file);
            } else {
                const docs = getStored('clientDocuments', []);
                docs.push({ name: name, date: new Date().toISOString().slice(0, 10), size: size });
                setStored('clientDocuments', docs);
                renderClientDocuments();
                uploadDocForm.reset();
                uploadDocModal.classList.remove('open');
            }
        });
    }

    const defaultClientInvoices = [
        { number: 'INV-2024-001', amount: '$25,000', date: '2024-02-01', status: 'Paid', client: 'Client', project: 'Horizon Tower' },
        { number: 'INV-2024-002', amount: '$15,000', date: '2024-03-01', status: 'Pending', client: 'Client', project: 'Eco-Sphere' },
        { number: 'INV-2024-003', amount: '$30,000', date: '2024-04-01', status: 'Due', client: 'Client', project: 'Nexus Center' }
    ];
    let clientInvoices = getStored('clientInvoices', null);
    if (!clientInvoices || !clientInvoices.length) {
        setStored('clientInvoices', defaultClientInvoices);
        clientInvoices = defaultClientInvoices;
    }
    const invoicesList = document.getElementById('clientInvoicesBody');
    if (invoicesList) {
        invoicesList.innerHTML = clientInvoices.map(invoice => `
            <tr>
                <td>${invoice.number}</td>
                <td>${invoice.amount}</td>
                <td>${invoice.date}</td>
                <td><span class="status-badge status-${(invoice.status || '').toLowerCase()}">${invoice.status}</span></td>
                <td><button class="btn-icon" onclick="viewInvoice('${invoice.number}')" title="View"><i class="fas fa-eye"></i></button> <button class="btn-icon" onclick="downloadClientInvoice('${invoice.number}')" title="Download"><i class="fas fa-download"></i></button></td>
            </tr>
        `).join('');
    }

    const timelineList = document.getElementById('clientTimelineList');
    if (timelineList) {
        const milestones = [
            { title: 'Foundation Complete - Horizon Tower', date: '2024-04-15' },
            { title: 'Permit Approval - Eco-Sphere', date: '2024-05-01' },
            { title: 'Design Review - Horizon Tower', date: '2024-06-10' }
        ];
        timelineList.innerHTML = milestones.map(m => `
            <div class="deadline-item">
                <i class="fas fa-calendar-alt" style="color: var(--primary);"></i>
                <div><strong>${m.title}</strong><p>${m.date}</p></div>
            </div>
        `).join('');
    }

    const messagesList = document.getElementById('clientMessagesList');
    if (messagesList) {
        const messages = getStored('portalMessages', []).filter(m => m.to === (currentUser && currentUser.email));
        messagesList.innerHTML = messages.length ? messages.slice().reverse().map(m => `
            <div class="message-card">
                <div class="message-from">From: ${m.from}</div>
                <div class="message-meta">${m.project ? 'Project: ' + m.project + ' · ' : ''}${m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</div>
                <div class="message-body">${m.body}</div>
            </div>
        `).join('') : '<p class="empty-state">No messages yet.</p>';
    }

    const supportName = document.getElementById('supportName');
    const supportEmail = document.getElementById('supportEmail');
    if (currentUser && supportName) supportName.value = currentUser.name || '';
    if (currentUser && supportEmail) supportEmail.value = currentUser.email || '';
}

function renderEmployeeTasks(container, tasks) {
    if (!container) return;
    const list = tasks && tasks.length ? tasks : [
        { id: 1, title: 'Update Horizon Tower floor plans', project: 'Horizon Tower', priority: 'High', dueDate: '2024-03-20', assignedBy: 'Sarah Johnson' },
        { id: 2, title: 'Submit permit application for Eco-Sphere', project: 'Eco-Sphere Residence', priority: 'Medium', dueDate: '2024-03-22', assignedBy: 'Michael Chen' },
        { id: 3, title: 'Review material samples', project: 'Nexus Center', priority: 'Low', dueDate: '2024-03-25', assignedBy: 'David Williams' }
    ];
    if (!tasks || !tasks.length) setStored('employeeTasks', list);
    const updates = getStored('employeeTaskUpdates', []);
    container.innerHTML = (tasks && tasks.length ? tasks : list).map(task => {
        const taskUpdates = updates.filter(u => String(u.taskId) === String(task.id));
        const lastUpdate = taskUpdates.length ? taskUpdates[taskUpdates.length - 1] : null;
        return `
        <div class="task-item">
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">Project: ${task.project} | Due: ${task.dueDate} | Assigned by: ${task.assignedBy || '-'}</div>
                ${lastUpdate ? '<div class="task-last-update"><small>Last update: ' + (lastUpdate.description || '').slice(0, 60) + (lastUpdate.imageData ? ' [Photo]' : '') + '</small></div>' : ''}
            </div>
            <div class="task-priority priority-${(task.priority || 'Medium').toLowerCase()}">${task.priority || 'Medium'}</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openTaskUpdateModal(${task.id})"><i class="fas fa-upload"></i> Update</button>
        </div>
    `;
    }).join('');
}

function renderEmployeeTimeEntries(tbody, entries) {
    if (!tbody) return;
    const list = entries && entries.length ? entries : [
        { date: '2024-03-18', project: 'Horizon Tower', hours: 6.5, description: 'Drafting revisions' },
        { date: '2024-03-18', project: 'Eco-Sphere', hours: 2.0, description: 'Client meeting' },
        { date: '2024-03-17', project: 'Horizon Tower', hours: 8.0, description: 'Model updates' }
    ];
    if (!entries || !entries.length) setStored('employeeTimeEntries', list);
    const data = entries && entries.length ? entries : list;
    tbody.innerHTML = data.map((entry, index) => `
        <tr>
            <td>${entry.date}</td>
            <td>${entry.project}</td>
            <td>${entry.description}</td>
            <td>${entry.hours}</td>
            <td><button class="btn-icon" onclick="editTimeEntry(${index})"><i class="fas fa-edit"></i></button></td>
        </tr>
    `).join('');
    var remEl = document.getElementById('employeeTimeRemaining');
    if (remEl) {
        var now = new Date();
        var mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        var weekStart = mon.toISOString().slice(0, 10);
        var weekEnd = new Date(mon); weekEnd.setDate(mon.getDate() + 6);
        weekEnd = weekEnd.toISOString().slice(0, 10);
        var weekHours = data.filter(function(e) { return e.date >= weekStart && e.date <= weekEnd; }).reduce(function(sum, e) { return sum + (parseFloat(e.hours) || 0); }, 0);
        var cap = 40;
        var remaining = Math.max(0, cap - weekHours);
        remEl.innerHTML = '<p><strong>This week:</strong> ' + weekHours.toFixed(1) + ' hours logged &middot; <strong>' + remaining.toFixed(1) + ' hours remaining</strong> (out of ' + cap + 'h)</p>';
        remEl.className = 'time-remaining-bar';
    }
}

// ===== EMPLOYEE PORTAL FUNCTIONS =====
function loadEmployeeDashboard() {
    const tasks = getStored('employeeTasks', null);
    renderEmployeeTasks(document.querySelector('.tasks-list'), tasks);

    const timeEntries = getStored('employeeTimeEntries', null);
    renderEmployeeTimeEntries(document.querySelector('.time-entries tbody'), timeEntries);

    var currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    var myAssignments = (getStored('assignments', [])).filter(function(a) { return a.employeeEmail && currentUser && a.employeeEmail.toLowerCase() === currentUser.email.toLowerCase(); });
    var deadlinesList = document.getElementById('employeeScheduleDeadlines');
    if (deadlinesList) {
        if (myAssignments.length) {
            deadlinesList.innerHTML = myAssignments.slice(0, 10).map(function(a) {
                var d = a.deadline || a.due;
                return '<div class="deadline-item"><i class="fas fa-calendar-alt" style="color: var(--primary);"></i><div><strong>' + (a.project || '') + '</strong><p>Due: ' + (d || '-') + '</p></div></div>';
            }).join('');
        } else {
            deadlinesList.innerHTML = '<div class="deadline-item"><i class="fas fa-calendar-alt"></i><div><strong>No upcoming deadlines</strong><p>Assignments from admin will appear here.</p></div></div>';
        }
    }
    var timesheetBody = document.getElementById('employeeTimesheetBody');
    if (timesheetBody) {
        var entries = getStored('employeeTimeEntries', []);
        var now = new Date();
        var mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        var weekStart = mon.toISOString().slice(0, 10);
        var weekEnd = new Date(mon); weekEnd.setDate(mon.getDate() + 6);
        weekEnd = weekEnd.toISOString().slice(0, 10);
        var weekEntries = entries.filter(function(e) { return e.date >= weekStart && e.date <= weekEnd; });
        timesheetBody.innerHTML = weekEntries.length ? weekEntries.map(function(e) {
            return '<tr><td>' + (e.date || '') + '</td><td>' + (e.project || '') + '</td><td>' + (e.description || '') + '</td><td>' + (e.hours || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="4">No entries this week. Add time from Time Tracking.</td></tr>';
    }
    document.querySelectorAll('a[data-section="employee-time"]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav a').forEach(function(a) { a.classList.remove('active'); });
            var timeLink = document.querySelector('.sidebar-nav a[data-section="employee-time"]');
            if (timeLink) { timeLink.classList.add('active'); }
            document.querySelectorAll('.portal-section').forEach(function(sec) { sec.style.display = 'none'; });
            var sec = document.getElementById('employee-time');
            if (sec) sec.style.display = 'block';
        });
    });
}

function renderAdminUsers(tbody, users) {
    if (!tbody) return;
    const list = users && users.length ? users : [
        { id: 1, name: 'John Client', email: 'john@client.com', role: 'Client', status: 'Active', lastLogin: '2024-03-18' },
        { id: 2, name: 'Sarah Employee', email: 'sarah@employee.com', role: 'Employee', status: 'Active', lastLogin: '2024-03-19' },
        { id: 3, name: 'Mike Admin', email: 'mike@admin.com', role: 'Admin', status: 'Active', lastLogin: '2024-03-19' },
        { id: 4, name: 'Emma Client', email: 'emma@client.com', role: 'Client', status: 'Inactive', lastLogin: '2024-03-10' }
    ];
    if (!users || !users.length) setStored('portalUsers', list);
    tbody.innerHTML = (users && users.length ? users : list).map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="user-role role-${(user.role || '').toLowerCase()}">${user.role}</span></td>
            <td><span class="status-badge status-${(user.status || 'Active').toLowerCase()}">${user.status || 'Active'}</span></td>
            <td>${user.lastLogin || '-'}</td>
            <td>
                <button class="btn-icon" onclick="editUser(${user.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderAdminProjects(tbody, projects) {
    if (!tbody) return;
    const list = projects && projects.length ? projects : [
        { id: 1, name: 'Horizon Tower', client: 'ABC Corp', progress: 75, status: 'Active', budget: '$2.5M' },
        { id: 2, name: 'Eco-Sphere', client: 'Green Living', progress: 30, status: 'Active', budget: '$1.8M' },
        { id: 3, name: 'Nexus Center', client: 'City Council', progress: 90, status: 'Review', budget: '$4.2M' }
    ];
    if (!projects || !projects.length) setStored('portalProjects', list);
    tbody.innerHTML = (projects && projects.length ? projects : list).map(project => `
        <tr>
            <td>${project.name}</td>
            <td>${project.client}</td>
            <td>${project.budget || '-'}</td>
            <td><div style="width: 100px;"><div class="progress-bar"><div class="progress-fill" style="width: ${project.progress || 0}%"></div></div></div></td>
            <td><span class="status-badge status-${(project.status || 'Active').toLowerCase()}">${project.status || 'Active'}</span></td>
            <td>
                <button class="btn-icon" onclick="editProject(${project.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="viewProject(${project.id})"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderAdminInvoices(tbody) {
    if (!tbody) return;
    const defaultInvoices = [
        { id: 1, number: 'INV-2024-001', client: 'ABC Corp', project: 'Horizon Tower', amount: '$25,000', dueDate: '2024-02-01', status: 'Paid' },
        { id: 2, number: 'INV-2024-002', client: 'Green Living', project: 'Eco-Sphere', amount: '$15,000', dueDate: '2024-03-01', status: 'Pending' },
        { id: 3, number: 'INV-2024-003', client: 'City Council', project: 'Nexus Center', amount: '$30,000', dueDate: '2024-04-01', status: 'Due' }
    ];
    let invoices = getStored('portalInvoices', null);
    if (!invoices || !invoices.length) {
        setStored('portalInvoices', defaultInvoices);
        invoices = defaultInvoices;
    }
    tbody.innerHTML = invoices.map(inv => `
        <tr>
            <td>${inv.number}</td>
            <td>${inv.client}</td>
            <td>${inv.project || '-'}</td>
            <td>${inv.amount}</td>
            <td>${inv.dueDate}</td>
            <td><span class="status-badge status-${(inv.status || 'Pending').toLowerCase()}">${inv.status}</span></td>
            <td><button class="btn-icon" onclick="viewInvoice('${inv.number}')"><i class="fas fa-eye"></i></button> <button class="btn-icon" onclick="editInvoice('${inv.number}')"><i class="fas fa-edit"></i></button></td>
        </tr>
    `).join('');
}
function editInvoice(invoiceNumber) {
    const invoices = getStored('portalInvoices', []);
    const inv = invoices.find(function(i) { return i.number === invoiceNumber; });
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

var adminChartsInited = false;
function initAdminCharts() {
    if (typeof Chart === 'undefined' || adminChartsInited) return;
    const lineCtx = document.getElementById('chartLine');
    const pieCtx = document.getElementById('chartPie');
    const barCtx = document.getElementById('chartBar');
    if (!lineCtx || !pieCtx || !barCtx) return;
    adminChartsInited = true;
    if (lineCtx) {
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{ label: 'Revenue ($K)', data: [120, 190, 180, 220, 240, 280], borderColor: '#20c4b4', fill: true, backgroundColor: 'rgba(32,196,180,0.1)' }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Active', 'Review', 'Completed'],
                datasets: [{ data: [12, 5, 8], backgroundColor: ['#20c4b4', '#ffd43b', '#51cf66'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    if (barCtx) {
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Users', 'Projects', 'Invoices'],
                datasets: [{ label: 'Count', data: [156, 25, 48], backgroundColor: '#20c4b4' }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}

function renderAdminWebsiteProjects() {
    var tbody = document.getElementById('adminWebsiteProjectsBody');
    if (!tbody || typeof getWebsiteProjects !== 'function') return;
    var list = getWebsiteProjects();
    tbody.innerHTML = list.length ? list.map(function(p) {
        var desc = (p.description || '').slice(0, 50) + ((p.description || '').length > 50 ? '...' : '');
        return '<tr><td>' + (p.title || '') + '</td><td>' + (p.category || '') + '</td><td>' + desc + '</td><td><button type="button" class="btn-icon" onclick="deleteWebsiteProject(' + p.id + ')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('') : '<tr><td colspan="4">No website projects. Add one above.</td></tr>';
}
function renderAdminWebsiteServices() {
    var tbody = document.getElementById('adminWebsiteServicesBody');
    if (!tbody || typeof getWebsiteServices !== 'function') return;
    var list = getWebsiteServices();
    tbody.innerHTML = list.length ? list.map(function(s) {
        var desc = (s.description || '').slice(0, 50) + ((s.description || '').length > 50 ? '...' : '');
        return '<tr><td>' + (s.title || '') + '</td><td>' + (s.category || '') + '</td><td>' + desc + '</td><td><button type="button" class="btn-icon" onclick="deleteWebsiteService(' + s.id + ')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('') : '<tr><td colspan="4">No website services. Add one above.</td></tr>';
}
window.deleteWebsiteProject = function(id) {
    if (typeof getWebsiteProjects !== 'function' || typeof setWebsiteProjects !== 'function') return;
    if (!confirm('Delete this website project?')) return;
    var list = getWebsiteProjects().filter(function(p) { return String(p.id) !== String(id); });
    setWebsiteProjects(list).then(function () {
        renderAdminWebsiteProjects();
    }).catch(function () {
        alert('Could not save changes.');
    });
};
window.deleteWebsiteService = function(id) {
    if (typeof getWebsiteServices !== 'function' || typeof setWebsiteServices !== 'function') return;
    if (!confirm('Delete this website service?')) return;
    var list = getWebsiteServices().filter(function(s) { return String(s.id) !== String(id); });
    setWebsiteServices(list).then(function () {
        renderAdminWebsiteServices();
    }).catch(function () {
        alert('Could not save changes.');
    });
};

function renderAdminBlogPosts() {
    var tbody = document.getElementById('adminBlogPostsBody');
    if (!tbody || typeof getWebsiteBlogPosts !== 'function') return;
    var posts = getWebsiteBlogPosts();
    tbody.innerHTML = posts.length ? posts.map(function(p) {
        var ex = (p.excerpt || '').slice(0, 50) + ((p.excerpt || '').length > 50 ? '...' : '');
        return '<tr><td>' + (p.title || '') + '</td><td>' + (p.date || '') + '</td><td>' + ex + '</td><td><button type=\"button\" class=\"btn-icon\" onclick=\"deleteBlogPost(' + p.id + ')\" title=\"Delete\"><i class=\"fas fa-trash\"></i></button></td></tr>';
    }).join('') : '<tr><td colspan=\"4\">No blog posts. Add one above.</td></tr>';
}
window.deleteBlogPost = function(id) {
    if (typeof getWebsiteBlogPosts !== 'function' || typeof setWebsiteBlogPosts !== 'function') return;
    if (!confirm('Delete this blog post?')) return;
    var posts = getWebsiteBlogPosts().filter(function(p) { return String(p.id) !== String(id); });
    setWebsiteBlogPosts(posts).then(function () {
        renderAdminBlogPosts();
    }).catch(function () {
        alert('Could not save changes.');
    });
};

async function renderAdminEnquiries() {
    var tbody = document.getElementById('adminEnquiriesBody');
    if (!tbody) return;
    var list = [];
    try {
        var r = await fetch((window.API_BASE || '') + '/api/admin/enquiries', {
            headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') }
        });
        if (r.ok) list = await r.json();
    } catch (e) {
        list = [];
    }
    tbody.innerHTML = list.length ? list.slice().reverse().map(function(e) {
        return '<tr><td>' + (e.name || '') + '</td><td>' + (e.contact || '') + '</td><td>' + (e.type || '') + '</td><td>' + (e.location || '') + '</td><td>' + (e.timeline || '-') + '</td><td>' + (e.budget || '-') + '</td><td>' + (e.date ? new Date(e.date).toLocaleDateString() : '') + '</td></tr>';
    }).join('') : '<tr><td colspan=\"7\">No enquiries yet.</td></tr>';
}

// ===== ADMIN PORTAL FUNCTIONS =====
async function renderPendingApprovals() {
    var tbody = document.getElementById('adminPendingApprovalsBody');
    if (!tbody) return;
    var API_BASE = window.API_BASE || '';
    var token = sessionStorage.getItem('authToken');
    try {
        var r = await fetch(API_BASE + '/api/admin/pending-users', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!r.ok) {
            tbody.innerHTML = '<tr><td colspan="5">Could not load pending accounts.</td></tr>';
            return;
        }
        var list = await r.json();
        tbody.innerHTML = list.length
            ? list
                  .map(function (u) {
                      return (
                          '<tr><td>' +
                          (u.name || '') +
                          '</td><td>' +
                          (u.email || '') +
                          '</td><td>' +
                          (u.role || '') +
                          '</td><td>' +
                          (u.createdAt ? new Date(u.createdAt).toLocaleString() : '') +
                          '</td><td><button type="button" class="btn btn-primary" data-approve-id="' +
                          u.id +
                          '">Approve</button></td></tr>'
                      );
                  })
                  .join('')
            : '<tr><td colspan="5">No pending accounts.</td></tr>';
        tbody.querySelectorAll('[data-approve-id]').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var id = btn.getAttribute('data-approve-id');
                var r2 = await fetch(API_BASE + '/api/admin/users/' + id + '/approve', {
                    method: 'POST',
                    headers: { Authorization: 'Bearer ' + token }
                });
                if (r2.ok) {
                    await renderPendingApprovals();
                    alert('Account approved.');
                } else {
                    alert('Could not approve.');
                }
            });
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5">Error loading list.</td></tr>';
    }
}

async function loadAdminDashboard() {
    try {
        if (typeof loadWebsiteProjects === 'function') await loadWebsiteProjects();
        if (typeof loadWebsiteServices === 'function') await loadWebsiteServices();
        if (typeof loadWebsiteBlogPosts === 'function') await loadWebsiteBlogPosts();
    } catch (e) {
        console.warn(e);
    }
    const users = getStored('portalUsers', null);
    const projects = getStored('portalProjects', null);
    renderAdminUsers(document.querySelector('.users-list tbody'), users);
    renderAdminProjects(document.querySelector('.admin-projects tbody'), projects);
    renderAdminInvoices(document.getElementById('adminInvoicesBody'));
    const careersBody = document.getElementById('adminCareersBody');
    if (careersBody) {
        let apps = [];
        try {
            const r = await fetch((window.API_BASE || '') + '/api/admin/career-applications', {
                headers: { Authorization: 'Bearer ' + sessionStorage.getItem('authToken') }
            });
            if (r.ok) apps = await r.json();
        } catch (e) {
            apps = getStored('careerApplications', []);
        }
        careersBody.innerHTML = apps.length ? apps.map(function(a) {
            return '<tr><td>' + (a.name || '') + '</td><td>' + (a.email || '') + '</td><td>' + (a.type || '') + '</td><td>' + (a.campus || '-') + '</td><td>' + (a.yearOfStudy || '-') + '</td><td>' + (a.date ? new Date(a.date).toLocaleDateString() : '') + '</td></tr>';
        }).join('') : '<tr><td colspan="6">No applications yet.</td></tr>';
    }
    const totalUsersEl = document.getElementById('totalUsers');
    const activeProjectsEl = document.getElementById('activeProjects');
    if (totalUsersEl) totalUsersEl.textContent = (users && users.length) ? users.length : 156;
    if (activeProjectsEl) activeProjectsEl.textContent = (projects && projects.length) ? projects.length : 23;
    const totalRevenue = document.getElementById('totalRevenue');
    const pendingTasks = document.getElementById('pendingTasks');
    if (totalRevenue) totalRevenue.textContent = '$2.4M';
    if (pendingTasks) pendingTasks.textContent = '47';
    var contentStatsEl = document.getElementById('adminContentStats');
    if (contentStatsEl) contentStatsEl.innerHTML = 'Portal projects: ' + (projects && projects.length ? projects.length : 0) + ' &middot; Invoices: ' + (getStored('portalInvoices', []).length) + ' &middot; Career applications: ' + (getStored('careerApplications', []).length);
    if (typeof getWebsiteProjects === 'function') renderAdminWebsiteProjects();
    if (typeof getWebsiteServices === 'function') renderAdminWebsiteServices();
    if (typeof getWebsiteBlogPosts === 'function') renderAdminBlogPosts();
    await renderAdminEnquiries();
    await renderPendingApprovals();
    var addWebProjBtn = document.getElementById('adminAddWebsiteProjectBtn');
    var addWebServBtn = document.getElementById('adminAddWebsiteServiceBtn');
    var webProjModal = document.getElementById('adminWebsiteProjectModal');
    var webServModal = document.getElementById('adminWebsiteServiceModal');
    var webProjForm = document.getElementById('adminWebsiteProjectForm');
    var webServForm = document.getElementById('adminWebsiteServiceForm');
    if (addWebProjBtn && webProjModal) addWebProjBtn.addEventListener('click', function() { webProjForm.reset(); webProjModal.classList.add('open'); });
    if (addWebServBtn && webServModal) addWebServBtn.addEventListener('click', function() { webServForm.reset(); webServModal.classList.add('open'); });
    document.querySelectorAll('[data-close="adminWebsiteProjectModal"]').forEach(function(el) { el.addEventListener('click', function() { webProjModal.classList.remove('open'); }); });
    document.querySelectorAll('[data-close="adminWebsiteServiceModal"]').forEach(function(el) { el.addEventListener('click', function() { webServModal.classList.remove('open'); }); });
    if (webProjModal) webProjModal.addEventListener('click', function(e) { if (e.target === webProjModal) webProjModal.classList.remove('open'); });
    if (webServModal) webServModal.addEventListener('click', function(e) { if (e.target === webServModal) webServModal.classList.remove('open'); });
    if (webProjForm && typeof getWebsiteProjects === 'function') {
        webProjForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var title = document.getElementById('webProjectTitle').value;
            var category = document.getElementById('webProjectCategory').value;
            var description = document.getElementById('webProjectDescription').value;
            var fileInput = document.getElementById('webProjectImage');
            var file = fileInput && fileInput.files[0];
            var image = file ? null : 'https://via.placeholder.com/600x400?text=' + encodeURIComponent(title);
            if (file) {
                var reader = new FileReader();
                reader.onload = function() {
                    var list = getWebsiteProjects().slice();
                    list.push({ id: Date.now(), title: title, category: category, categorySecondary: '', image: reader.result, description: description });
                    setWebsiteProjects(list).then(function () {
                        renderAdminWebsiteProjects();
                        webProjForm.reset();
                        webProjModal.classList.remove('open');
                    }).catch(function () {
                        alert('Could not save project.');
                    });
                };
                reader.readAsDataURL(file);
            } else {
                var list = getWebsiteProjects().slice();
                list.push({ id: Date.now(), title: title, category: category, categorySecondary: '', image: image, description: description });
                setWebsiteProjects(list).then(function () {
                    renderAdminWebsiteProjects();
                    webProjForm.reset();
                    webProjModal.classList.remove('open');
                }).catch(function () {
                    alert('Could not save project.');
                });
            }
        });
    }
    if (webServForm && typeof getWebsiteServices === 'function') {
        webServForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var title = document.getElementById('webServiceTitle').value;
            var category = document.getElementById('webServiceCategory').value;
            var description = document.getElementById('webServiceDescription').value;
            var fileInput = document.getElementById('webServiceImage');
            var file = fileInput && fileInput.files[0];
            var image = file ? null : 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(title);
            if (file) {
                var reader = new FileReader();
                reader.onload = function() {
                    var list = getWebsiteServices().slice();
                    list.push({ id: Date.now(), title: title, category: category, image: reader.result, description: description });
                    setWebsiteServices(list).then(function () {
                        renderAdminWebsiteServices();
                        webServForm.reset();
                        webServModal.classList.remove('open');
                    }).catch(function () {
                        alert('Could not save service.');
                    });
                };
                reader.readAsDataURL(file);
            } else {
                var list = getWebsiteServices().slice();
                list.push({ id: Date.now(), title: title, category: category, image: image, description: description });
                setWebsiteServices(list).then(function () {
                    renderAdminWebsiteServices();
                    webServForm.reset();
                    webServModal.classList.remove('open');
                }).catch(function () {
                    alert('Could not save service.');
                });
            }
        });
    }
    var lastLoginEl = document.getElementById('adminLastLogin');
    if (lastLoginEl) {
        var cu = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        lastLoginEl.textContent = cu && cu.loginTime ? new Date(cu.loginTime).toLocaleString() : '—';
    }
    var dueDaysEl = document.getElementById('settingInvoiceDueDays');
    var emailNotifEl = document.getElementById('settingEmailNotifications');
    var remindersEl = document.getElementById('settingInvoiceReminders');
    var admSet = getStored('adminSettings', {});
    if (dueDaysEl && admSet.invoiceDueDays) dueDaysEl.value = admSet.invoiceDueDays;
    if (emailNotifEl) emailNotifEl.checked = admSet.emailNotif === '1' || admSet.emailNotif === true;
    if (remindersEl) remindersEl.checked = admSet.invoiceReminders === '1' || admSet.invoiceReminders === true;
    var settingsSaveBtn = document.getElementById('adminSettingsSave');
    if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener('click', function() {
            var dueDays = document.getElementById('settingInvoiceDueDays');
            var emailNotif = document.getElementById('settingEmailNotifications');
            var reminders = document.getElementById('settingInvoiceReminders');
            var s = getStored('adminSettings', {});
            if (dueDays) s.invoiceDueDays = dueDays.value;
            if (emailNotif) s.emailNotif = emailNotif.checked ? '1' : '0';
            if (reminders) s.invoiceReminders = reminders.checked ? '1' : '0';
            setStored('adminSettings', s);
            alert('Settings saved.');
        });
    }

    // Blog post modal handlers (admin content)
    var addBlogBtn = document.getElementById('adminAddBlogPostBtn');
    var blogModal = document.getElementById('adminBlogPostModal');
    var blogForm = document.getElementById('adminBlogPostForm');
    if (addBlogBtn && blogModal) addBlogBtn.addEventListener('click', function() {
        if (blogForm) blogForm.reset();
        var dateEl = document.getElementById('blogPostDate');
        if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0, 10);
        blogModal.classList.add('open');
    });
    document.querySelectorAll('[data-close=\"adminBlogPostModal\"]').forEach(function(el) {
        el.addEventListener('click', function() { if (blogModal) blogModal.classList.remove('open'); });
    });
    if (blogModal) blogModal.addEventListener('click', function(e) { if (e.target === blogModal) blogModal.classList.remove('open'); });
    if (blogForm && typeof getWebsiteBlogPosts === 'function') {
        blogForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var title = document.getElementById('blogPostTitle').value;
            var date = document.getElementById('blogPostDate').value;
            var excerpt = document.getElementById('blogPostExcerpt').value;
            var fileInput = document.getElementById('blogPostImage');
            var file = fileInput && fileInput.files[0];
            function add(image) {
                var posts = getWebsiteBlogPosts().slice();
                posts.push({ id: Date.now(), title: title, date: date, excerpt: excerpt, image: image });
                setWebsiteBlogPosts(posts).then(function () {
                    renderAdminBlogPosts();
                    blogForm.reset();
                    blogModal.classList.remove('open');
                }).catch(function () {
                    alert('Could not save post.');
                });
            }
            if (file) {
                var reader = new FileReader();
                reader.onload = function() { add(reader.result); };
                reader.readAsDataURL(file);
            } else {
                add('https://via.placeholder.com/400x300?text=' + encodeURIComponent(title));
            }
        });
    }
}

// ===== HELPER FUNCTIONS =====
function viewProjectDetails(projectId) {
    var defaultProjects = [
        { id: 1, name: 'Horizon Tower', image: '../images/project1.jpg', progress: 75, status: 'In Progress', nextMilestone: 'Foundation Complete', completionDate: 'Dec 2024', description: '45-story landmark with dynamic facade.' },
        { id: 2, name: 'Eco-Sphere Residence', image: '../images/project2.jpg', progress: 30, status: 'Design Phase', nextMilestone: 'Permit Approval', completionDate: 'Mar 2025', description: 'Net-zero carbon home with living walls.' }
    ];
    var raw = getStored('clientProjects', defaultProjects);
    var projects = Array.isArray(raw) ? raw : defaultProjects;
    var p = projects.find(function(proj) { return proj.id === projectId || String(proj.id) === String(projectId); });
    var modal = document.getElementById('clientProjectViewModal');
    var content = document.getElementById('clientProjectViewContent');
    if (!modal || !content) return;
    if (!p) {
        content.innerHTML = '<p>Project not found.</p>';
    } else {
        content.innerHTML = '<table class="invoice-view-table">' +
            '<tr><th>Project</th><td>' + (p.name || '') + '</td></tr>' +
            '<tr><th>Status</th><td><span class="status-badge status-' + (p.status || '').toLowerCase().replace(/\s/g, '-') + '">' + (p.status || '') + '</span></td></tr>' +
            '<tr><th>Progress</th><td>' + (p.progress || 0) + '%</td></tr>' +
            '<tr><th>Next Milestone</th><td>' + (p.nextMilestone || '-') + '</td></tr>' +
            '<tr><th>Est. Completion</th><td>' + (p.completionDate || '-') + '</td></tr>' +
            '<tr><th>Money Paid</th><td>' + (p.moneyPaid !== undefined && p.moneyPaid !== null && p.moneyPaid !== '' ? p.moneyPaid : '-') + '</td></tr>' +
            '<tr><th>Money Used</th><td>' + (p.moneyUsed !== undefined && p.moneyUsed !== null && p.moneyUsed !== '' ? p.moneyUsed : '-') + '</td></tr>' +
            '<tr><th>Money Remaining</th><td>' + (p.moneyRemaining !== undefined && p.moneyRemaining !== null && p.moneyRemaining !== '' ? p.moneyRemaining : '-') + '</td></tr>' +
            '<tr><th>Money Owed</th><td>' + (p.moneyOwed !== undefined && p.moneyOwed !== null && p.moneyOwed !== '' ? p.moneyOwed : '-') + '</td></tr>' +
            (p.description ? '<tr><th>Description</th><td>' + p.description + '</td></tr>' : '') +
            '</table>';
    }
    modal.classList.add('open');
}

function downloadDocument(docName) {
    const docs = getStored('clientDocuments', []);
    const doc = docs.find(function(d) { return d.name === docName; });
    if (doc && doc.data) {
        try {
            const a = document.createElement('a');
            a.href = doc.data;
            a.download = docName;
            a.click();
        } catch (e) {
            window.open(doc.data, '_blank');
        }
    } else {
        const blob = new Blob(['Placeholder for ' + docName + '. Uploaded documents will download here.'], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = docName.replace(/\.pdf$/i, '') + '-details.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    }
}
function downloadClientInvoice(invoiceNumber) {
    const invoices = getStored('clientInvoices', []);
    const inv = invoices.find(function(i) { return i.number === invoiceNumber; });
    if (!inv) return;
    const text = 'Invoice ' + (inv.number || '') + '\nAmount: ' + (inv.amount || '') + '\nDate: ' + (inv.date || '') + '\nStatus: ' + (inv.status || '') + '\n' + (inv.project ? 'Project: ' + inv.project + '\n' : '');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invoice-' + (inv.number || 'inv') + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
}

function viewInvoice(invoiceNumber) {
    const path = window.location.pathname || '';
    if (path.includes('/client/')) {
        const invoices = getStored('clientInvoices', []);
        const inv = invoices.find(function(i) { return i.number === invoiceNumber; });
        const content = document.getElementById('clientInvoiceViewContent');
        const modal = document.getElementById('clientInvoiceViewModal');
        if (content && modal) {
            content.innerHTML = inv ? (
                '<table class="invoice-view-table"><tr><th>Invoice #</th><td>' + (inv.number || '') + '</td></tr>' +
                '<tr><th>Amount</th><td>' + (inv.amount || '') + '</td></tr>' +
                '<tr><th>Date</th><td>' + (inv.date || '') + '</td></tr>' +
                '<tr><th>Status</th><td><span class="status-badge status-' + (inv.status || 'pending').toLowerCase() + '">' + (inv.status || '') + '</span></td></tr>' +
                (inv.client ? '<tr><th>Client</th><td>' + inv.client + '</td></tr>' : '') +
                (inv.project ? '<tr><th>Project</th><td>' + inv.project + '</td></tr>' : '') +
                '</table>'
            ) : '<p>Invoice not found.</p>';
            const actionsEl = document.getElementById('clientInvoiceViewActions');
            if (actionsEl && inv) {
                actionsEl.innerHTML = '<button type="button" class="btn btn-primary" onclick="downloadClientInvoice(\'' + (inv.number || '') + '\')"><i class="fas fa-download"></i> Download Invoice</button>';
            } else if (actionsEl) actionsEl.innerHTML = '';
            modal.classList.add('open');
        }
    } else if (path.includes('/admin/')) {
        const invoices = getStored('portalInvoices', []);
        const inv = invoices.find(function(i) { return i.number === invoiceNumber; });
        const content = document.getElementById('adminInvoiceViewContent');
        const modal = document.getElementById('adminInvoiceViewModal');
        if (content && modal) {
            content.innerHTML = inv ? (
                '<table class="invoice-view-table"><tr><th>Invoice #</th><td>' + (inv.number || '') + '</td></tr>' +
                '<tr><th>Client</th><td>' + (inv.client || '') + '</td></tr>' +
                '<tr><th>Project</th><td>' + (inv.project || '-') + '</td></tr>' +
                '<tr><th>Amount</th><td>' + (inv.amount || '') + '</td></tr>' +
                '<tr><th>Due Date</th><td>' + (inv.dueDate || '') + '</td></tr>' +
                '<tr><th>Status</th><td><span class="status-badge status-' + (inv.status || 'pending').toLowerCase() + '">' + (inv.status || '') + '</span></td></tr></table>'
            ) : '<p>Invoice not found.</p>';
            modal.classList.add('open');
        }
    }
}

function toggleTask(element, taskId) {
    element.classList.toggle('completed');
    alert(`Task #${taskId} status updated`);
}

function editTimeEntry(entryId) {
    const entries = getStored('employeeTimeEntries', []);
    const entry = entries[entryId];
    if (!entry) return;
    const modal = document.getElementById('employeeTimeEditModal');
    const idxEl = document.getElementById('timeEditIndex');
    const dateEl = document.getElementById('timeEditDate');
    const projectEl = document.getElementById('timeEditProject');
    const descEl = document.getElementById('timeEditDescription');
    const hoursEl = document.getElementById('timeEditHours');
    if (idxEl) idxEl.value = entryId;
    if (dateEl) dateEl.value = entry.date || '';
    if (projectEl) projectEl.value = entry.project || '';
    if (descEl) descEl.value = entry.description || '';
    if (hoursEl) hoursEl.value = entry.hours || '';
    if (modal) modal.classList.add('open');
}
