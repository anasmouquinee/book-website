/**
 * Reading Room JavaScript
 * Handles all functionality related to the reading rooms
 */

class ReadingRoom {
  constructor() {
    try {
      // Initialize properties
      this.currentUser = null;
      this.userRooms = [];
      this.pendingInvites = [];
      this.isVIP = false;
      this.isAdmin = false;
      
      // Get Firebase services with better error handling
      const services = window.firebaseServices || this.initializeFirebase();
      if (!services) {
        throw new Error('Failed to initialize Firebase services for Reading Room');
      }
      
      this.auth = services.auth;
      this.db = services.db;
      
      if (!this.auth || !this.db) {
        throw new Error('Firebase auth or database not available');
      }
      
      console.log('Firebase services successfully connected in ReadingRoom');
      
      // Set auth state listener
      this.auth.onAuthStateChanged(user => {
        if (user) {
          this.fetchUserProfile(user.uid);
        } else {
          this.currentUser = null;
          this.userRooms = [];
          this.pendingInvites = [];
          this.updateRoomUI();
        }
      });
      
      // Initialize UI elements
      this.initElements();
      this.attachEventListeners();
      
    } catch (error) {
      console.error('Error initializing ReadingRoom:', error);
      // Handle initialization error gracefully
      this.showInitializationError();
    }
  }
  
  // Show initialization error message to user
  showInitializationError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'reading-room-error';
    errorDiv.innerHTML = `
      <div class="error-icon"><i class="ri-error-warning-line"></i></div>
      <h3>Failed to initialize Reading Rooms</h3>
      <p>Sorry, we couldn't connect to the reading room service. Please try refreshing the page.</p>
      <button id="retry-reading-room" class="button">Retry</button>
    `;
    
    // Add to the page
    const container = document.querySelector('.profile__container') || document.body;
    container.appendChild(errorDiv);
    
    // Add retry button functionality
    document.getElementById('retry-reading-room')?.addEventListener('click', () => {
      window.location.reload();
    });
    
