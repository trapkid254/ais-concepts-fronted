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
        // Implementation for attendance marking modal
        alert('Mark Attendance modal - Implementation needed');
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
