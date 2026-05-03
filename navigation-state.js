// ===== navigation-state.js =====
// Prevent page refresh redirects and maintain navigation state

class NavigationStateManager {
    constructor() {
        this.currentPage = '';
        this.currentSection = '';
        this.navigationHistory = [];
        this.maxHistorySize = 10;
        this.init();
    }

    init() {
        // Save current page state before unload
        window.addEventListener('beforeunload', (e) => {
            this.saveNavigationState();
        });

        // Restore navigation state on page load
        window.addEventListener('load', () => {
            this.restoreNavigationState();
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.navigationState) {
                this.applyNavigationState(e.state.navigationState);
            }
        });

        // Intercept navigation clicks
        document.addEventListener('click', (e) => {
            this.handleNavigationClick(e);
        });
    }

    saveNavigationState() {
        const state = {
            currentPage: window.location.pathname,
            currentSection: this.getCurrentSection(),
            scrollPosition: window.pageYOffset,
            timestamp: Date.now()
        };

        sessionStorage.setItem('navigationState', JSON.stringify(state));
        this.navigationHistory.push(state);
        
        // Keep history size manageable
        if (this.navigationHistory.length > this.maxHistorySize) {
            this.navigationHistory.shift();
        }
    }

    restoreNavigationState() {
        const savedState = sessionStorage.getItem('navigationState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                
                // Only restore if it's recent (within 30 minutes)
                if (Date.now() - state.timestamp < 30 * 60 * 1000) {
                    this.applyNavigationState(state);
                }
            } catch (e) {
                console.error('Failed to restore navigation state:', e);
            }
        }
    }

    applyNavigationState(state) {
        // Restore current section if on admin portal
        if (window.location.pathname.includes('/admin/') && state.currentSection) {
            this.showSection(state.currentSection);
        }

        // Restore scroll position after a short delay
        setTimeout(() => {
            if (state.scrollPosition > 0) {
                window.scrollTo(0, state.scrollPosition);
            }
        }, 100);
    }

    getCurrentSection() {
        // For admin portal, get the active section
        const activeNavLink = document.querySelector('.sidebar-nav a.active');
        if (activeNavLink) {
            return activeNavLink.getAttribute('data-section');
        }
        return '';
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('[id^="admin-"]').forEach(section => {
            section.style.display = 'none';
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update nav active state
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionId;
    }

    handleNavigationClick(e) {
        const target = e.target.closest('a[data-section]');
        if (target) {
            e.preventDefault();
            const sectionId = target.getAttribute('data-section');
            
            // Update URL without full page reload
            const newUrl = window.location.pathname + '#' + sectionId;
            history.pushState(
                { navigationState: { currentSection: sectionId } }, 
                '', 
                newUrl
            );
            
            this.showSection(sectionId);
            this.saveNavigationState();
        }
    }

    // Prevent form submissions from causing page reloads
    handleFormSubmit(e) {
        const form = e.target;
        if (form.classList.contains('ajax-form')) {
            e.preventDefault();
            
            // Handle form submission via AJAX
            this.submitFormAjax(form);
        }
    }

    async submitFormAjax(form) {
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
        
        try {
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('authToken')
                }
            });
            
            if (response.ok) {
                // Show success message
                this.showNotification('Success', 'Changes saved successfully!', 'success');
                
                // Refresh relevant data if needed
                this.refreshDataAfterSubmit(form);
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            this.showNotification('Error', 'Failed to save changes. Please try again.', 'error');
        } finally {
            // Restore button state
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    refreshDataAfterSubmit(form) {
        // Determine what data to refresh based on form
        if (form.id.includes('user')) {
            if (typeof loadUsers === 'function') loadUsers();
        } else if (form.id.includes('project')) {
            if (typeof loadProjects === 'function') loadProjects();
        } else if (form.id.includes('task')) {
            if (typeof loadTasks === 'function') loadTasks();
        }
    }

    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `navigation-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles if not present
        if (!document.querySelector('#navigation-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'navigation-notification-styles';
            styles.textContent = `
                .navigation-notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10001;
                    max-width: 400px;
                    animation: slideInDown 0.3s ease-out;
                }
                
                .navigation-notification.success {
                    border-left: 4px solid #4caf50;
                }
                
                .navigation-notification.error {
                    border-left: 4px solid #f44336;
                }
                
                .navigation-notification.info {
                    border-left: 4px solid #2196f3;
                }
                
                .notification-content {
                    padding: 16px;
                }
                
                .notification-content h4 {
                    margin: 0 0 8px 0;
                    color: #333;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .notification-content p {
                    margin: 0;
                    color: #555;
                    font-size: 14px;
                }
                
                .notification-close {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #666;
                }
                
                @keyframes slideInDown {
                    from {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

// Create global navigation state manager
window.navigationManager = new NavigationStateManager();

// Initialize form handling
document.addEventListener('DOMContentLoaded', () => {
    // Add AJAX form handling to all forms
    document.querySelectorAll('form').forEach(form => {
        form.classList.add('ajax-form');
        form.addEventListener('submit', (e) => {
            window.navigationManager.handleFormSubmit(e);
        });
    });
});
