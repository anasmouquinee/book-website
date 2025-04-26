/**
 * Reading Room JavaScript
 * Handles the reading room functionality for VIP users
 */

class ReadingRoomManager {
  constructor() {
    // Get Firebase services
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded');
      return;
    }
    
    this.auth = firebase.auth();
    this.db = firebase.database();
    this.currentUser = null;
    this.isVIP = false;
    this.isAdmin = false;
    
    // Initialize UI elements after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  init() {
    console.log('Initializing reading room manager');
    
    // Setup auth state listener
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.fetchUserProfile(user.uid);
      } else {
        this.currentUser = null;
        this.updateUI();
      }
    });
    
    // Add reading rooms tab to profile if needed
    this.addRoomTabToProfile();
    
    // Create or update reading room dialog
    this.createRoomDialog();
    
    // Add event listeners
    this.attachEventListeners();
  }
  
  async fetchUserProfile(uid) {
    try {
      const snapshot = await this.db.ref(`users/${uid}`).once('value');
      if (snapshot.exists()) {
        const userData = snapshot.val();
        this.currentUser = {
          uid,
          ...userData
        };
        
        // Check if user is VIP or admin
        this.isVIP = !!(userData.isVIP || userData.VIPActivatedAt);
        this.isAdmin = !!userData.isAdmin;
        
        console.log('Reading Room: User profile loaded', this.currentUser.name, 'VIP:', this.isVIP);
        this.updateUI();
      }
    } catch (error) {
      console.error('Error fetching user profile for reading room:', error);
    }
  }
  
  updateUI() {
    // Update room list if tab is active
    const roomsTab = document.querySelector('[data-tab="rooms"]');
    const roomsContent = document.getElementById('rooms-content');
    
    if (roomsTab && roomsTab.classList.contains('active') && roomsContent) {
      this.loadUserRooms();
    }
  }
  
  addRoomTabToProfile() {
    const profileTabs = document.querySelector('.profile__tabs');
    if (!profileTabs) return;
    
    // Check if tab already exists
    if (!document.querySelector('[data-tab="rooms"]')) {
      const roomsTab = document.createElement('button');
      roomsTab.className = 'profile__tab';
      roomsTab.setAttribute('data-tab', 'rooms');
      roomsTab.setAttribute('role', 'tab');
      roomsTab.textContent = 'Reading Rooms';
      
      // Add after history tab
      const historyTab = document.querySelector('[data-tab="history"]');
      if (historyTab) {
        profileTabs.insertBefore(roomsTab, historyTab.nextSibling);
      } else {
        profileTabs.appendChild(roomsTab);
      }
      
      // Add tab content container
      const profileContainer = document.querySelector('.profile__container');
      if (profileContainer) {
        const roomsContent = document.createElement('div');
        roomsContent.className = 'profile__content';
        roomsContent.id = 'rooms-content';
        roomsContent.setAttribute('role', 'tabpanel');
        
        roomsContent.innerHTML = `
          <div class="profile__rooms grid">
            <h4 class="profile__subtitle">My Reading Rooms</h4>
            <div class="rooms-actions">
              <button id="create-room-btn" class="button">
                <i class="ri-add-line"></i> Create New Room
              </button>
            </div>
            <div id="room-list" class="room-list">
              <!-- Rooms will be listed here -->
              <div class="room-empty">
                <i class="ri-book-read-line"></i>
                <p>No reading rooms available</p>
              </div>
            </div>
          </div>
        `;
        
        // Add to profile container
        profileContainer.appendChild(roomsContent);
      }
      
      // Add CSS styles
      this.addRoomStyles();
    }
  }
  
  createRoomDialog() {
    // Remove any existing dialog first
    const existingDialog = document.getElementById('room-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    const dialog = document.createElement('div');
    dialog.id = 'room-dialog';
    dialog.className = 'room-dialog';
    
    dialog.innerHTML = `
      <div class="room-dialog__content">
        <h3>Create Reading Room</h3>
        
        <div class="room-dialog__create">
          <form id="create-room-form" class="room-form">
            <div class="room-form__group">
              <label for="room-name">Room Name</label>
              <input type="text" id="room-name" placeholder="My Reading Group" required>
            </div>
            <div class="room-form__group">
              <label for="room-description">Description</label>
              <textarea id="room-description" placeholder="What will you discuss in this room?"></textarea>
            </div>
            <div class="room-form__group room-form__checkbox">
              <input type="checkbox" id="room-private">
              <label for="room-private">Private Room (requires approval to join)</label>
            </div>
            <div class="room-form__buttons">
              <button type="submit" id="create-room-submit" class="button">Create Room</button>
              <button type="button" id="room-close" class="button button--ghost">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }
  
  addRoomStyles() {
    if (document.getElementById('reading-room-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'reading-room-styles';
    style.textContent = `
      .room-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
      }
      
      .room-dialog.active {
        opacity: 1;
        visibility: visible;
      }
      
      .room-dialog__content {
        background-color: var(--container-color);
        border-radius: 1rem;
        padding: 2rem;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .room-form__group {
        margin-bottom: 1.5rem;
      }
      
      .room-form__group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }
      
      .room-form__group input[type="text"],
      .room-form__group textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        background-color: var(--container-color);
      }
      
      .room-form__checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .room-form__checkbox input {
        width: 18px;
        height: 18px;
      }
      
      .room-form__buttons {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      
      .room-list {
        margin-top: 1.5rem;
      }
      
      .room-item {
        background-color: var(--container-color);
        border-radius: 0.75rem;
        padding: 1rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .room-item__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      
      .room-item__title {
        font-size: var(--h3-font-size);
        margin: 0;
      }
      
      .room-item__badge {
        font-size: var(--small-font-size);
        padding: 0.25rem 0.5rem;
        border-radius: 1rem;
        background-color: var(--first-color-lighter);
        color: var(--first-color-dark);
      }
      
      .room-item__desc {
        margin: 0.5rem 0;
        color: var(--text-color-light);
      }
      
      .room-item__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
      }
      
      .room-item__users {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--text-color-light);
      }
      
      .room-item__users i {
        font-size: 1.25rem;
      }
      
      .room-item__actions {
        display: flex;
        gap: 0.5rem;
      }
      
      .room-empty {
        text-align: center;
        padding: 2rem;
        color: var(--text-color-light);
      }
      
      .room-empty i {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      
      .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        z-index: 1000;
        transform: translateY(100%);
        transition: transform 0.3s ease;
        max-width: 80%;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .notification.show {
        transform: translateY(0);
      }
      
      .notification--success { background-color: #4caf50; }
      .notification--error { background-color: #f44336; }
      .notification--info { background-color: #2196f3; }
    `;
    
    document.head.appendChild(style);
  }
  
  attachEventListeners() {
    // Room tab click
    document.addEventListener('click', e => {
      if (e.target.matches('[data-tab="rooms"]')) {
        // Call switchProfileTab function if it exists in the main app
        if (window.app && typeof window.app.switchProfileTab === 'function') {
          window.app.switchProfileTab('rooms');
        } else {
          // Fallback - manually toggle tab
          const allTabs = document.querySelectorAll('.profile__tab');
          const allContents = document.querySelectorAll('.profile__content');
          
          allTabs.forEach(tab => tab.classList.remove('active'));
          allContents.forEach(content => content.classList.remove('active'));
          
          e.target.classList.add('active');
          document.getElementById('rooms-content')?.classList.add('active');
        }
        
        this.loadUserRooms();
      }
      
      // Create room button
      if (e.target.matches('#create-room-btn') || e.target.closest('#create-room-btn')) {
        this.showRoomDialog();
      }
      
      // Close room dialog
      if (e.target.matches('#room-close')) {
        this.hideRoomDialog();
      }
      
      // Delete room button
      if (e.target.matches('.delete-room-btn') || e.target.closest('.delete-room-btn')) {
        const button = e.target.matches('.delete-room-btn') ? e.target : e.target.closest('.delete-room-btn');
        const roomId = button.dataset.roomId;
        
        if (confirm('Are you sure you want to delete this reading room?')) {
          this.deleteRoom(roomId);
        }
      }
    });
    
    // Create room form submission
    document.addEventListener('submit', e => {
      if (e.target.matches('#create-room-form')) {
        e.preventDefault();
        this.createRoom();
      }
    });
  }
  
  showRoomDialog() {
    const dialog = document.getElementById('room-dialog');
    if (dialog) {
      dialog.classList.add('active');
    }
  }
  
  hideRoomDialog() {
    const dialog = document.getElementById('room-dialog');
    if (dialog) {
      dialog.classList.remove('active');
    }
  }
  
  async loadUserRooms() {
    if (!this.currentUser) {
      console.log('No user logged in');
      return;
    }
    
    try {
      const roomList = document.getElementById('room-list');
      if (!roomList) return;
      
      // Check if user is VIP
      if (!this.isVIP && !this.isAdmin) {
        roomList.innerHTML = `
          <div class="room-empty">
            <i class="ri-vip-crown-line"></i>
            <p>Reading rooms are a VIP feature</p>
            <button class="button upgrade-vip-btn" style="margin-top: 1rem;">Upgrade to VIP</button>
          </div>
        `;
        
        // Add upgrade button event listener
        const upgradeBtn = roomList.querySelector('.upgrade-vip-btn');
        if (upgradeBtn) {
          upgradeBtn.addEventListener('click', () => {
            if (window.showVIPUpgradeDialog && typeof window.showVIPUpgradeDialog === 'function') {
              window.showVIPUpgradeDialog();
            } else {
              this.showNotification('VIP upgrade feature coming soon', 'info');
            }
          });
        }
        
        return;
      }
      
      // Show loading state
      roomList.innerHTML = `
        <div class="room-empty">
          <i class="ri-loader-line"></i>
          <p>Loading rooms...</p>
        </div>
      `;
      
      // Get rooms created by user
      const createdRoomsSnapshot = await this.db.ref('readingRooms')
        .orderByChild('createdBy')
        .equalTo(this.currentUser.uid)
        .once('value');
      
      // Get rooms user has joined
      const joinedRoomsSnapshot = await this.db.ref('readingRooms')
        .orderByChild(`participants/${this.currentUser.uid}/joined`)
        .equalTo(true)
        .once('value');
      
      const rooms = [];
      
      // Add created rooms
      createdRoomsSnapshot.forEach(roomSnapshot => {
        rooms.push({
          id: roomSnapshot.key,
          ...roomSnapshot.val(),
          isOwner: true
        });
      });
      
      // Add joined rooms (that user didn't create)
      joinedRoomsSnapshot.forEach(roomSnapshot => {
        const room = roomSnapshot.val();
        if (room.createdBy !== this.currentUser.uid) {
          rooms.push({
            id: roomSnapshot.key,
            ...room,
            isOwner: false
          });
        }
      });
      
      // Update UI
      if (rooms.length === 0) {
        roomList.innerHTML = `
          <div class="room-empty">
            <i class="ri-book-read-line"></i>
            <p>You haven't created or joined any reading rooms yet</p>
          </div>
        `;
      } else {
        roomList.innerHTML = rooms.map(room => `
          <div class="room-item" data-room-id="${room.id}">
            <div class="room-item__header">
              <h3 class="room-item__title">${room.name}</h3>
              ${room.isPrivate ? 
                '<span class="room-item__badge">Private</span>' : 
                '<span class="room-item__badge">Public</span>'
              }
            </div>
            <p class="room-item__desc">${room.description || 'No description'}</p>
            <div class="room-item__footer">
              <div class="room-item__users">
                <i class="ri-user-line"></i>
                <span>${this.countParticipants(room)}</span>
              </div>
              <div class="room-item__actions">
                <a href="reader.html?room=${room.id}" class="button">
                  <i class="ri-login-box-line"></i> Enter Room
                </a>
                ${room.isOwner ? `
                  <button class="button button--ghost delete-room-btn" data-room-id="${room.id}">
                    <i class="ri-delete-bin-line"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Error loading reading rooms:', error);
      this.showNotification('Failed to load reading rooms', 'error');
    }
  }
  
  countParticipants(room) {
    if (!room.participants) return 0;
    return Object.keys(room.participants).length;
  }
  
  async createRoom() {
    if (!this.currentUser) {
      this.showNotification('Please log in to create a reading room', 'error');
      return;
    }
    
    if (!this.isVIP && !this.isAdmin) {
      this.showNotification('Reading rooms are a VIP feature', 'error');
      return;
    }
    
    // Get input elements safely with null checks
    const nameInput = document.getElementById('room-name');
    const descInput = document.getElementById('room-description');
    const privateCheck = document.getElementById('room-private');
    
    if (!nameInput || !descInput || !privateCheck) {
      this.showNotification('Form elements not found', 'error');
      return;
    }
    
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const isPrivate = privateCheck.checked;
    
    if (!name) {
      this.showNotification('Please enter a room name', 'error');
      return;
    }
    
    try {
      // Make sure we have a user name, use fallback if needed
      const userName = this.currentUser?.name || 'Unknown User';
      
      // Generate room ID with timestamp and random string
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create room in Firebase
      await this.db.ref(`readingRooms/${roomId}`).set({
        name,
        description,
        isPrivate,
        createdBy: this.currentUser.uid,
        creatorName: userName,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastActivity: firebase.database.ServerValue.TIMESTAMP,
        participants: {
          [this.currentUser.uid]: {
            name: userName,
            joined: true,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            isAdmin: true
          }
        }
      });
      
      // Reset form and close dialog
      nameInput.value = '';
      descInput.value = '';
      privateCheck.checked = false;
      this.hideRoomDialog();
      
      // Reload rooms
      this.loadUserRooms();
      
      this.showNotification('Reading room created successfully', 'success');
    } catch (error) {
      console.error('Error creating reading room:', error);
      this.showNotification('Failed to create reading room', 'error');
    }
  }
  
  async deleteRoom(roomId) {
    if (!this.currentUser) return;
    
    try {
      const roomSnapshot = await this.db.ref(`readingRooms/${roomId}`).once('value');
      const room = roomSnapshot.val();
      
      if (!room) {
        this.showNotification('Room not found', 'error');
        return;
      }
      
      // Check if user is room creator or admin
      if (room.createdBy !== this.currentUser.uid && !this.isAdmin) {
        this.showNotification('You do not have permission to delete this room', 'error');
        return;
      }
      
      // Delete room
      await this.db.ref(`readingRooms/${roomId}`).remove();
      
      // Reload rooms
      this.loadUserRooms();
      
      this.showNotification('Reading room deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting reading room:', error);
      this.showNotification('Failed to delete reading room', 'error');
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification after small delay to trigger transition
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize reading room manager
document.addEventListener('DOMContentLoaded', () => {
  window.readingRoomManager = new ReadingRoomManager();
});