    // Add error styles
    const style = document.createElement('style');
    style.textContent = `
      .reading-room-error {
        text-align: center;
        padding: 2rem;
        margin: 1rem auto;
        max-width: 500px;
        background-color: var(--container-color, #fff);
        border-radius: 0.75rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .error-icon {
        font-size: 3rem;
        color: #f44336;
        margin-bottom: 1rem;
      }
    `;
    document.head.appendChild(style);
  }
  
  initializeFirebase() {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK is not loaded');
      return null;
    }
    
    const firebaseConfig = {
      apiKey: "AIzaSyDpirWLijm_xTK6UxKZq0PoCYTaGl5AOs8",
      authDomain: "kaelar-83c97.firebaseapp.com",
      databaseURL: "https://kaelar-83c97-default-rtdb.firebaseio.com",
      projectId: "kaelar-83c97",
      storageBucket: "kaelar-83c97.appspot.com", 
      messagingSenderId: "820595468759",
      appId: "1:820595468759:web:fc8e03244c325b44560392",
      measurementId: "G-38S0WZ2RJ0"
    };
    
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized in ReadingRoom');
      } else {
        console.log('Using existing Firebase instance in ReadingRoom');
      }
      
      return {
        auth: firebase.auth(),
        db: firebase.database()
      };
    } catch (error) {
      console.error('Firebase initialization failed in ReadingRoom:', error);
      return null;
    }
  }
  
  // Initialize UI elements
  initElements() {
    // Room list elements
    this.roomListContainer = document.getElementById('room-list');
    this.createRoomBtn = document.getElementById('create-room-btn');
    this.roomsTabButton = document.querySelector('[data-tab="rooms"]');
    
    // Room creation form elements
    this.createRoomForm = document.getElementById('create-room-form');
    this.roomNameInput = document.getElementById('room-name');
    this.roomDescInput = document.getElementById('room-description');
    this.roomPrivateCheck = document.getElementById('room-private');
    
    // Room dialog elements
    this.roomDialog = document.getElementById('room-dialog');
    this.roomCloseBtn = document.getElementById('room-close');
    
    // Reading room feature button (to add to profile page)
    this.addReadingRoomTab();
    
    // Add styles
    this.addRoomDialogStyles();
  }
  
  // Add a new "Reading Rooms" tab to profile if not exists
  addReadingRoomTab() {
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
            
            <div class="rooms-sections">
              <!-- Room Actions -->
              <div class="rooms-actions">
                <button id="create-room-btn" class="button">
                  <i class="ri-add-line"></i> Create New Room
                </button>
                <button id="join-room-btn" class="button button--ghost">
                  <i class="ri-login-box-line"></i> Join Room
                </button>
              </div>
              
              <!-- Room pending invites section -->
              <div id="room-invites" class="room-invites">
                <h5>Pending Invites <span id="invite-count" class="badge">0</span></h5>
                <div id="invites-list" class="invites-list">
                  <!-- Invites will be listed here -->
                  <div class="no-invites">No pending invites</div>
                </div>
              </div>
              
              <!-- Room list section -->
              <div id="room-list" class="room-list">
                <!-- Rooms will be listed here -->
                <div class="room-empty">
                  <i class="ri-book-read-line"></i>
                  <p>No reading rooms available</p>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add to profile container
        profileContainer.appendChild(roomsContent);
        
        // Update references
        this.roomListContainer = document.getElementById('room-list');
        this.createRoomBtn = document.getElementById('create-room-btn');
        
        // Add join room button event
        document.getElementById('join-room-btn')?.addEventListener('click', () => {
          this.showJoinRoomDialog();
        });
      }
    }
    
    // Create room creation dialog if it doesn't exist
    this.createRoomDialog();
    
    // Create join room dialog if it doesn't exist
    this.createJoinRoomDialog();
  }
  
  // Create room dialog if it doesn't exist
  createRoomDialog() {
    if (document.getElementById('room-dialog')) return;
    
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
    
    // Update references
    this.roomDialog = dialog;
    this.createRoomForm = document.getElementById('create-room-form');
    this.roomNameInput = document.getElementById('room-name');
    this.roomDescInput = document.getElementById('room-description');
    this.roomPrivateCheck = document.getElementById('room-private');
    this.roomCloseBtn = document.getElementById('room-close');
  }
  
  // Create join room dialog
  createJoinRoomDialog() {
    if (document.getElementById('join-room-dialog')) return;
    
    const dialog = document.createElement('div');
    dialog.id = 'join-room-dialog';
    dialog.className = 'room-dialog';
    
    dialog.innerHTML = `
      <div class="room-dialog__content">
        <h3>Join Reading Room</h3>
        
        <div class="room-dialog__join">
          <form id="join-room-form" class="room-form">
            <div class="room-form__group">
              <label for="join-room-id">Room ID</label>
              <input type="text" id="join-room-id" placeholder="Enter room ID" required>
              <p class="form-hint">You can get this ID from the room creator</p>
            </div>
            <div class="room-form__buttons">
              <button type="submit" id="join-room-submit" class="button">Join Room</button>
              <button type="button" id="join-room-close" class="button button--ghost">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners for join room dialog
    document.getElementById('join-room-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const roomId = document.getElementById('join-room-id')?.value;
      if (roomId) {
        this.requestToJoinRoom(roomId);
      }
    });
    
    document.getElementById('join-room-close')?.addEventListener('click', () => {
      this.hideJoinRoomDialog();
    });
  }
  
  // Add CSS for room dialog and responsive design
  addRoomDialogStyles() {
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
        background-color: var(--container-color, #fff);
        border-radius: 1rem;
        padding: 2rem;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      /* All other CSS styles from your original code */
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
        border: 1px solid var(--border-color, #e0e0e0);
        border-radius: 0.5rem;
        background-color: var(--container-color, #fff);
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
      
      .form-hint {
        font-size: 0.875rem;
        color: var(--text-color-light, #707070);
        margin-top: 0.5rem;
      }
      
      .rooms-sections {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-top: 1rem;
      }
      
      .rooms-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
      
      .room-list,
      .invites-list {
        margin-top: 1rem;
      }
      
      .room-item {
        background-color: var(--container-color, #fff);
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
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .room-item__title {
        font-size: var(--h3-font-size, 1.25rem);
        margin: 0;
      }
      
      .room-item__badge {
        font-size: var(--small-font-size, 0.813rem);
        padding: 0.25rem 0.5rem;
        border-radius: 1rem;
        background-color: var(--first-color-lighter, #e6f2ff);
        color: var(--first-color-dark, #0056b3);
      }
      
      .room-item__desc {
        margin: 0.5rem 0;
        color: var(--text-color-light, #707070);
      }
      
      .room-item__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .room-item__users {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--text-color-light, #707070);
      }
      
      .room-item__users i {
        font-size: 1.25rem;
      }
      
      .room-item__actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      
      .room-empty,
      .no-invites {
        text-align: center;
        padding: 2rem;
        color: var(--text-color-light, #707070);
      }
      
      .room-empty i,
      .no-invites i {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      
      .badge {
        background-color: var(--first-color, #0077ff);
        color: #fff;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.1rem 0.5rem;
        border-radius: 1rem;
        margin-left: 0.5rem;
      }
      
      .invite-item {
        background-color: var(--container-color, #fff);
        border-radius: 0.75rem;
        padding: 1rem;
        margin-bottom: 1rem;
        border-left: 3px solid var(--first-color, #0077ff);
      }
      
      .invite-item__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      
      .invite-item__title {
        font-size: var(--normal-font-size, 1rem);
        font-weight: 500;
        margin: 0;
      }
      
      .invite-item__desc {
        font-size: var(--small-font-size, 0.813rem);
        color: var(--text-color-light, #707070);
        margin-bottom: 1rem;
      }
      
      .invite-item__actions {
        display: flex;
        gap: 0.5rem;
      }
      
      .button--small {
        padding: 0.25rem 0.75rem;
        font-size: 0.875rem;
      }
      
      .button--accept {
        background-color: #4caf50;
      }
      
      .button--decline {
        background-color: #f44336;
      }
      
      .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: var(--container-color, #fff);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(100%);
        opacity: 0;
        transition: transform 0.3s, opacity 0.3s;
        z-index: 1001;
      }
      
      .notification.show {
        transform: translateY(0);
        opacity: 1;
      }
      
      .notification--success {
        border-left: 4px solid #4caf50;
      }
      
      .notification--error {
        border-left: 4px solid #f44336;
      }
      
      .notification--info {
        border-left: 4px solid #2196f3;
      }
      
      /* Responsive Adjustments */
      @media screen and (max-width: 768px) {
        .room-dialog__content {
          padding: 1.5rem;
          width: 95%;
        }
        
        .rooms-actions {
          flex-direction: column;
        }
        
        .room-item__header,
        .room-item__footer {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .room-item__actions {
          width: 100%;
          justify-content: flex-end;
        }
        
        .button--small {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Attach event listeners
  attachEventListeners() {
    try {
      // Handle room tab click
      const roomsTab = document.querySelector('[data-tab="rooms"]');
      if (roomsTab) {
        roomsTab.addEventListener('click', () => {
          this.loadUserRooms();
          this.loadPendingInvites();
        });
      }
      
      // Create room button
      if (this.createRoomBtn) {
        this.createRoomBtn.addEventListener('click', () => {
          this.showRoomDialog();
        });
      }
      
      // Room close button
      if (this.roomCloseBtn) {
        this.roomCloseBtn.addEventListener('click', () => {
          this.hideRoomDialog();
        });
      }
      
      // Create room form
      if (this.createRoomForm) {
        this.createRoomForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.createRoom();
        });
      }
      
      // Listen for profile tab switch events
      document.addEventListener('profile-tab-changed', (e) => {
        if (e.detail && e.detail.tab === 'rooms') {
          this.loadUserRooms();
          this.loadPendingInvites();
        }
      });
    } catch (error) {
      console.error('Error attaching event listeners:', error);
    }
  }
  
  // Fetch user profile
  async fetchUserProfile(uid) {
    if (!uid) return;
    
    try {
      const snapshot = await this.db.ref(`users/${uid}`).once('value');
      if (snapshot.exists()) {
        const userData = snapshot.val();
        this.currentUser = {
          uid,
          ...userData
        };
        
        // Check if user is VIP
        this.isVIP = !!(userData.isVIP || userData.VIPActivatedAt);
        this.isAdmin = !!userData.isAdmin;
        
        // Load user's rooms
        this.loadUserRooms();
        this.loadPendingInvites();
        
        console.log('Reading Room: User profile fetched', this.currentUser.name);
      }
    } catch (error) {
      console.error('Error fetching user profile for reading room:', error);
    }
  }
  
  // Load user's reading rooms
  async loadUserRooms() {
    if (!this.currentUser || !this.currentUser.uid) return;
    
    try {
      // Check if user is VIP or admin
      if (!this.isVIP && !this.isAdmin) {
        this.showVIPRequiredMessage();
        return;
      }
      
      // Get rooms created by user
      const createdRoomsSnapshot = await this.db.ref('readingRooms')
        .orderByChild('createdBy')
        .equalTo(this.currentUser.uid)
        .once('value');
      
      // Get rooms user has joined
      const userRoomsSnapshot = await this.db.ref('readingRooms')
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
      
      // Add joined rooms (that are not created by user)
      userRoomsSnapshot.forEach(roomSnapshot => {
        const roomData = roomSnapshot.val();
        // Skip if already added (user is creator)
        if (roomData.createdBy !== this.currentUser.uid) {
          rooms.push({
            id: roomSnapshot.key,
            ...roomData,
            isOwner: false
          });
        }
      });
      
      this.userRooms = rooms;
      this.updateRoomUI();
      
    } catch (error) {
      console.error('Error loading user rooms:', error);
      this.showNotification('Failed to load reading rooms', 'error');
    }
  }
  
  // Load pending invites and join requests
  async loadPendingInvites() {
    if (!this.currentUser || !this.currentUser.uid) return;
    
    try {
      // Check if user is VIP or admin
      if (!this.isVIP && !this.isAdmin) return;
      
      const pendingInvites = [];
      
      // Get rooms where user has pending invites
      const pendingInvitesSnapshot = await this.db.ref('readingRooms')
        .orderByChild(`pendingUsers/${this.currentUser.uid}/status`)
        .equalTo('pending')
        .once('value');
      
      pendingInvitesSnapshot.forEach(roomSnapshot => {
        const roomData = roomSnapshot.val();
        if (roomData.pendingUsers && roomData.pendingUsers[this.currentUser.uid]) {
          const inviteData = roomData.pendingUsers[this.currentUser.uid];
          
          pendingInvites.push({
            id: roomSnapshot.key,
            name: roomData.name,
            description: roomData.description,
            isPrivate: roomData.isPrivate,
            invitedBy: inviteData.invitedBy || null,
            invitedAt: inviteData.invitedAt || null
          });
        }
      });
      
      this.pendingInvites = pendingInvites;
      this.updateInvitesUI();
      
    } catch (error) {
      console.error('Error loading pending invites:', error);
      this.showNotification('Failed to load invitations', 'error');
    }
  }
  
  // Update invites UI
  updateInvitesUI() {
    const invitesList = document.getElementById('invites-list');
    const inviteCount = document.getElementById('invite-count');
    
    if (!invitesList || !inviteCount) return;
    
    inviteCount.textContent = this.pendingInvites.length;
    
    if (this.pendingInvites.length === 0) {
      invitesList.innerHTML = '<div class="no-invites">No pending invites</div>';
      return;
    }
    
    invitesList.innerHTML = this.pendingInvites.map(invite => `
      <div class="invite-item" data-room-id="${invite.id}">
        <div class="invite-item__header">
          <h5 class="invite-item__title">${this.escapeHtml(invite.name)}</h5>
          ${invite.isPrivate ? '<span class="room-item__badge">Private Room</span>' : ''}
        </div>
        <p class="invite-item__desc">${this.escapeHtml(invite.description || 'No description')}</p>
        <div class="invite-item__actions">
          <button class="button button--small button--accept accept-invite-btn" data-room-id="${invite.id}">
            Accept
          </button>
          <button class="button button--small button--decline decline-invite-btn" data-room-id="${invite.id}">
            Decline
          </button>
        </div>
      </div>
    `).join('');
    
    // Add button event listeners
    invitesList.querySelectorAll('.accept-invite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roomId = e.target.dataset.roomId;
        this.acceptRoomInvite(roomId);
      });
    });
    
    invitesList.querySelectorAll('.decline-invite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roomId = e.target.dataset.roomId;
        this.declineRoomInvite(roomId);
      });
    });
  }
  
  // Helper method to escape HTML to prevent XSS
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Update room UI
  updateRoomUI() {
    const roomList = document.getElementById('room-list');
    if (!roomList) return;
    
    if (!this.isVIP && !this.isAdmin) {
      roomList.innerHTML = `
        <div class="room-empty">
          <i class="ri-vip-crown-line"></i>
          <p>Reading rooms are a VIP feature</p>
          <button class="button upgrade-vip-btn" style="margin-top: 1rem;">Upgrade to VIP</button>
        </div>
      `;
      
      // Add upgrade button listener
      const upgradeBtn = roomList.querySelector('.upgrade-vip-btn');
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
          // Show VIP upgrade dialog (you need to implement this)
          if (typeof window.showVIPUpgradeDialog === 'function') {
            window.showVIPUpgradeDialog();
          } else {
            this.showNotification('VIP upgrade is not available yet', 'info');
          }
        });
      }
      
      return;
    }
    
    if (this.userRooms.length === 0) {
      roomList.innerHTML = `
        <div class="room-empty">
          <i class="ri-book-read-line"></i>
          <p>You haven't created or joined any reading rooms yet</p>
        </div>
      `;
      return;
    }
    
    roomList.innerHTML = this.userRooms.map(room => `
      <div class="room-item" data-room-id="${room.id}">
        <div class="room-item__header">
          <h3 class="room-item__title">${this.escapeHtml(room.name)}</h3>
          ${room.isPrivate ? 
            '<span class="room-item__badge">Private</span>' : 
            '<span class="room-item__badge">Public</span>'
          }
        </div>
        <p class="room-item__desc">${this.escapeHtml(room.description || 'No description')}</p>
        <div class="room-item__footer">
          <div class="room-item__users">
            <i class="ri-user-line"></i>
            <span>${this.countRoomParticipants(room)}</span>
          </div>
          <div class="room-item__actions">
            <a href="reader.html?room=${room.id}" class="button button--small">
              <i class="ri-login-box-line"></i> Enter Room
            </a>
            ${room.isOwner ? `
              <button class="button button--small button--ghost manage-room-btn" data-room-id="${room.id}">
                <i class="ri-settings-line"></i> Manage
              </button>
              <button class="button button--small button--ghost delete-room-btn" data-room-id="${room.id}">
                <i class="ri-delete-bin-line"></i>
              </button>
            ` : `
              <button class="button button--small button--ghost leave-room-btn" data-room-id="${room.id}">
                <i class="ri-logout-box-line"></i> Leave
              </button>
            `}
          </div>
        </div>
      </div>
    `).join('');
    
    // Add button event listeners
    this.addRoomButtonEventListeners(roomList);
  }
  
  // Add event listeners to room buttons
  addRoomButtonEventListeners(roomList) {
    if (!roomList) return;
    
    // Delete room buttons
    roomList.querySelectorAll('.delete-room-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomId = e.currentTarget.dataset.roomId;
        if (confirm('Are you sure you want to delete this reading room?')) {
          this.deleteRoom(roomId);
        }
      });
    });
    
    // Leave room buttons
    roomList.querySelectorAll('.leave-room-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomId = e.currentTarget.dataset.roomId;
        if (confirm('Are you sure you want to leave this reading room?')) {
          this.leaveRoom(roomId);
        }
      });
    });
    
    // Manage room buttons
    roomList.querySelectorAll('.manage-room-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomId = e.currentTarget.dataset.roomId;
        this.showManageRoomDialog(roomId);
      });
    });
  }
  
  // Count participants in a room
  countRoomParticipants(room) {
    if (!room.participants) return 0;
    return Object.entries(room.participants).filter(([_, userData]) => userData.joined).length;
  }
  
  // Show room dialog
  showRoomDialog() {
    if (!this.roomDialog) {
      this.createRoomDialog();
    }
    
    // Make sure styles are added
    this.addRoomDialogStyles();
    
    this.roomDialog.classList.add('active');
  }
  
  // Hide room dialog
  hideRoomDialog() {
    if (this.roomDialog) {
      this.roomDialog.classList.remove('active');
    }
  }
  
  // Show join room dialog
  showJoinRoomDialog() {
    const joinDialog = document.getElementById('join-room-dialog');
    if (!joinDialog) {
      this.createJoinRoomDialog();
    }
    
    // Make sure styles are added
    this.addRoomDialogStyles();
    
    document.getElementById('join-room-dialog')?.classList.add('active');
  }
  
  // Hide join room dialog
  hideJoinRoomDialog() {
    document.getElementById('join-room-dialog')?.classList.remove('active');
  }
  
  // Create a new room
  async createRoom() {
    if (!this.currentUser) {
      this.showNotification('Please log in to create a reading room', 'error');
      return;
    }
    
    if (!this.isVIP && !this.isAdmin) {
      this.showNotification('Reading rooms are a VIP feature', 'error');
      return;
    }
    
    const name = this.roomNameInput?.value.trim();
    const description = this.roomDescInput?.value.trim();
    const isPrivate = this.roomPrivateCheck?.checked || false;
    
    if (!name) {
      this.showNotification('Please enter a room name', 'error');
      return;
    }
    
    try {
      // Generate a unique room ID
      const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Create room in Firebase
      await this.db.ref(`readingRooms/${roomId}`).set({
        name,
        description,
        isPrivate,
        createdBy: this.currentUser.uid,
        creatorName: this.currentUser.name,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastActivity: firebase.database.ServerValue.TIMESTAMP,
        participants: {
          [this.currentUser.uid]: {
            name: this.currentUser.name,
            joined: true,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            isAdmin: true
          }
        }
      });
      
      // Hide dialog and reset form
      this.hideRoomDialog();
      if (this.roomNameInput) this.roomNameInput.value = '';
      if (this.roomDescInput) this.roomDescInput.value = '';
      if (this.roomPrivateCheck) this.roomPrivateCheck.checked = false;
      
      // Reload rooms
      this.loadUserRooms();
      
      // Show invite link
      this.showRoomInviteLink(roomId);
      
    } catch (error) {
      console.error('Error creating reading room:', error);
      this.showNotification('Failed to create reading room', 'error');
    }
  }
  
  // Request to join a room
  async requestToJoinRoom(roomId) {
    if (!this.currentUser) {
      this.showNotification('Please log in to join a reading room', 'error');
      return;
    }
    
    if (!this.isVIP && !this.isAdmin) {
      this.showNotification('Reading rooms are a VIP feature', 'error');
      return;
    }
    
    try {
      // First check if room exists
      const roomSnapshot = await this.db.ref(`readingRooms/${roomId}`).once('value');
      const room = roomSnapshot.val();
      
      if (!room) {
        this.showNotification('Room not found', 'error');
        return;
      }
      
      // Check if user is already a participant
      if (room.participants && room.participants[this.currentUser.uid]) {
        this.showNotification('You are already a member of this room', 'info');
        this.hideJoinRoomDialog();
        return;
      }
      
      // Check if user already has a pending request
      if (room.pendingUsers && room.pendingUsers[this.currentUser.uid]) {
        this.showNotification('You already have a pending request for this room', 'info');
        this.hideJoinRoomDialog();
        return;
      }
      
      // If private room, add to pending users
      if (room.isPrivate) {
        await this.db.ref(`readingRooms/${roomId}/pendingUsers/${this.currentUser.uid}`).set({
          name: this.currentUser.name,
          status: 'pending',
          requestedAt: firebase.database.ServerValue.TIMESTAMP,
          type: 'join_request'
        });
        
        this.showNotification('Join request sent. Waiting for approval.', 'success');
      } else {
        // If public room, add user directly
        await this.db.ref(`readingRooms/${roomId}/participants/${this.currentUser.uid}`).set({
          name: this.currentUser.name,
          joined: true,
          joinedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update last activity
        await this.db.ref(`readingRooms/${roomId}`).update({
          lastActivity: firebase.database.ServerValue.TIMESTAMP
        });
        
        this.showNotification('You have joined the room successfully', 'success');
        
        // Reload rooms
        this.loadUserRooms();
      }
      
      // Hide join dialog
      this.hideJoinRoomDialog();
      
      // Reset form
      const joinRoomIdInput = document.getElementById('join-room-id');
      if (joinRoomIdInput) joinRoomIdInput.value = '';
      
    } catch (error) {
      console.error('Error joining reading room:', error);
      this.showNotification('Failed to join reading room', 'error');
    }
  }
  
  // Accept a room invite
  async acceptRoomInvite(roomId) {
    if (!this.currentUser) return;
    
    try {
      // Move from pending to participants
      await this.db.ref(`readingRooms/${roomId}/participants/${this.currentUser.uid}`).set({
        name: this.currentUser.name,
        joined: true,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Remove from pending
      await this.db.ref(`readingRooms/${roomId}/pendingUsers/${this.currentUser.uid}`).remove();
      
      // Update last activity
      await this.db.ref(`readingRooms/${roomId}`).update({
        lastActivity: firebase.database.ServerValue.TIMESTAMP
      });
      
      this.showNotification('You have joined the room successfully', 'success');
      
      // Reload invites and rooms
      this.loadPendingInvites();
      this.loadUserRooms();
      
    } catch (error) {
      console.error('Error accepting room invite:', error);
      this.showNotification('Failed to join room', 'error');
    }
  }
  
  // Decline a room invite
  async declineRoomInvite(roomId) {
    if (!this.currentUser) return;
    
    try {
      // Remove from pending
      await this.db.ref(`readingRooms/${roomId}/pendingUsers/${this.currentUser.uid}`).remove();
      
      this.showNotification('Invitation declined', 'info');
      
      // Reload invites
      this.loadPendingInvites();
      
    } catch (error) {
      console.error('Error declining room invite:', error);
      this.showNotification('Failed to decline invitation', 'error');
    }
  }
  
  // Leave a room
  async leaveRoom(roomId) {
    if (!this.currentUser) return;
    
    try {
      // Remove from participants
      await this.db.ref(`readingRooms/${roomId}/participants/${this.currentUser.uid}`).remove();
      
      this.showNotification('You have left the room', 'info');
      
      // Reload rooms
      this.loadUserRooms();
      
    } catch (error) {
      console.error('Error leaving room:', error);
      this.showNotification('Failed to leave room', 'error');
    }
  }
  
  // Delete a room
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
  
  // Show room invite link
  showRoomInviteLink(roomId) {
    const link = `${window.location.origin}/reader.html?room=${roomId}`;
    
    // Create a modal to display the link
    const modal = document.createElement('div');
    modal.className = 'room-dialog active';
    modal.innerHTML = `
      <div class="room-dialog__content">
        <h3>Room Created Successfully</h3>
        <p>Share this link with others to invite them to your reading room:</p>
        <div class="invite-link-container">
          <input type="text" value="${link}" readonly class="invite-link-input">
          <button class="button copy-link-btn">Copy Link</button>
        </div>
        <div class="room-form__buttons">
          <button class="button room-link-close">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add copy button event
    modal.querySelector('.copy-link-btn')?.addEventListener('click', () => {
      const input = modal.querySelector('.invite-link-input');
      if (input) {
        input.select();
        document.execCommand('copy');
        this.showNotification('Link copied to clipboard', 'success');
      }
    });
    
    // Add close button event
    modal.querySelector('.room-link-close')?.addEventListener('click', () => {
      modal.remove();
    });
  }
  
  // Show notification
  showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
      return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show the notification after a small delay to trigger CSS transition
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after a delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
  // Show VIP required message
  showVIPRequiredMessage() {
    const roomList = document.getElementById('room-list');
    if (!roomList) return;
    
    roomList.innerHTML = `
      <div class="room-empty">
        <i class="ri-vip-crown-line"></i>
        <p>Reading rooms are a VIP feature</p>
        <button class="button upgrade-vip-btn" style="margin-top: 1rem;">Upgrade to VIP</button>
      </div>
    `;
    
    // Add upgrade button listener
    const upgradeBtn = roomList.querySelector('.upgrade-vip-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        // Show VIP upgrade dialog
        if (typeof window.showVIPUpgradeDialog === 'function') {
          window.showVIPUpgradeDialog();
        } else {
          this.showNotification('VIP upgrade is not available yet', 'info');
        }
      });
    }
  }
  
  // Show manage room dialog
  async showManageRoomDialog(roomId) {
    if (!this.currentUser) return;
    
    try {
      // Get room data
      const roomSnapshot = await this.db.ref(`readingRooms/${roomId}`).once('value');
      const room = roomSnapshot.val();
      
      if (!room) {
        this.showNotification('Room not found', 'error');
        return;
      }
      
      // Check if user is room creator or admin
      if (room.createdBy !== this.currentUser.uid && !this.isAdmin) {
        this.showNotification('You do not have permission to manage this room', 'error');
        return;
      }
      
      // Create manage room modal
      const modal = document.createElement('div');
      modal.className = 'room-dialog active';
      modal.id = 'manage-room-dialog';
      
      // Get pending users from both pendingUsers and joinRequests
      const pendingUsers = this.getPendingUsers(room);
      
      // Generate modal HTML
      modal.innerHTML = this.generateManageModalHtml(room, roomId, pendingUsers);
      
      document.body.appendChild(modal);
      
      // Add manage room styles
      this.addManageRoomStyles();
      
      // Add event listeners to the manage room dialog
      this.addManageDialogEventListeners(modal, roomId, room);
      
    } catch (error) {
      console.error('Error showing manage room dialog:', error);
      this.showNotification('Failed to load room management', 'error');
    }
    
  }
  // Helper method to get pending users from a room
  // Add this method to your ReadingRoom class before the closing brace

