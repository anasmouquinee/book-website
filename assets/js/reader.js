document.addEventListener('DOMContentLoaded', () => {
  // Firebase config - if not imported from firebase-config.js
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
  
  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const auth = firebase.auth();
  const db = firebase.database();
  
  // Reading Room Variables
  let roomId = null;
  let bookId = null;
  let currentUser = null;
  let unreadMessages = 0;
  let currentPage = 1;
  let totalPages = 20; // Mock value for demo
  
  // Reader elements
  const readerContent = document.querySelector('.reader__content');
  const currentPageEl = document.getElementById('current-page');
  const totalPagesEl = document.getElementById('total-pages');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const fontIncreaseBtn = document.getElementById('font-increase');
  const fontDecreaseBtn = document.getElementById('font-decrease');
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  // Room elements
  const roomSidebar = document.getElementById('room-sidebar');
  const toggleSidebar = document.getElementById('toggle-sidebar');
  const closeSidebar = document.getElementById('close-sidebar');
  const roomNameElement = document.getElementById('room-name');
  const roomIdElement = document.getElementById('room-id');
  const roomUsersList = document.getElementById('room-users');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendMessageBtn = document.getElementById('send-message');
  const messageCount = document.getElementById('message-count');
  const copyInviteBtn = document.getElementById('copy-invite-link');
  const joinRequest = document.getElementById('join-request');
  const roomRequests = document.getElementById('room-requests');
  const requestsList = document.getElementById('requests-list');
  const requestCount = document.getElementById('request-count');
  const sendJoinRequestBtn = document.getElementById('send-join-request');
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('room')) {
    roomId = urlParams.get('room');
  } else if (urlParams.has('id')) {
    bookId = urlParams.get('id');
  }
  
  // UI event listeners
  
  // Toggle sidebar
  toggleSidebar?.addEventListener('click', () => {
    document.body.classList.add('sidebar-open');
    // Reset unread message count
    unreadMessages = 0;
    messageCount.textContent = '0';
    messageCount.style.display = 'none';
  });
  
  closeSidebar?.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });
  
  // Navigation
  prevPageBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      updatePage();
    }
  });
  
  nextPageBtn?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      updatePage();
    }
  });
  
  // Font size controls
  fontIncreaseBtn?.addEventListener('click', () => {
    const fontSize = parseFloat(getComputedStyle(readerContent).fontSize);
    readerContent.style.fontSize = (fontSize + 1) + 'px';
  });
  
  fontDecreaseBtn?.addEventListener('click', () => {
    const fontSize = parseFloat(getComputedStyle(readerContent).fontSize);
    readerContent.style.fontSize = Math.max(fontSize - 1, 12) + 'px';
  });
  
  // Theme toggle
  themeToggleBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('reader-theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  });
  
  // Apply saved theme
  if (localStorage.getItem('reader-theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }
  
  // Chat messaging
  sendMessageBtn?.addEventListener('click', () => {
    sendChatMessage();
  });
  
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
  
  // Copy invite link
  copyInviteBtn?.addEventListener('click', () => {
    const url = `${window.location.origin}/reader.html?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Invite link copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  });
  
  // Send join request
  sendJoinRequestBtn?.addEventListener('click', async () => {
    try {
      await db.ref(`readingRooms/${roomId}/joinRequests/${currentUser.uid}`).set({
        userId: currentUser.uid,
        userName: currentUser.name || 'Unknown User',
        requestTime: firebase.database.ServerValue.TIMESTAMP,
        status: 'pending'
      });
      
      joinRequest.innerHTML = `
        <h4 class="join-request__title">Request Sent</h4>
        <p class="join-request__message">Your request to join has been sent. Please wait for approval.</p>
      `;
    } catch (error) {
      console.error('Error sending join request:', error);
      alert('Failed to send join request');
    }
  });
  
  // Check if user is authenticated
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        // Get user data from database
        const userSnapshot = await db.ref(`users/${user.uid}`).once('value');
        currentUser = {
          uid: user.uid,
          ...userSnapshot.val()
        };
        
        // Use default name if not set
        if (!currentUser.name) {
          currentUser.name = user.displayName || user.email.split('@')[0] || 'Reader';
        }
        
        if (roomId) {
          // Check if user is VIP or admin
          const isVIP = !!(currentUser.isVIP || currentUser.VIPActivatedAt);
          const isAdmin = !!currentUser.isAdmin;
          
          if (isVIP || isAdmin) {
            initializeReadingRoom();
            toggleSidebar.style.display = 'block';
          } else {
            showVIPRequiredMessage();
            roomSidebar.style.display = 'none';
            toggleSidebar.style.display = 'none';
          }
        } else if (bookId) {
          // Load regular book without room features
          loadBook(bookId);
          roomSidebar.style.display = 'none';
          toggleSidebar.style.display = 'none';
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        alert('Failed to load user data');
      }
    } else {
      // Redirect to login
      alert('Please log in to access the reader');
      window.location.href = 'index.html';
    }
  });
  
  function showVIPRequiredMessage() {
    readerContent.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2>VIP Feature</h2>
        <p style="margin: 1rem 0;">
          Reading rooms are a VIP-only feature. Please upgrade your account to access this content.
        </p>
        <a href="index.html#vip" class="button" style="display: inline-block; margin-top: 1rem;">
          Upgrade to VIP
        </a>
      </div>
    `;
  }
  
  async function initializeReadingRoom() {
    try {
      // Get room data
      const roomSnapshot = await db.ref(`readingRooms/${roomId}`).once('value');
      const room = roomSnapshot.val();
      
      if (!room) {
        alert('Reading room not found');
        window.location.href = 'index.html';
        return;
      }
      
      // Set room info
      bookId = room.bookId || 'sample'; // Fallback to a sample book if none set
      roomNameElement.textContent = room.name || 'Reading Room';
      roomIdElement.textContent = `Room ID: ${roomId.substring(0, 8)}`;
      
      // Update UI
      document.querySelector('.reader__title').textContent = room.name || 'Reading Room';
      
      // Check if this is a private room and user is not already a participant
      const isParticipant = room.participants && room.participants[currentUser.uid] && 
                           room.participants[currentUser.uid].joined;
      
      if (room.isPrivate && !isParticipant && room.createdBy !== currentUser.uid) {
        // Show join request UI
        joinRequest.style.display = 'block';
        
        // Check if user already has a pending request
        if (room.joinRequests && room.joinRequests[currentUser.uid]) {
          joinRequest.innerHTML = `
            <h4 class="join-request__title">Request Sent</h4>
            <p class="join-request__message">Your request to join has been sent. Please wait for approval.</p>
          `;
        }
        
        // Hide other room content
        document.querySelector('.room-users').style.display = 'none';
        document.querySelector('.room-chat').style.display = 'none';
        document.querySelector('.room-invite').style.display = 'none';
        
        return;
      }
      
      // If user is room creator or admin, show join requests section
      if (room.createdBy === currentUser.uid) {
        roomRequests.style.display = 'block';
        
        // Listen for join requests
        db.ref(`readingRooms/${roomId}/joinRequests`).on('value', (snapshot) => {
          if (!snapshot.exists()) {
            requestsList.innerHTML = `<div class="no-requests">No pending requests</div>`;
            requestCount.textContent = '0';
            return;
          }
          
          const requests = [];
          snapshot.forEach(childSnapshot => {
            const request = childSnapshot.val();
            if (request.status === 'pending') {
              requests.push({
                userId: childSnapshot.key,
                ...request
              });
            }
          });
          
          requestCount.textContent = requests.length.toString();
          
          if (requests.length === 0) {
            requestsList.innerHTML = `<div class="no-requests">No pending requests</div>`;
            return;
          }
          
          requestsList.innerHTML = requests.map(request => `
            <div class="request-item" data-user-id="${request.userId}">
              <div class="request-item__header">
                <span class="request-item__name">${request.userName || 'Unknown User'}</span>
                <span class="request-item__time">${new Date(request.requestTime).toLocaleString()}</span>
              </div>
              <div class="request-item__actions">
                <button class="request-item__approve" data-action="approve" data-user-id="${request.userId}">
                  Approve
                </button>
                <button class="request-item__reject" data-action="reject" data-user-id="${request.userId}">
                  Reject
                </button>
              </div>
            </div>
          `).join('');
          
          // Add event listeners to approve/reject buttons
          requestsList.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', async (e) => {
              const action = e.target.dataset.action;
              const userId = e.target.dataset.userId;
              
              if (action === 'approve') {
                // Add user to participants
                await db.ref(`readingRooms/${roomId}/participants/${userId}`).set({
                  name: requests.find(r => r.userId === userId)?.userName || 'Unknown User',
                  joined: true,
                  joinedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Update request status
                await db.ref(`readingRooms/${roomId}/joinRequests/${userId}`).update({
                  status: 'approved',
                  approvedBy: currentUser.uid,
                  approvedAt: firebase.database.ServerValue.TIMESTAMP
                });
              } else if (action === 'reject') {
                // Update request status
                await db.ref(`readingRooms/${roomId}/joinRequests/${userId}`).update({
                  status: 'rejected',
                  rejectedBy: currentUser.uid,
                  rejectedAt: firebase.database.ServerValue.TIMESTAMP
                });
              }
            });
          });
        });
      }
      
      // Add user to active users
      await db.ref(`readingRooms/${roomId}/activeUsers/${currentUser.uid}`).set({
        name: currentUser.name || 'Unknown User',
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        currentPage: 1
      });
      
      // Add user to participants if not already there
      if (!isParticipant) {
        await db.ref(`readingRooms/${roomId}/participants/${currentUser.uid}`).set({
          name: currentUser.name || 'Unknown User',
          joined: true,
          joinedAt: firebase.database.ServerValue.TIMESTAMP
        });
      }
      
      // Set up cleanup on page unload
      window.addEventListener('beforeunload', () => {
        db.ref(`readingRooms/${roomId}/activeUsers/${currentUser.uid}`).remove();
      });
      
      // Listen for user changes
      db.ref(`readingRooms/${roomId}/activeUsers`).on('value', (snapshot) => {
        updateUsersList(snapshot.val());
      });
      
      // Listen for messages
      db.ref(`readingRooms/${roomId}/messages`).orderByChild('timestamp').on('value', (snapshot) => {
        updateMessages(snapshot.val());
      });
      
      // Load book content
      loadBook(bookId);
      
      // Show sidebar toggle button
      toggleSidebar.style.display = 'block';
    } catch (error) {
      console.error('Error initializing reading room:', error);
      alert('Error loading reading room');
    }
  }
  
  function updateUsersList(users) {
    if (!roomUsersList) return;
    
    if (!users || Object.keys(users).length === 0) {
      roomUsersList.innerHTML = '<li>No active readers</li>';
      return;
    }
    
    roomUsersList.innerHTML = Object.entries(users).map(([uid, userData]) => {
      const isCurrentUser = uid === currentUser?.uid;
      let userName = 'Unknown User';
      
      // Safe access to userData properties
      if (userData && typeof userData === 'object') {
        userName = userData.name || 'Unknown User';
      }
      
      return `
        <li class="${isCurrentUser ? 'current-user' : ''}">
          <span class="user-indicator"></span>
          ${userName} ${isCurrentUser ? '(You)' : ''}
          ${userData.currentPage ? `- Page ${userData.currentPage}` : ''}
        </li>
      `;
    }).join('');
  }
  
  function updateMessages(messages) {
    if (!chatMessages || !document.body) return;
    
    if (!messages) {
      chatMessages.innerHTML = '<div class="no-messages">No messages yet</div>';
      return;
    }
    
    const messagesArray = [];
    for (const key in messages) {
      messagesArray.push({
        id: key,
        ...messages[key]
      });
    }
    
    // Sort by timestamp
    messagesArray.sort((a, b) => a.timestamp - b.timestamp);
    
    chatMessages.innerHTML = messagesArray.map(msg => {
      const isOwnMessage = msg.userId === currentUser?.uid;
      let userName = 'Unknown User';
      
      // Safe access to msg properties
      if (msg && typeof msg === 'object') {
        userName = msg.userName || 'Unknown User';
      }
      
      return `
        <div class="chat-message ${isOwnMessage ? 'own-message' : ''}">
          <div class="message-header">
            <span class="message-sender">${userName}</span>
            <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="message-content">
            ${msg.text}
          </div>
        </div>
      `;
    }).join('');
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Update unread count if sidebar is closed
    if (!document.body.classList.contains('sidebar-open')) {
      unreadMessages++;
      messageCount.textContent = unreadMessages;
      messageCount.style.display = 'flex';
    }
  }
  
  async function sendChatMessage() {
    if (!chatInput || !chatInput.value.trim() || !currentUser) return;
    
    try {
      const messageRef = db.ref(`readingRooms/${roomId}/messages`).push();
      await messageRef.set({
        text: chatInput.value.trim(),
        userId: currentUser.uid,
        userName: currentUser.name || 'Unknown User',
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      chatInput.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  }
  
  function loadBook(id) {
    // For this demo, we'll just display dummy content
    updatePage();
    
    // Also update book title if in standard mode (not room mode)
    if (!roomId && id) {
      db.ref(`books/${id}`).once('value', snapshot => {
        const book = snapshot.val();
        if (book) {
          document.querySelector('.reader__title').textContent = book.title || 'Book';
        }
      });
    }
    
    // Set total pages
    totalPagesEl.textContent = totalPages.toString();
  }
  
  function updatePage() {
    if (!currentPageEl || !readerContent) return;
    
    currentPageEl.textContent = currentPage.toString();
    
    // Generate dummy content for the current page
    readerContent.innerHTML = `
      <h1>Chapter ${Math.ceil(currentPage / 5)}</h1>
      <h3>Page ${currentPage}</h3>
      
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam at tortor eu nisi ullamcorper varius. Maecenas aliquam, neque sed efficitur laoreet, purus est convallis urna, ut malesuada nisl lectus sed diam.</p>
      
      <p>Fusce vitae volutpat nunc. Morbi dignissim urna eget eros bibendum, et malesuada augue pretium. Aliquam erat volutpat. Proin tristique, nisl eget elementum facilisis, nisi orci scelerisque nunc, id scelerisque diam eros id enim.</p>
      
      <p>Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Suspendisse potenti. Ut a leo et libero tempor euismod. Aenean at risus nisl.</p>
      
      <p>This is a demo of the e-book reader. In a real implementation, this would load actual book content from the database, with proper pagination and formatting.</p>
    `;
    
    // Update navigation button states
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    
    // If in a reading room, sync page with other users
    if (roomId && currentUser) {
      db.ref(`readingRooms/${roomId}/activeUsers/${currentUser.uid}`).update({
        currentPage: currentPage
      }).catch(error => {
        console.error('Error updating current page:', error);
      });
    }
  }
});