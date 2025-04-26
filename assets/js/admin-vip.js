class AdminVIPManager {
    constructor(app) {
      this.app = app;
      this.firebase = app.firebase;
      this.auth = app.auth;
      this.db = app.firebase.db;
      
      // Check if admin panel exists
      if (document.getElementById('admin-panel')) {
        this.initializeAdminVIPManagement();
      }
    }
    
    initializeAdminVIPManagement() {
      // Add VIP management tab to admin panel
      this.addVIPManagementTab();
      
      // Initialize admin as VIP automatically
      this.ensureAdminVIP();
    }
    
    async ensureAdminVIP() {
      if (!this.auth.currentUser || !this.auth.currentUser.isAdmin) return;
      
      try {
        // Make sure admin is also VIP
        await this.db.ref(`users/${this.auth.currentUser.uid}`).update({
          isVIP: true,
          VIPActivatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update current user object
        this.auth.currentUser.isVIP = true;
        
        console.log('Admin VIP status updated');
      } catch (error) {
        console.error('Error updating admin VIP status:', error);
      }
    }
    
    addVIPManagementTab() {
      // Get the admin panel container
      const adminPanel = document.getElementById('admin-panel');
      if (!adminPanel) return;
      
      // Check if tabs container exists
      let tabsContainer = adminPanel.querySelector('.admin__tabs');
      if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'admin__tabs';
        adminPanel.prepend(tabsContainer);
      }
      
      // Check if tab already exists
      if (adminPanel.querySelector('[data-admin-tab="vip"]')) return;
      
      // Create VIP tab
      const vipTab = document.createElement('div');
      vipTab.className = 'admin__tab';
      vipTab.dataset.adminTab = 'vip';
      vipTab.innerHTML = '<i class="ri-vip-crown-line"></i> VIP Management';
      
      // Add tab to tabs container
      tabsContainer.appendChild(vipTab);
      
      // Create VIP management content
      const vipContent = document.createElement('div');
      vipContent.className = 'admin__content';
      vipContent.id = 'vip-management';
      vipContent.innerHTML = `
        <h3 class="admin__title">VIP User Management</h3>
        
        <div class="admin__section">
          <div class="admin__search">
            <input type="text" id="vip-search" placeholder="Search users..." class="admin__search-input">
            <button id="search-users-btn" class="button">Search</button>
          </div>
          
          <div class="admin__users-container">
            <table class="admin__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>VIP Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="vip-users-table">
                <tr>
                  <td colspan="4" class="loading-message">Loading users...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      
      // Add content to admin panel
      adminPanel.appendChild(vipContent);
      
      // Add tab click handler
      vipTab.addEventListener('click', () => {
        // Hide all content
        const contents = adminPanel.querySelectorAll('.admin__content');
        contents.forEach(content => content.style.display = 'none');
        
        // Show VIP management content
        vipContent.style.display = 'block';
        
        // Mark tab as active
        const tabs = adminPanel.querySelectorAll('.admin__tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        vipTab.classList.add('active');
        
        // Load users
        this.loadUsers();
      });
      
      // Add search handler
      document.getElementById('search-users-btn')?.addEventListener('click', () => {
        this.loadUsers(document.getElementById('vip-search')?.value || '');
      });
      
      document.getElementById('vip-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.loadUsers(e.target.value);
        }
      });
    }
    
    async loadUsers(searchTerm = '') {
      if (!this.auth.currentUser?.isAdmin) return;
      
      const tableBody = document.getElementById('vip-users-table');
      if (!tableBody) return;
      
      tableBody.innerHTML = '<tr><td colspan="4" class="loading-message">Loading users...</td></tr>';
      
      try {
        // Get all users
        const snapshot = await this.db.ref('users').once('value');
        const users = [];
        
        snapshot.forEach(childSnapshot => {
          const user = {
            uid: childSnapshot.key,
            ...childSnapshot.val()
          };
          
          // Apply search filter if term provided
          if (!searchTerm || 
              user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
              user.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
            users.push(user);
          }
        });
        
        // Sort users: VIP first, then by name
        users.sort((a, b) => {
          if (a.isVIP === b.isVIP) {
            return (a.name || '').localeCompare(b.name || '');
          }
          return a.isVIP ? -1 : 1;
        });
        
        if (users.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
          return;
        }
        
        // Render users table
        tableBody.innerHTML = users.map(user => `
          <tr data-user-id="${user.uid}" class="${user.isVIP ? 'vip-user' : ''}">
            <td>${user.name || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>
              <span class="vip-status ${user.isVIP ? 'is-vip' : 'not-vip'}">
                ${user.isVIP ? 'VIP' : 'Standard'}
              </span>
              ${user.VIPActivatedAt ? `<br><small>Since: ${new Date(user.VIPActivatedAt).toLocaleDateString()}</small>` : ''}
            </td>
            <td>
              ${user.isVIP ? 
                `<button class="button button--small button--danger remove-vip-btn">Remove VIP</button>` : 
                `<button class="button button--small grant-vip-btn">Grant VIP</button>`
              }
            </td>
          </tr>
        `).join('');
        
        // Add event listeners to buttons
        tableBody.querySelectorAll('.grant-vip-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const userId = e.target.closest('tr').dataset.userId;
            this.grantVIP(userId);
          });
        });
        
        tableBody.querySelectorAll('.remove-vip-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const userId = e.target.closest('tr').dataset.userId;
            this.removeVIP(userId);
          });
        });
        
      } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
      }
    }
    
    async grantVIP(userId) {
      if (!this.auth.currentUser?.isAdmin) return;
      
      try {
        // Update user in database
        await this.db.ref(`users/${userId}`).update({
          isVIP: true,
          VIPActivatedAt: firebase.database.ServerValue.TIMESTAMP,
          VIPGrantedBy: {
            uid: this.auth.currentUser.uid,
            name: this.auth.currentUser.name,
            timestamp: firebase.database.ServerValue.TIMESTAMP
          }
        });
        
        // Show success message
        DOMUtils.showMessage(`VIP status granted`, 'success');
        
        // Reload users
        this.loadUsers(document.getElementById('vip-search')?.value || '');
      } catch (error) {
        console.error('Error granting VIP status:', error);
        DOMUtils.showMessage(`Error: ${error.message}`, 'error');
      }
    }
    
    async removeVIP(userId) {
      if (!this.auth.currentUser?.isAdmin) return;
      
      // Don't allow removing admin's VIP status
      const userSnapshot = await this.db.ref(`users/${userId}`).once('value');
      const user = userSnapshot.val();
      
      if (user.isAdmin) {
        DOMUtils.showMessage(`Cannot remove VIP status from admin users`, 'error');
        return;
      }
      
      try {
        // Update user in database
        await this.db.ref(`users/${userId}`).update({
          isVIP: false,
          VIPRemovedBy: {
            uid: this.auth.currentUser.uid,
            name: this.auth.currentUser.name,
            timestamp: firebase.database.ServerValue.TIMESTAMP
          }
        });
        
        // Show success message
        DOMUtils.showMessage(`VIP status removed`, 'success');
        
        // Reload users
        this.loadUsers(document.getElementById('vip-search')?.value || '');
      } catch (error) {
        console.error('Error removing VIP status:', error);
        DOMUtils.showMessage(`Error: ${error.message}`, 'error');
      }
    }
  }
  
  // Initialize when document is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to be initialized
    const initAdminVIP = () => {
      if (window.app && window.app.auth && window.app.auth.currentUser) {
        window.adminVIPManager = new AdminVIPManager(window.app);
        console.log('Admin VIP Manager initialized');
      } else {
        // Try again after a short delay
        setTimeout(initAdminVIP, 1000);
      }
    };
    
    setTimeout(initAdminVIP, 1000);
  });