// Generate HTML for manage room modal
generateManageModalHtml(room, roomId, pendingUsers) {
  const hasRequests = pendingUsers.length > 0;
  
  // Format date for display
  const formattedDate = room.createdAt ? new Date(room.createdAt).toLocaleString() : 'Unknown';
  
  return `
    <div class="room-dialog__content">
      <div class="dialog-header">
        <h3>Manage Room</h3>
        <button class="dialog-close-btn"><i class="ri-close-line"></i></button>
      </div>
      
      <!-- Tabs -->
      <div class="manage-tabs">
        <button class="manage-tab active" data-tab="settings">Settings</button>
        <button class="manage-tab" data-tab="participants">Participants</button>
        <button class="manage-tab" data-tab="requests">
          Pending Requests ${hasRequests ? `<span class="badge">${pendingUsers.length}</span>` : ''}
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="manage-tab-content">
        <!-- Settings Tab -->
        <div class="tab-pane active" id="settings-tab">
          <form id="update-room-form" class="room-form">
            <div class="room-form__group">
              <label for="update-room-name">Room Name</label>
              <input type="text" id="update-room-name" value="${this.escapeHtml(room.name)}" required>
            </div>
            <div class="room-form__group">
              <label for="update-room-description">Description</label>
              <textarea id="update-room-description">${this.escapeHtml(room.description || '')}</textarea>
            </div>
            <div class="room-form__group room-form__checkbox">
              <input type="checkbox" id="update-room-private" ${room.isPrivate ? 'checked' : ''}>
              <label for="update-room-private">Private Room (requires approval to join)</label>
            </div>
            <div class="room-info">
              <p><strong>Room ID:</strong> ${roomId}</p>
              <p><strong>Created:</strong> ${formattedDate}</p>
            </div>
            <div class="room-form__buttons">
              <button type="submit" class="button">Save Changes</button>
            </div>
          </form>
        </div>
        
        <!-- Participants Tab -->
        <div class="tab-pane" id="participants-tab">
          <div class="room-participants-list">
            ${this.generateParticipantsHtml(room)}
          </div>
        </div>
        
        <!-- Requests Tab -->
        <div class="tab-pane" id="requests-tab">
          ${this.generatePendingRequestsHtml(pendingUsers)}
        </div>
      </div>
    </div>
  `;
}

