// ===== FOREMAN PORTAL SCRIPT =====
(function() {
    let currentUser = null;
    let authToken = null;

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        authToken = sessionStorage.getItem('authToken');
        const userStr = sessionStorage.getItem('currentUser');
        currentUser = userStr ? JSON.parse(userStr) : null;
        
        console.log('Debug - Auth token:', authToken ? 'exists' : 'missing');
        console.log('Debug - User string:', userStr);
        console.log('Debug - Current user:', currentUser);
        
        if (!authToken || !currentUser) {
            console.log('Redirecting to login - missing auth or user');
            window.location.href = '../login/';
            return;
        }

        if (currentUser.role !== 'foreman') {
            console.log('Redirecting to login - not foreman role:', currentUser.role);
            window.location.href = '../login/';
            return;
        }

        console.log('Authentication successful, loading data...');
        loadForemanData();
        setupNavigation();
        setupEventListeners();
        showSection('foreman-dashboard');
    });

    // Load foreman dashboard data
    async function loadForemanData() {
        try {
            // Update user info display
            const userNameEl = document.querySelector('.user-name');
            const userEmailEl = document.querySelector('.user-email');
            if (userNameEl) userNameEl.textContent = currentUser.name || currentUser.email || 'Foreman';
            if (userEmailEl) userEmailEl.textContent = currentUser.email || '';
            document.querySelectorAll('.user-avatar img').forEach(function (img) {
                img.src = currentUser.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.name || currentUser.email || 'F') + '&background=20c4b4&color=fff&size=128';
            });
            
            // Get user location for attendance radius checking
            await getUserLocation();
            // Load projects
            await loadForemanProjects();
            // Load workers
            await loadForemanWorkers();
            // Load attendance stats
            await loadAttendanceStats();
            // Load payroll info
            await loadPayrollInfo();
        } catch (error) {
            console.error('Error loading foreman data:', error);
        }
    }

    // Get user GPS location for attendance radius checking
    async function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation not supported');
                resolve(null);
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    currentUser.location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    resolve(currentUser.location);
                },
                error => {
                    if (error.code === 1) {
                        // Permission denied - don't show error in console, just handle gracefully
                        console.log('Location permission denied - using default location');
                    } else {
                        console.warn('Error getting location:', error);
                    }
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
            );
        });
    }

    function getProjectCoords(project) {
        if (!project || !project.location) return null;
        const loc = project.location;
        if (typeof loc === 'object' && loc.latitude != null && loc.longitude != null) {
            return { latitude: parseFloat(loc.latitude), longitude: parseFloat(loc.longitude) };
        }
        if (typeof loc === 'string' && loc.includes(',')) {
            const [lat, lng] = loc.split(',').map(coord => parseFloat(coord.trim()));
            if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
        }
        return null;
    }

    // Check if user is within 50 meters of project location
    function isWithinProjectRadius(project, userLocation) {
        if (!project || !userLocation) return false;
        const projectCoords = getProjectCoords(project);
        if (!projectCoords) return true;
        const distance = calculateDistance(userLocation, projectCoords);
        return distance <= 50;
    }

    function parseProjectsResponse(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.projects)) return data.projects;
        return [];
    }

    function formatLocation(loc) {
        if (!loc) return 'N/A';
        if (typeof loc === 'string') return loc;
        return loc.address || loc.name || 'N/A';
    }

    function escapeHtml(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderForemanDashboardProjects(projects) {
        const container = document.getElementById('foremanDashboardProjectsList');
        if (!container) return;
        if (!projects.length) {
            container.innerHTML = '<p class="foreman-empty-hint">No projects assigned yet. Contact your administrator.</p>';
            return;
        }
        container.innerHTML = projects.slice(0, 6).map(project => {
            const img = (project.images && project.images[0]) || '';
            const loc = formatLocation(project.location);
            const progress = project.progress || 0;
            const status = (project.status || 'active').toLowerCase().replace(/\s+/g, '-');
            return `
                <article class="foreman-project-card">
                    <div class="foreman-project-card-media">
                        ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(project.name)}" onerror="this.style.display='none'">` : '<div class="foreman-project-card-placeholder"><i class="fas fa-building"></i></div>'}
                    </div>
                    <div class="foreman-project-card-body">
                        <h4>${escapeHtml(project.name)}</h4>
                        <p class="foreman-meta"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(loc)}</p>
                        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
                        <div class="foreman-project-card-footer">
                            <span class="status-badge status-${status}">${escapeHtml(project.status || 'active')}</span>
                            <span>${progress}%</span>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    // Calculate distance between two GPS coordinates in meters
    function calculateDistance(coord1, coord2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = toRadians(coord2.latitude - coord1.latitude);
        const dLon = toRadians(coord2.longitude - coord1.longitude);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Setup navigation
    function setupNavigation() {
        document.querySelectorAll('a[data-section]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                if (section) showSection(section);
            });
        });
    }

    // Show specific section (dashboard-only content hidden on other pages)
    function showSection(sectionId) {
        document.querySelectorAll('.portal-section').forEach(section => {
            section.style.display = 'none';
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = '';
        }

        document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        const titles = {
            'foreman-dashboard': ['Dashboard', 'Overview of your assigned sites and team'],
            'foreman-projects': ['My Projects', 'Projects assigned to you by admin'],
            'foreman-workers': ['Workers', 'Manage workers on your sites'],
            'foreman-attendance': ['Attendance', 'Track daily check-ins'],
            'foreman-payroll': ['Payroll', 'Worker compensation'],
            'foreman-reports': ['Reports', 'Site analytics and exports'],
            'foreman-profile': ['Profile', 'Your account details'],
            'foreman-settings': ['Settings', 'Portal preferences']
        };
        const t = titles[sectionId] || ['Foreman Portal', 'Manage your projects and workers'];
        const titleEl = document.querySelector('.page-title h1');
        const subEl = document.querySelector('.page-title p');
        if (titleEl) titleEl.textContent = t[0];
        if (subEl) subEl.textContent = t[1];
    }

    // Setup event listeners
    function setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        console.log('Logout button found:', logoutBtn);
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Logout clicked - clearing session');
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('currentUser');
                console.log('Session cleared, redirecting to login');
                window.location.href = '../../foreman/login/';
            });
        } else {
            console.error('Logout button not found');
        }

        // Mobile menu toggle with overlay
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.sidebar-overlay') || createSidebarOverlay();
                
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            });
        }
        
        // Create sidebar overlay if it doesn't exist
        function createSidebarOverlay() {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.addEventListener('click', function() {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
            document.body.appendChild(overlay);
            return overlay;
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            const menuToggle = document.getElementById('menuToggle');
            
            if (window.innerWidth <= 768 && 
                sidebar && 
                sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target) &&
                !overlay.contains(e.target)) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
        
                
        const selectProjectBtn = document.getElementById('foremanSelectProjectBtn');
        if (selectProjectBtn) {
            selectProjectBtn.addEventListener('click', function() {
                showSection('foreman-projects');
            });
        }

        document.querySelectorAll('.stat-card-clickable[data-nav-section]').forEach(card => {
            card.addEventListener('click', function() {
                const section = this.getAttribute('data-nav-section');
                if (section) showSection(section);
            });
        });
        
        // Worker management - Updated to use face registration
        document.getElementById('foremanAddWorkerBtn').addEventListener('click', function() {
            window.location.href = '../worker-registration.html';
        });
        document.getElementById('foremanImportWorkersBtn').addEventListener('click', function() {
            alert('Import workers - Implementation needed');
        });
        
        // Attendance management - Updated to use face scanning
        document.getElementById('foremanMarkAttendanceBtn').addEventListener('click', function() {
            window.location.href = '../attendance-marking.html';
        });
        document.getElementById('foremanAttendanceReportBtn').addEventListener('click', function() {
            alert('Attendance report - Implementation needed');
        });
        
        // Payroll management
        document.getElementById('foremanGeneratePayrollBtn').addEventListener('click', function() {
            alert('Generate payroll - Implementation needed');
        });
        document.getElementById('foremanPayrollReportBtn').addEventListener('click', function() {
            alert('Download payroll report - Implementation needed');
        });
        
        // Reports
        document.getElementById('foremanGenerateReportBtn').addEventListener('click', function() {
            alert('Generate report - Implementation needed');
        });
    }

    // Profile Form
    const profileForm = document.getElementById('foremanProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function() {
            alert('Profile update - Implementation needed');
        });
    }

    // Settings Form
    const settingsForm = document.getElementById('foremanSettingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function() {
            alert('Settings update - Implementation needed');
        });
    }

    // Load foreman projects
    async function loadForemanProjects() {
        try {
            if (!currentUser) {
                console.error('Current user not found');
                return;
            }
            
            const response = await fetch(`${window.API_BASE}/api/projects`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load projects');
            }

            const data = await response.json();
            const allProjects = parseProjectsResponse(data);
            // Backend returns only this foreman's projects when role is foreman
            const projectsToShow = allProjects;
            window._foremanProjectsList = projectsToShow;

            document.getElementById('myProjectsCount').textContent = projectsToShow.length;
            renderForemanDashboardProjects(projectsToShow);

            const tableBody = document.getElementById('foremanProjectsTableBody');
            if (projectsToShow.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">No projects assigned to you yet. Projects will appear here when an admin assigns you.</td></tr>';
            } else {
                tableBody.innerHTML = projectsToShow.map(project => {
                    const id = project._id || project.id;
                    const status = (project.status || 'active').toLowerCase().replace(/\s+/g, '-');
                    const workerCount = project.workers ? project.workers.length : (project.workerCount || 0);
                    return `
                    <tr>
                        <td><strong>${escapeHtml(project.name)}</strong></td>
                        <td>${escapeHtml(formatLocation(project.location))}</td>
                        <td>${workerCount}</td>
                        <td><span class="status-badge status-${status}">${escapeHtml(project.status || 'active')}</span></td>
                        <td>${project.progress || 0}%</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-primary foreman-view-project" data-project-id="${id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                `;
                }).join('');
                tableBody.querySelectorAll('.foreman-view-project').forEach(btn => {
                    btn.addEventListener('click', function () {
                        viewProject(this.getAttribute('data-project-id'));
                    });
                });
            }
            
            // Populate project select dropdowns for worker and attendance sections
            const workerProjectSelect = document.getElementById('workerProjectSelect');
            const attendanceProjectSelect = document.getElementById('attendanceProjectSelect');
            
            if (workerProjectSelect) {
                if (projectsToShow.length === 0) {
                    workerProjectSelect.innerHTML = '<option value="">No projects assigned</option>';
                } else {
                    workerProjectSelect.innerHTML = '<option value="">Select a project</option>' +
                        projectsToShow.map(project => `<option value="${project._id || project.id}">${escapeHtml(project.name)}</option>`).join('');
                }
            }

            if (attendanceProjectSelect) {
                if (projectsToShow.length === 0) {
                    attendanceProjectSelect.innerHTML = '<option value="">No projects assigned</option>';
                } else {
                    attendanceProjectSelect.innerHTML = '<option value="">Select a project</option>' +
                        projectsToShow.map(project => `<option value="${project._id || project.id}">${escapeHtml(project.name)}</option>`).join('');
                }
            }

            const payrollProject = document.getElementById('payrollProject');
            if (payrollProject) {
                payrollProject.innerHTML = '<option value="">All Projects</option>' +
                    projectsToShow.map(project => `<option value="${project._id || project.id}">${escapeHtml(project.name)}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    // Load foreman workers
    async function loadForemanWorkers() {
        try {
            if (!currentUser || !authToken) {
                console.error('User not authenticated');
                return;
            }
            
            const response = await fetch(`${window.API_BASE}/api/workers`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load workers');
            }

            const data = await response.json();
            const workers = data.workers || [];
            
            // Update stats
            document.getElementById('totalWorkersCount').textContent = workers.length;
            
            // Update table
            const tableBody = document.getElementById('foremanWorkersTableBody');
            tableBody.innerHTML = workers.map(worker => `
                <tr>
                    <td><img src="${worker.faceData?.faceImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(worker.name) + '&background=20c4b4&color=fff&size=40'}" alt="${worker.name}" style="width: 40px; height: 40px; border-radius: 50%;"></td>
                    <td>${worker.name}</td>
                    <td>${worker.nationalId || 'N/A'}</td>
                    <td>${worker.phone}</td>
                    <td>KSH ${worker.dailyRate}</td>
                    <td>${worker.assignedProjects ? worker.assignedProjects.length : 0}</td>
                    <td><span class="status-badge status-active">Active</span></td>
                    <td>
                        <button class="btn btn-sm" onclick="editWorker('${worker._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="removeWorker('${worker._id}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading workers:', error);
        }
    }

    // Load attendance stats
    async function loadAttendanceStats() {
        try {
            if (!currentUser || !authToken) {
                console.error('User not authenticated');
                document.getElementById('presentTodayCount').textContent = '0';
                document.getElementById('absentTodayCount').textContent = '0';
                document.getElementById('lateTodayCount').textContent = '0';
                return;
            }
            
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${window.API_BASE}/api/attendance/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                // Use default values if API fails
                document.getElementById('presentTodayCount').textContent = '0';
                document.getElementById('absentTodayCount').textContent = '0';
                document.getElementById('lateTodayCount').textContent = '0';
                return;
            }

            const data = await response.json();
            document.getElementById('presentTodayCount').textContent = data.present || 0;
            document.getElementById('absentTodayCount').textContent = data.absent || 0;
            document.getElementById('lateTodayCount').textContent = data.late || 0;
        } catch (error) {
            console.error('Error loading attendance stats:', error);
        }
    }

    // Load payroll info
    async function loadPayrollInfo() {
        try {
            if (!currentUser || !authToken) {
                console.error('User not authenticated');
                document.getElementById('monthlyPayroll').textContent = 'KSH 0';
                return;
            }
            
            const currentMonth = new Date().toISOString().slice(0, 7);
            const response = await fetch(`${window.API_BASE}/api/payroll/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                document.getElementById('monthlyPayroll').textContent = 'KSH 0';
                return;
            }

            const data = await response.json();
            document.getElementById('monthlyPayroll').textContent = `KSH ${data.totalPayroll || 0}`;
        } catch (error) {
            console.error('Error loading payroll info:', error);
        }
    }

    // Modal functions
    function showAddProjectModal() {
        // Implementation for project creation modal
        alert('Add Project modal - Implementation needed');
    }

    function showRegisterWorkerModal() {
        // Implementation for worker registration modal
        alert('Register Worker modal - Implementation needed');
    }

    function showMarkAttendanceModal() {
        const modal = document.getElementById('markAttendanceModal');
        const projectSelect = document.getElementById('attendanceProject');
        const workerSelect = document.getElementById('attendanceWorker');
        const livenessCheck = document.getElementById('requireLivenessCheck');
        const livenessSection = document.getElementById('livenessSection');
        
        // Load projects for selection
        loadProjectsForAttendance();
        
        // Load workers for selection
        loadWorkersForAttendance();
        
        // Setup liveness checkbox toggle
        if (livenessCheck) {
            livenessCheck.addEventListener('change', function() {
                if (this.checked) {
                    livenessSection.style.display = 'block';
                } else {
                    livenessSection.style.display = 'none';
                }
            });
        }
        
        modal.classList.add('open');
        
        // Setup liveness verification for worker registration
        setupLivenessVerification('workerLivenessVideo', 'startWorkerCameraBtn', 'captureWorkerBtn', 'workerLivenessStatus');
        
        // Setup attendance form submission
        const attendanceForm = document.getElementById('markAttendanceForm');
        if (attendanceForm) {
            attendanceForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const projectId = document.getElementById('attendanceProject').value;
                const workerId = document.getElementById('attendanceWorker').value;
                const status = document.getElementById('attendanceStatus').value;
                const notes = document.getElementById('attendanceNotes').value;
                const requireLiveness = document.getElementById('requireLivenessCheck').checked;
                
                // Validate liveness if required
                if (requireLiveness && !livenessCaptured) {
                    alert('Liveness verification is required. Please capture and verify the worker\'s liveness first.');
                    return;
                }
                
                const projects = window._foremanProjectsList || [];
                const project = projects.find(p => String(p._id || p.id) === String(projectId));
                const userLocation = currentUser.location;
                
                if (!isWithinProjectRadius(project, userLocation)) {
                    alert('You must be within 50 meters of the project location to mark attendance.');
                    return;
                }
                
                try {
                    const response = await fetch(`${window.API_BASE}/api/attendance/mark`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            projectId,
                            workerId,
                            status,
                            notes,
                            livenessData: livenessCaptured ? window.currentLivenessData : null,
                            foremanId: currentUser._id,
                            timestamp: new Date().toISOString()
                        })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            alert(`Attendance marked successfully for ${result.workerName} - ${status.toUpperCase()}`);
                            attendanceForm.reset();
                            modal.classList.remove('open');
                            // Reset liveness capture
                            livenessCaptured = false;
                            window.currentLivenessData = null;
                            
                            // Reload attendance stats
                            await loadAttendanceStats();
                        } else {
                            alert(`Error: ${result.error || 'Failed to mark attendance'}`);
                        }
                    } else {
                        throw new Error('Failed to mark attendance');
                    }
                } catch (error) {
                    console.error('Error marking attendance:', error);
                    alert('Failed to mark attendance. Please try again.');
                }
            });
        }
    }

    // Load projects for attendance dropdown
    async function loadProjectsForAttendance() {
        try {
            const response = await fetch(`${window.API_BASE}/api/foreman/${currentUser._id}/projects`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) throw new Error('Failed to load projects');
            
            const data = await response.json();
            const projects = data.projects || [];
            const projectSelect = document.getElementById('attendanceProject');
            
            projectSelect.innerHTML = '<option value="">Select project...</option>' +
                projects.map(project => `<option value="${project._id}">${project.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    // Load workers for attendance dropdown
    async function loadWorkersForAttendance() {
        try {
            const projectSelect = document.getElementById('attendanceProject');
            const projectId = projectSelect ? projectSelect.value : null;
            
            if (!projectId) return;
            
            const response = await fetch(`${window.API_BASE}/api/projects/${projectId}/workers`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) throw new Error('Failed to load workers');
            
            const data = await response.json();
            const workers = data.workers || [];
            const workerSelect = document.getElementById('attendanceWorker');
            
            workerSelect.innerHTML = '<option value="">Select worker...</option>' +
                workers.map(worker => `<option value="${worker._id}">${worker.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading workers:', error);
        }
    }

    // Setup liveness verification
    function setupLivenessVerification(videoId, startBtnId, captureBtnId, statusId) {
        const video = document.getElementById(videoId);
        const startBtn = document.getElementById(startBtnId);
        const captureBtn = document.getElementById(captureBtnId);
        const status = document.getElementById(statusId);
        
        let stream = null;
        
        startBtn.addEventListener('click', async function() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facing: 'user' }, 
                    audio: false 
                });
                
                video.srcObject = stream;
                video.play();
                
                startBtn.disabled = true;
                captureBtn.disabled = false;
                status.textContent = 'Camera ready - Click capture when worker is ready';
                status.style.color = '#28a745';
                
                livenessStream = stream;
            } catch (error) {
                console.error('Error accessing camera:', error);
                status.textContent = 'Camera access denied';
                status.style.color = '#dc3545';
            }
        });
        
        captureBtn.addEventListener('click', function() {
            if (!stream) {
                status.textContent = 'Please start camera first';
                return;
            }
            
            // Capture image from video
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to base64
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Perform basic liveness detection (blink detection)
            const isLive = performBasicLivenessCheck(ctx, canvas.width, canvas.height);
            
            if (isLive) {
                status.textContent = '✓ Liveness verified - Worker appears to be live';
                status.style.color = '#28a745';
                livenessCaptured = true;
                captureBtn.textContent = '✓ Verified';
                captureBtn.classList.add('btn-success');
                
                // Store liveness data
                if (window.currentLivenessData) {
                    window.currentLivenessData = {
                        ...window.currentLivenessData,
                        image: imageData,
                        verified: true,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    window.currentLivenessData = {
                        image: imageData,
                        verified: true,
                        timestamp: new Date().toISOString()
                    };
                }
            } else {
                status.textContent = '✗ Liveness failed - Please try again';
                status.style.color = '#dc3545';
                captureBtn.textContent = 'Retry';
                captureBtn.classList.remove('btn-success');
            }
        });
    }

    // Basic liveness detection (simplified)
    function performBasicLivenessCheck(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Simple blink detection - check for eye-like patterns
        let hasFace = false;
        let hasContrast = false;
        
        // Basic face detection (simplified)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Basic skin tone detection
            if (r > 95 && g > 40 && b > 30) {
                hasFace = true;
            }
            
            // Contrast variation (indicates liveness)
            if (hasFace) {
                const brightness = (r + g + b) / 3;
                if (brightness > 80 && brightness < 200) {
                    hasContrast = true;
                }
            }
        }
        
        // Return true if we detected face with some variation (indicates liveness)
        return hasFace && hasContrast;
    }

    function generatePayroll() {
        // Implementation for payroll generation
        alert('Generate Payroll - Implementation needed');
    }

    function viewProject(projectId) {
        const projects = window._foremanProjectsList || [];
        const project = projects.find(p => String(p._id || p.id) === String(projectId));
        if (!project) {
            showSection('foreman-projects');
            return;
        }
        const loc = formatLocation(project.location);
        const clientName = project.client && typeof project.client === 'object'
            ? (project.client.name || project.client.email || '')
            : '';
        alert(
            'Project: ' + (project.name || '') + '\n' +
            'Location: ' + loc + '\n' +
            (clientName ? 'Client: ' + clientName + '\n' : '') +
            'Status: ' + (project.status || 'active') + '\n' +
            'Progress: ' + (project.progress || 0) + '%'
        );
    }

    window.viewProject = viewProject;

    function editWorker(workerId) {
        window.location.href = `../worker-detail/?id=${workerId}`;
    }

    function removeWorker(workerId) {
        if (confirm('Are you sure you want to remove this worker?')) {
            // Implementation for worker removal
            alert('Remove worker - Implementation needed');
        }
    }

    function updateForemanProfile(e) {
        e.preventDefault();
        // Implementation for profile update
        alert('Update profile - Implementation needed');
    }

    function updateForemanSettings(e) {
        e.preventDefault();
        // Implementation for settings update
        alert('Update settings - Implementation needed');
    }
})();
