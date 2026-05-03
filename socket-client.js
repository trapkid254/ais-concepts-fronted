// ===== socket-client.js =====
// Real-time WebSocket client for instant notifications

class SocketClient {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.currentUser = null;
    }

    connect() {
        const API_BASE = window.API_BASE || '';
        const token = sessionStorage.getItem('authToken');
        
        if (!token) {
            console.log('No auth token found, skipping WebSocket connection');
            return;
        }

        try {
            // Parse JWT to get user info
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.currentUser = {
                email: payload.email,
                role: payload.role
            };
        } catch (e) {
            console.error('Failed to parse JWT token:', e);
            return;
        }

        // Connect to Socket.IO server
        this.socket = io(API_BASE, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to real-time notifications server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Register user with the server
            this.socket.emit('register-user', {
                email: this.currentUser.email,
                role: this.currentUser.role,
                token: sessionStorage.getItem('authToken')
            });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from notifications server');
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });

        this.socket.on('new-notification', (notification) => {
            this.handleNewNotification(notification);
        });
    }

    handleReconnect() {
        // Socket.IO handles reconnection internally - no manual reconnect needed
        console.log('Waiting for Socket.IO to reconnect...');
    }

    handleNewNotification(notification) {
        console.log('Received real-time notification:', notification);
        
        // Show instant notification popup
        this.showNotificationPopup(notification);
        
        // Update notification badge
        this.updateNotificationBadge();
        
        // Refresh relevant data based on notification type
        this.refreshDataBasedOnNotification(notification);
        
        // Play notification sound (optional)
        this.playNotificationSound();
    }

    showNotificationPopup(notification) {
        // Remove existing popups
        const existingPopup = document.querySelector('.realtime-notification-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = document.createElement('div');
        popup.className = 'realtime-notification-popup';
        popup.innerHTML = `
            <div class="notification-popup-content">
                <div class="notification-header">
                    <h4>${notification.title}</h4>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="notification-body">
                    <p>${notification.message}</p>
                    <div class="notification-time">${new Date(notification.createdAt).toLocaleTimeString()}</div>
                </div>
            </div>
        `;

        // Add styles if not already present
        if (!document.querySelector('#notification-popup-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-popup-styles';
            styles.textContent = `
                .realtime-notification-popup {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 350px;
                    animation: slideInRight 0.3s ease-out;
                }
                
                .notification-popup-content {
                    padding: 16px;
                }
                
                .notification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .notification-header h4 {
                    margin: 0;
                    color: #333;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .notification-body p {
                    margin: 0 0 8px 0;
                    color: #555;
                    font-size: 14px;
                    line-height: 1.4;
                }
                
                .notification-time {
                    font-size: 12px;
                    color: #888;
                }
                
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(popup);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 5000);
    }

    updateNotificationBadge() {
        // Trigger the existing notification badge refresh
        if (typeof refreshNotificationsBadge === 'function') {
            refreshNotificationsBadge();
        }
    }

    refreshDataBasedOnNotification(notification) {
        const title = notification.title.toLowerCase();
        
        if (title.includes('registration') || title.includes('pending')) {
            // Refresh pending approvals if on admin dashboard
            if (window.location.pathname.includes('/admin/')) {
                if (typeof loadPendingUsers === 'function') {
                    loadPendingUsers();
                }
            }
        }
        
        if (title.includes('project') || title.includes('update')) {
            // Refresh project data
            if (typeof loadProjects === 'function') {
                loadProjects();
            }
        }
        
        if (title.includes('message')) {
            // Refresh messages
            if (typeof loadMessages === 'function') {
                loadMessages();
            }
        }
    }

    playNotificationSound() {
        // Create and play a subtle notification sound
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Ignore audio play errors (user may not have interacted yet)
            });
        } catch (e) {
            // Ignore audio errors
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// Create global socket client instance
window.socketClient = new SocketClient();

// Auto-connect when page loads and user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('authToken');
    if (token) {
        window.socketClient.connect();
    }
});

// Disconnect when user logs out
window.addEventListener('beforeunload', () => {
    if (window.socketClient) {
        window.socketClient.disconnect();
    }
});