// Generate HTML for participants list
generateParticipantsHtml(room) {
  if (!room.participants) {
    return '<div class="no-participants">No participants yet</div>';
  }
  
  const participantsHtml = Object.entries(room.participants)
    .filter(([_, data]) => data.joined)
    .map(([uid, data]) => `
      <div class="participant-item" data-user-id="${uid}">
        <p class="participant-name">
          ${this.escapeHtml(data.name || 'Unknown User')} 
          ${uid === this.currentUser.uid ? ' (You)' : ''}
          ${uid === room.createdBy ? ' <span class="owner-badge">Owner</span>' : ''}
        </p>
        ${uid !== room.createdBy && uid !== this.currentUser.uid ? 
          `<button class="button button--small button--decline remove-participant-btn" data-user-id="${uid}">
            Remove
          </button>` : ''
        }
      </div>
    `).join('');
  
  return participantsHtml || '<div class="no-participants">No participants yet</div>';
}

// Generate HTML for pending requests list
generatePendingRequestsHtml(pendingUsers) {
  if (pendingUsers.length === 0) {
    return '<div class="no-requests">No pending requests</div>';
  }
  
  return `
    <div class="pending-requests-list">
      ${pendingUsers.map(user => `
        <div class="pending-request" data-user-id="${user.uid}">
          <p class="request-name">${this.escapeHtml(user.name)}</p>
          <div class="request-actions">
            <button class="button button--small button--accept approve-request-btn" 
              data-user-id="${user.uid}" 
              data-source="${user.source}">
              Approve
            </button>
            <button class="button button--small button--decline reject-request-btn" 
              data-user-id="${user.uid}" 
              data-source="${user.source}">
              Reject
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Add manage room styles
addManageRoomStyles() {
  if (document.getElementById('manage-room-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'manage-room-styles';
  style.textContent = `
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    .dialog-close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    
    .dialog-close-btn:hover {
      opacity: 1;
    }
    
    .manage-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
      margin-bottom: 1.5rem;
      gap: 0.5rem;
    }
    
    .manage-tab {
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      font-weight: 500;
      opacity: 0.7;
      position: relative;
    }
    
    .manage-tab.active {
      border-bottom-color: var(--first-color, #0077ff);
      opacity: 1;
    }
    
    .tab-pane {
      display: none;
    }
    
    .tab-pane.active {
      display: block;
    }
    
    .room-info {
      margin: 1rem 0;
      padding: 1rem;
      background-color: var(--container-color-light, #f5f5f5);
      border-radius: 0.5rem;
    }
    
    .room-info p {
      margin: 0.5rem 0;
    }
    
    .participant-item, 
    .pending-request {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .owner-badge {
      background-color: var(--first-color-lighter, #e6f2ff);
      color: var(--first-color-dark, #0056b3);
      font-size: 0.75rem;
      padding: 0.1rem 0.5rem;
      border-radius: 1rem;
      margin-left: 0.5rem;
    }
    
    .no-participants,
    .no-requests {
      text-align: center;
      padding: 2rem;
      color: var(--text-color-light, #707070);
    }
    
    .request-actions {
      display: flex;
      gap: 0.5rem;
    }
  `;
  
  document.head.appendChild(style);
}
// Add request action listeners
addRequestActionListeners(modal, roomId) {
  // Approve request event
  modal.querySelectorAll('.approve-request-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const source = btn.dataset.source;
      
      try {
        // Approve the request
        await this.approveJoinRequest(roomId, userId, source);
        
        // Remove the request item from the UI
        const requestItem = btn.closest('.pending-request');
        if (requestItem) requestItem.remove();
        
        // Update request count in tab
        const requestsTab = modal.querySelector('[data-tab="requests"]');
        const remainingCount = modal.querySelectorAll('.pending-request').length;
        if (requestsTab) {
          requestsTab.textContent = `Pending Requests${remainingCount > 0 ? ` <span class="badge">${remainingCount}</span>` : ''}`;
        }
        
        // Show message if no more requests
        if (remainingCount === 0) {
          const requestsList = modal.querySelector('.pending-requests-list');
          if (requestsList) {
            requestsList.innerHTML = '<div class="no-requests">No pending requests</div>';
          }
        }
        
        // Refresh participants tab
        this.refreshParticipantsTab(modal, roomId);
        
      } catch (error) {
        console.error('Error approving request:', error);
        this.showNotification('Failed to approve request', 'error');
      }
    });
  });
  
  // Reject request event
  modal.querySelectorAll('.reject-request-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const source = btn.dataset.source;
      
      try {
        // Reject the request
        await this.rejectJoinRequest(roomId, userId, source);
        
        // Remove the request item from the UI
        const requestItem = btn.closest('.pending-request');
        if (requestItem) requestItem.remove();
        
        // Update request count in tab
        const requestsTab = modal.querySelector('[data-tab="requests"]');
        const remainingCount = modal.querySelectorAll('.pending-request').length;
        if (requestsTab) {
          requestsTab.textContent = `Pending Requests${remainingCount > 0 ? ` <span class="badge">${remainingCount}</span>` : ''}`;
        }
        
        // Show message if no more requests
        if (remainingCount === 0) {
          const requestsList = modal.querySelector('.pending-requests-list');
          if (requestsList) {
            requestsList.innerHTML = '<div class="no-requests">No pending requests</div>';
          }
        }
        
      } catch (error) {
        console.error('Error rejecting request:', error);
        this.showNotification('Failed to reject request', 'error');
      }
    });
  });
}

