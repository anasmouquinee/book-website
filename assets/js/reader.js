document.addEventListener('DOMContentLoaded', () => {
  // Get Firebase services
  let auth, db;
  if (window.firebaseServices) {
    auth = window.firebaseServices.auth;
    db = window.firebaseServices.db;
  } else {
    console.error('Firebase services not initialized properly');
    alert('Error initializing the application. Please refresh the page and try again.');
    return;
  }
  
  // Reading Room Variables
  let roomId = null;
  let bookId = null;
  let currentUser = null;
  let unreadMessages = 0;
  let currentPage = 1;
  let totalPages = 20; // Mock value for demo
  
  // Reader elements
  const readerContent = document.getElementById('reader-content');
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
    console.log('Room ID from URL:', roomId);
  } else if (urlParams.has('id')) {
    bookId = urlParams.get('id');
    console.log('Book ID from URL:', bookId);
  }
  
  // UI event listeners
  
  // Toggle sidebar
  toggleSidebar?.addEventListener('click', () => {
    document.body.classList.add('sidebar-open');
    // Reset unread message count
    unreadMessages = 0;
    if (messageCount) {
      messageCount.textContent = '0';
      messageCount.style.display = 'none';
    }
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
    if (readerContent) {
      const fontSize = parseFloat(getComputedStyle(readerContent).fontSize);
      readerContent.style.fontSize = (fontSize + 1) + 'px';
    }
  });
  
  fontDecreaseBtn?.addEventListener('click', () => {
    if (readerContent) {
      const fontSize = parseFloat(getComputedStyle(readerContent).fontSize);
      readerContent.style.fontSize = Math.max(fontSize - 1, 12) + 'px';
    }
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
    if (!roomId) return;
    
    const url = `${window.location.origin}/reader.html?room=${roomId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        showNotification('Invite link copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        showNotification('Failed to copy invite link', 'error');
      });
  });
  
  // Send join request
  sendJoinRequestBtn?.addEventListener('click', async () => {
    try {
      if (!roomId || !currentUser) {
        showNotification('Cannot send join request', 'error');
        return;
      }
      
      await db.ref(`readingRooms/${roomId}/joinRequests/${currentUser.uid}`).set({
        userId: currentUser.uid,
        userName: currentUser.name || currentUser.email || 'Unknown User',
        requestTime: firebase.database.ServerValue.TIMESTAMP,
        status: 'pending'
      });
      
      if (joinRequest) {
        joinRequest.innerHTML = `
          <h4 class="join-request__title">Request Sent</h4>
          <p class="join-request__message">Your request to join has been sent. Please wait for approval.</p>
        `;
      }
      
      showNotification('Join request sent successfully', 'success');
    } catch (error) {
      console.error('Error sending join request:', error);
      showNotification('Failed to send join request', 'error');
    }
  });
  
  // Check if user is authenticated
  auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
    
    if (user) {
      try {
        // Get user data from database
        const userSnapshot = await db.ref(`users/${user.uid}`).once('value');
        
        // If user exists in database
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          currentUser = {
            uid: user.uid,
            email: user.email,
            ...userData
          };
        } else {
          // Handle new users or those with no profile
          currentUser = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            createdAt: firebase.database.ServerValue.TIMESTAMP
          };
          
          // Save basic user data
          await db.ref(`users/${user.uid}`).set(currentUser);
        }
        
        console.log('Current user loaded:', currentUser);
        
        // Check if we're on a reading room page
        if (roomId) {
          // Check if user is VIP or admin
          const isVIP = !!(currentUser.isVIP || currentUser.VIPActivatedAt);
          const isAdmin = !!currentUser.isAdmin;
          
          if (isVIP || isAdmin) {
            initializeReadingRoom();
            if (toggleSidebar) toggleSidebar.style.display = 'block';
          } else {
            showVIPRequiredMessage();
            if (roomSidebar) roomSidebar.style.display = 'none';
            if (toggleSidebar) toggleSidebar.style.display = 'none';
          }
        } else if (bookId) {
          // Load regular book without room features
          loadBook(bookId);
          if (roomSidebar) roomSidebar.style.display = 'none';
          if (toggleSidebar) toggleSidebar.style.display = 'none';
        } else {
          // No book or room ID provided
          showNotification('No book or room specified', 'error');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Failed to load user data. Please try again.', 'error');
      }
    } else {
      // Not logged in - redirect to login
      showNotification('Please log in to access the reader', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  });
  
  function showVIPRequiredMessage() {
    if (!readerContent) return;
    
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
      if (!roomId || !currentUser) {
        showNotification('Cannot initialize reading room', 'error');
        return;
      }
      
      // Get room data
      console.log('Fetching room data for:', roomId);
      const roomSnapshot = await db.ref(`readingRooms/${roomId}`).once('value');
      const room = roomSnapshot.val();
      
      if (!room) {
        showNotification('Reading room not found', 'error');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
        return;
      }
      
      console.log('Room data loaded:', room);
      
      // Set room info
      bookId = room.bookId || 'sample'; // Fallback to a sample book if none set
      if (roomNameElement) roomNameElement.textContent = room.name || 'Reading Room';
      if (roomIdElement) roomIdElement.textContent = `Room ID: ${roomId.substring(0, 8)}`;
      
      // Update UI
      document.querySelector('.reader__title').textContent = room.name || 'Reading Room';
      
      // Check if this is a private room and user is not already a participant
      const isParticipant = room.participants && 
                          room.participants[currentUser.uid] && 
                          room.participants[currentUser.uid].joined;
      
      // For private rooms, handle join requests
      if (room.isPrivate && !isParticipant && room.createdBy !== currentUser.uid) {
        // Show join request UI
        if (joinRequest) {
          joinRequest.style.display = 'block';
          
          // Check if user already has a pending request
          if (room.joinRequests && room.joinRequests[currentUser.uid]) {
            joinRequest.innerHTML = `
              <h4 class="join-request__title">Request Sent</h4>
              <p class="join-request__message">Your request to join has been sent. Please wait for approval.</p>
            `;
          }
        }
        
        // Hide other room content
        const roomUsers = document.querySelector('.room-users');
        const roomChat = document.querySelector('.room-chat');
        const roomInvite = document.querySelector('.room-invite');
        
        if (roomUsers) roomUsers.style.display = 'none';
        if (roomChat) roomChat.style.display = 'none';
        if (roomInvite) roomInvite.style.display = 'none';
        
        return;
      }
      
      // If user is room creator or admin, show join requests section
      if (room.createdBy === currentUser.uid) {
        if (roomRequests) {
          roomRequests.style.display = 'block';
          
          // Listen for join requests
          db.ref(`readingRooms/${roomId}/joinRequests`).on('value', (snapshot) => {
            if (!snapshot.exists()) {
              if (requestsList) 
                requestsList.innerHTML = `<div class="no-requests">No pending requests</div>`;
              if (requestCount)
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
            
            if (requestCount) 
              requestCount.textContent = requests.length.toString();
            
            if (!requestsList) return;
            
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
                  
                  showNotification('Request approved', 'success');
                } else if (action === 'reject') {
                  // Update request status
                  await db.ref(`readingRooms/${roomId}/joinRequests/${userId}`).update({
                    status: 'rejected',
                    rejectedBy: currentUser.uid,
                    rejectedAt: firebase.database.ServerValue.TIMESTAMP
                  });
                  
                  showNotification('Request rejected', 'info');
                }
              });
            });
          });
        }
      }
      
      // Add user to active users
      await db.ref(`readingRooms/${roomId}/activeUsers/${currentUser.uid}`).set({
        name: currentUser.name || currentUser.email || 'Unknown User',
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        currentPage: 1
      });
      
      // Add user to participants if not already there
      if (!isParticipant) {
        await db.ref(`readingRooms/${roomId}/participants/${currentUser.uid}`).set({
          name: currentUser.name || currentUser.email || 'Unknown User',
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
      if (toggleSidebar) toggleSidebar.style.display = 'block';
      
      showNotification('Reading room joined successfully', 'success');
    } catch (error) {
      console.error('Error initializing reading room:', error);
      showNotification('Error loading reading room', 'error');
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
      let userPage = 1;
      
      // Safe access to userData properties
      if (userData && typeof userData === 'object') {
        userName = userData.name || 'Unknown User';
        userPage = userData.currentPage || 1;
      }
      
      return `
        <li class="${isCurrentUser ? 'current-user' : ''}">
          <span class="user-indicator"></span>
          ${userName} ${isCurrentUser ? '(You)' : ''}
          ${userPage ? `- Page ${userPage}` : ''}
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
      let msgText = '';
      let msgTime = new Date().toLocaleTimeString();
      
      // Safe access to msg properties
      if (msg && typeof msg === 'object') {
        userName = msg.userName || 'Unknown User';
        msgText = msg.text || '';
        msgTime = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : msgTime;
      }
      
      return `
        <div class="chat-message ${isOwnMessage ? 'own-message' : ''}">
          <div class="message-header">
            <span class="message-sender">${userName}</span>
            <span class="message-time">${msgTime}</span>
          </div>
          <div class="message-content">
            ${msgText}
          </div>
        </div>
      `;
    }).join('');
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Update unread count if sidebar is closed
    if (!document.body.classList.contains('sidebar-open')) {
      unreadMessages++;
      if (messageCount) {
        messageCount.textContent = unreadMessages;
        messageCount.style.display = 'flex';
      }
    }
  }
  
  async function sendChatMessage() {
    if (!chatInput || !chatInput.value.trim() || !currentUser || !roomId) return;
    
    try {
      const messageRef = db.ref(`readingRooms/${roomId}/messages`).push();
      await messageRef.set({
        text: chatInput.value.trim(),
        userId: currentUser.uid,
        userName: currentUser.name || currentUser.email || 'Unknown User',
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      chatInput.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('Failed to send message', 'error');
    }
  }
  
  function loadBook(id) {
    if (!readerContent) return;
    
    // For demo, show placeholder content
    updatePage();
    
    // Update book title if not in room mode
    if (!roomId && id) {
      db.ref(`books/${id}`).once('value', snapshot => {
        const book = snapshot.val();
        if (book) {
          document.querySelector('.reader__title').textContent = book.title || 'Book';
        }
      });
    }
    
    // Set total pages
    if (totalPagesEl) totalPagesEl.textContent = totalPages.toString();
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
  
  // Helper to show notifications
  function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
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
});