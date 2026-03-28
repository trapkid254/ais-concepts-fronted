// ===== Credential Reset Script =====
// This script will reset all existing credentials and set new admin credentials

(function() {
    'use strict';
    
    // Clear all existing authentication data
    function clearAllCredentials() {
        // Clear sessionStorage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        
        // Clear localStorage
        localStorage.removeItem('portalUsers');
        localStorage.removeItem('adminCredentials');
        localStorage.removeItem('clientCredentials');
        localStorage.removeItem('employeeCredentials');
        localStorage.removeItem('authData');
        
        // Clear any other auth-related data
        Object.keys(localStorage).forEach(key => {
            if (key.includes('auth') || key.includes('credential') || key.includes('user') || key.includes('token')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('All existing credentials cleared');
    }
    
    // Set new admin credentials
    function setNewAdminCredentials() {
        const adminCredentials = {
            username: 'Aisconcepts61',
            password: '#Aisconcepts16',
            role: 'admin',
            email: 'admin@aisconcepts.com',
            status: 'active',
            createdAt: new Date().toISOString(),
            permissions: ['all']
        };
        
        // Store in localStorage for offline mode
        localStorage.setItem('adminCredentials', JSON.stringify(adminCredentials));
        
        // Also store in a format the login system can use
        const portalUsers = [{
            id: 1,
            username: 'Aisconcepts61',
            email: 'admin@aisconcepts.com',
            password: '#Aisconcepts16', // In production, this should be hashed
            role: 'admin',
            status: 'active',
            permissions: ['all'],
            createdAt: new Date().toISOString()
        }];
        
        localStorage.setItem('portalUsers', JSON.stringify(portalUsers));
        
        console.log('New admin credentials set:', { username: adminCredentials.username, role: adminCredentials.role });
    }
    
    // Execute the reset
    function resetCredentials() {
        console.log('Starting credential reset...');
        
        try {
            clearAllCredentials();
            setNewAdminCredentials();
            
            // Show success message
            alert('Credentials have been reset successfully!\n\nNew Admin Credentials:\nUsername: Aisconcepts61\nPassword: #Aisconcepts16\n\nPlease use these credentials to login to the admin portal.');
            
            // Redirect to login page
            window.location.href = 'staff/login.html';
            
        } catch (error) {
            console.error('Error resetting credentials:', error);
            alert('An error occurred while resetting credentials. Please try again.');
        }
    }
    
    // Auto-execute if this script is loaded directly
    if (window.location.pathname.includes('reset-credentials.html')) {
        resetCredentials();
    } else {
        // Make the function available globally
        window.resetAllCredentials = resetCredentials;
    }
    
    // Export for module use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            clearAllCredentials,
            setNewAdminCredentials,
            resetCredentials
        };
    }
})();