// Add event listeners to the manage room dialog
addManageDialogEventListeners(modal, roomId, room) {
  // Close button
  modal.querySelector('.dialog-close-btn')?.addEventListener('click', () => {
    modal.remove();
  });
  
  // Tab switching
  modal.querySelectorAll('.manage-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and panes
      modal.querySelectorAll('.manage-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Get tab ID and activate corresponding pane
      const tabId = tab.dataset.tab;
      modal.querySelector(`#${tabId}-tab`)?.classList.add('active');
    });
  });
  
  // Update room form
  modal.querySelector('#update-room-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nameInput = modal.querySelector('#update-room-name');
    const descInput = modal.querySelector('#update-room-description');
    const privateCheck = modal.querySelector('#update-room-private');
    
    if (!nameInput) return;
    
    const settings = {
      name: nameInput.value.trim(),
      description: descInput?.value.trim() || '',
      isPrivate: privateCheck?.checked || false
    };
    
    // Validate
    if (!settings.name) {
      this.showNotification('Room name cannot be empty', 'error');
      return;
    }
    
    // Update settings
    const success = await this.updateRoomSettings(roomId, settings);
    
    if (success) {
      this.showNotification('Room settings updated successfully', 'success');
      modal.remove();
    }
  });
  
  // Add participant removal listeners
  this.addRemoveParticipantListeners(modal, roomId);
  
  // Add request action listeners
  this.addRequestActionListeners(modal, roomId);
}
getPendingUsers(room) {
  const pendingUsers = [];
  
  // Check pendingUsers collection
  if (room.pendingUsers) {
    Object.entries(room.pendingUsers).forEach(([uid, userData]) => {
      // Only add if status is pending or not specified
      if (!userData.status || userData.status === 'pending') {
        pendingUsers.push({
          uid,
          name: userData.name || 'Unknown User',
          requestedAt: userData.requestedAt || userData.timestamp || Date.now(),
          source: 'pendingUsers'
        });
      }
    });
  }
  
  // Check joinRequests collection
  if (room.joinRequests) {
    Object.entries(room.joinRequests).forEach(([uid, userData]) => {
      // Only add if status is pending
      if (userData.status === 'pending') {
        pendingUsers.push({
          uid,
          name: userData.userName || userData.name || 'Unknown User',
          requestedAt: userData.requestTime || userData.timestamp || Date.now(),
          source: 'joinRequests'
        });
      }
    });
  }
  
  // Sort by request time (newest first)
  return pendingUsers.sort((a, b) => b.requestedAt - a.requestedAt);
}

