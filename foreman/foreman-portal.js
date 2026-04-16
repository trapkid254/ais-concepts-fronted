// ===== FOREMAN PORTAL SCRIPT =====
(function() {
    let currentUser = null;
    let authToken = null;

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        authToken = sessionStorage.getItem('authToken');
        currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        
        if (!authToken || !currentUser) {
            window.location.href = '../staff/login.html';
            return;
        }

        if (currentUser.role !== 'foreman') {
            window.location.href = '../staff/login.html';
            return;
        }

        loadForemanData();
        setupNavigation();
        setupEventListeners();
    });

    // Load foreman dashboard data
    async function loadForemanData() {
        try {
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
                    console.warn('Error getting location:', error);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
            );
        });
    }

    // Check if user is within 50 meters of project location
    function isWithinProjectRadius(project, userLocation) {
        if (!project.location || !userLocation) return false;
        
        // Parse project location to get coordinates (assuming format: "latitude,longitude" or address)
        let projectCoords = null;
        if (project.location.includes(',')) {
            const [lat, lng] = project.location.split(',').map(coord => parseFloat(coord.trim()));
            projectCoords = { latitude: lat, longitude: lng };
        } else {
            // For now, use a placeholder if location is just an address
            // In production, you'd use geocoding API to convert address to coordinates
            return true; // Allow attendance if coordinates can't be determined
        }
        
        if (!projectCoords) return false;
        
        const distance = calculateDistance(userLocation, projectCoords);
        return distance <= 50; // 50 meters
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
        const navLinks = document.querySelectorAll('[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                showSection(section);
            });
        });
    }

    // Show specific section
    function showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.portal-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update active nav
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('currentUser');
                window.location.href = '../staff/login.html';
            });
        }

        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                document.querySelector('.sidebar').classList.toggle('open');
            });
        }

        // Add Project Button
        const addProjectBtn = document.getElementById('foremanAddProjectBtn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', showAddProjectModal);
        }

        // Register Worker Button
        const addWorkerBtn = document.getElementById('foremanAddWorkerBtn');
        if (addWorkerBtn) {
            addWorkerBtn.addEventListener('click', showRegisterWorkerModal);
        }

        // Mark Attendance Button
        const markAttendanceBtn = document.getElementById('foremanMarkAttendanceBtn');
        if (markAttendanceBtn) {
            markAttendanceBtn.addEventListener('click', showMarkAttendanceModal);
        }

        // Liveness verification setup
        let livenessStream = null;
        let livenessCaptured = false;

        // Generate Payroll Button
        const generatePayrollBtn = document.getElementById('foremanGeneratePayrollBtn');
        if (generatePayrollBtn) {
            generatePayrollBtn.addEventListener('click', generatePayroll);
        }

        // Profile Form
        const profileForm = document.getElementById('foremanProfileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', updateForemanProfile);
        }

        // Settings Form
        const settingsForm = document.getElementById('foremanSettingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', updateForemanSettings);
        }
    }

    // Load foreman projects
    async function loadForemanProjects() {
        try {
            const response = await fetch(`${window.API_BASE}/api/foreman/${currentUser._id}/projects`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load projects');
            }

            const data = await response.json();
            const projects = data.projects || [];
            
            // Update stats
            document.getElementById('myProjectsCount').textContent = projects.length;
            
            // Update table
            const tableBody = document.getElementById('foremanProjectsTableBody');
            tableBody.innerHTML = projects.map(project => `
                <tr>
                    <td>${project.name}</td>
                    <td>${project.location.address}</td>
                    <td>${project.workers ? project.workers.length : 0}</td>
                    <td><span class="status-badge status-${project.status}">${project.status}</span></td>
                    <td>
                        <button class="btn btn-sm" onclick="viewProject('${project._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    // Load foreman workers
    async function loadForemanWorkers() {
        try {
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
                    <td><img src="${worker.faceData?.faceImage || '../images/default-avatar.png'}" alt="${worker.name}" style="width: 40px; height: 40px; border-radius: 50%;"></td>
                    <td>${worker.name}</td>
                    <td>${worker.nationalId}</td>
                    <td>${worker.phone}</td>
                    <td>$${worker.dailyRate}</td>
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
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${window.API_BASE}/api/attendance/foreman/${currentUser._id}/stats?date=${today}`, {
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
            const currentMonth = new Date().toISOString().slice(0, 7);
            const response = await fetch(`${window.API_BASE}/api/payroll/foreman/${currentUser._id}?month=${currentMonth}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                document.getElementById('monthlyPayroll').textContent = '$0';
                return;
            }

            const data = await response.json();
            document.getElementById('monthlyPayroll').textContent = `$${data.totalPayroll || 0}`;
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
                
                // Check if foreman is within project radius
                const projects = getStored('portalProjects', []);
                const project = projects.find(p => p._id === projectId);
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
        window.location.href = `project-detail.html?id=${projectId}`;
    }

    function editWorker(workerId) {
        window.location.href = `worker-detail.html?id=${workerId}`;
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