// Add listeners for remove participant buttons
addRemoveParticipantListeners(modal, roomId) {
  modal.querySelectorAll('.remove-participant-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      
      if (confirm('Are you sure you want to remove this participant?')) {
        try {
          // Remove user from participants
          await this.db.ref(`readingRooms/${roomId}/participants/${userId}`).remove();
          
          // Remove the participant item from the UI
          const participantItem = btn.closest('.participant-item');
          if (participantItem) participantItem.remove();
          
          this.showNotification('Participant removed successfully', 'success');
        } catch (error) {
          console.error('Error removing participant:', error);
          this.showNotification('Failed to remove participant', 'error');
        }
      }
    });
  });
}

// Refresh participants tab in manage room dialog
async refreshParticipantsTab(modal, roomId) {
  try {
    // Get updated room data
    const roomSnapshot = await this.db.ref(`readingRooms/${roomId}`).once('value');
    const room = roomSnapshot.val();
    
    if (!room) return;
    
    // Update participants list
    const participantsList = modal.querySelector('.room-participants-list');
    if (!participantsList) return;
    
    if (!room.participants) {
      participantsList.innerHTML = '<div class="no-participants">No participants yet</div>';
      return;
    }
    
    participantsList.innerHTML = Object.entries(room.participants)
      .filter(([_, data]) => data.joined)
      .map(([uid, data]) => `
        <div class="participant-item" data-user-id="${uid}">
          <p class="participant-name">
            ${this.escapeHtml(data.name || 'Unknown User')} 
            ${uid === this.currentUser.uid ? ' (You)' : ''}
            ${uid === room.createdBy ? ' <span class="owner-badge">Owner</span>' : ''}
          </p>
          ${uid !== room.createdBy && uid !== this.currentUser.uid ? 
            `<button class="button button--small button--decline remove-participant-btn" data-user-id="${uid}">
              Remove
            </button>` : ''
          }
        </div>
      `).join('');
    
    // Re-add event listeners
    this.addRemoveParticipantListeners(modal, roomId);
    
  } catch (error) {
    console.error('Error refreshing participants tab:', error);
  }
}

// Approve join request
async approveJoinRequest(roomId, userId, source) {
  if (!this.currentUser) return;
  
  try {
    // Add user to participants
    const pendingUserRef = this.db.ref(`readingRooms/${roomId}/${source}/${userId}`);
    const pendingUserSnapshot = await pendingUserRef.once('value');
    
    if (!pendingUserSnapshot.exists()) {
      throw new Error('User request not found');
    }
    
    const userData = pendingUserSnapshot.val();
    const userName = userData.name || userData.userName || 'Unknown User';
    
    // Add user to participants
    await this.db.ref(`readingRooms/${roomId}/participants/${userId}`).set({
      name: userName,
      joined: true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Remove from pending users/requests
    await pendingUserRef.remove();
    
    // Update last activity
    await this.db.ref(`readingRooms/${roomId}`).update({
      lastActivity: firebase.database.ServerValue.TIMESTAMP
    });
    
    this.showNotification('User approved successfully', 'success');
    
  } catch (error) {
    console.error('Error approving join request:', error);
    this.showNotification('Failed to approve request', 'error');
    throw error; // Re-throw to handle in calling function
  }
}

// Reject join request
async rejectJoinRequest(roomId, userId, source) {
  if (!this.currentUser) return;
  
  try {
    // Simply remove from pending users/requests
    await this.db.ref(`readingRooms/${roomId}/${source}/${userId}`).remove();
    
    this.showNotification('Request rejected', 'info');
    
  } catch (error) {
    console.error('Error rejecting join request:', error);
    this.showNotification('Failed to reject request', 'error');
    throw error; // Re-throw to handle in calling function
  }
}

// Update room settings
async updateRoomSettings(roomId, settings) {
  if (!this.currentUser || !roomId || !settings) return;
  
  try {
    // Verify user is room owner or admin
    const roomSnapshot = await this.db.ref(`readingRooms/${roomId}`).once('value');
    const room = roomSnapshot.val();
    
    if (!room) {
      this.showNotification('Room not found', 'error');
      return;
    }
    
    if (room.createdBy !== this.currentUser.uid && !this.isAdmin) {
      this.showNotification('You do not have permission to update this room', 'error');
      return;
    }
    
    // Update room settings
    await this.db.ref(`readingRooms/${roomId}`).update({
      name: settings.name,
      description: settings.description,
      isPrivate: settings.isPrivate,
      lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Reload rooms to update UI
    this.loadUserRooms();
    
    return true;
    
  } catch (error) {
    console.error('Error updating room settings:', error);
    this.showNotification('Failed to update room settings', 'error');
    return false;
  }
}

}

// Initialize Reading Room when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Make sure Firebase is loaded before initializing
    if (typeof firebase !== 'undefined') {
      window.readingRoom = new ReadingRoom();
      console.log('Reading room initialized successfully');
    } else {
      console.error('Firebase SDK not loaded. Waiting to initialize reading room...');
      
      // Try again after a short delay
      setTimeout(() => {
        if (typeof firebase !== 'undefined') {
          window.readingRoom = new ReadingRoom();
          console.log('Reading room initialized on retry');
        } else {
          console.error('Failed to initialize reading room: Firebase SDK not available');
        }
      }, 2000);
    }
  } catch (error) {
    console.error('Error initializing reading room:', error);
  }
})