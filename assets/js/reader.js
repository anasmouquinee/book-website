class CollaborativeReading {
    constructor() {
      this.database = null;
      this.currentRoom = null;
      this.userId = null;
      this.userName = null;
      this.bookId = null;
      this.currentPage = 1;
      this.typingTimeout = null;
      this.isConnected = false;
      
      // DOM Elements
      this.readerContent = document.querySelector('.reader__content');
      this.commentsList = document.querySelector('.reader__comments');
      this.participantsList = document.querySelector('.reader__participants-list');
      this.commentInput = document.querySelector('.reader__comment-input');
      this.sendCommentBtn = document.querySelector('.reader__send-comment');
      this.syncReadingCheckbox = document.getElementById('sync-reading');
      this.pageInput = document.querySelector('.reader__page-input');
      this.pageTotalSpan = document.querySelector('.reader__page-total');
      this.prevPageBtn = document.querySelector('.reader__prev-page');
      this.nextPageBtn = document.querySelector('.reader__next-page');
      this.shareBtn = document.getElementById('share-btn');
      this.shareDialog = document.getElementById('share-dialog');
      this.copyLinkBtn = document.getElementById('copy-link');
      this.shareCloseBtn = document.getElementById('share-close');
      this.shareLinkInput = document.getElementById('share-link');
      
      // Set book title
      const readerTitle = document.querySelector('.reader__title');
      if (readerTitle) {
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('id') || '1';
        // Get book details from localStorage
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const book = books.find(b => b.id === bookId);
        if (book) {
          readerTitle.textContent = book.title;
        } else {
          readerTitle.textContent = 'E-Book Reader';
        }
      }
      
      this.initializeEvents();
      this.initializeTabSwitching();
    }
    
    initialize(userId, userName, bookId, initialPage = 1) {
      this.userId = userId;
      this.userName = userName;
      this.bookId = bookId;
      this.currentPage = initialPage;
      
      // Connect to Firebase
      this.connectToServer();
      
      // Set initial UI
      this.updatePageUI(initialPage);
      this.loadBookContent(initialPage);
    }
    
    connectToServer() {
      try {
        // Don't initialize Firebase again if it's already done in the HTML
        this.database = firebase.database();
        
        // Set online status
        this.isConnected = true;
        console.log('Connected to Firebase database');
        
        // Join the room
        this.joinRoom();
        
        // Set up listeners for room events
        this.setupFirebaseListeners();
      } catch (error) {
        console.error('Failed to connect to Firebase:', error);
        this.showNotification('Could not connect to collaborative reading database', 'error');
      }
    }
    
    setupFirebaseListeners() {
      if (!this.isConnected || !this.currentRoom) return;
      
      // Reference to the room
      const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
      
      // Listen for new participants
      roomRef.child('participants').on('child_added', (snapshot) => {
        const participant = snapshot.val();
        // Don't notify for our own join
        if (participant && participant.userId !== this.userId) {
          this.handleUserJoined(participant);
        }
      });
      
      // Listen for participants leaving
      roomRef.child('participants').on('child_removed', (snapshot) => {
        const participant = snapshot.val();
        if (participant) {
          this.handleUserLeft(participant);
        }
      });
      
      // Listen for comments
      roomRef.child('comments').on('child_added', (snapshot) => {
        const comment = snapshot.val();
        if (comment) {
          this.handleNewComment(comment);
        }
      });
      
      // Listen for highlights
      roomRef.child('highlights').on('child_added', (snapshot) => {
        const highlight = snapshot.val();
        if (highlight) {
          this.handleNewHighlight(highlight);
        }
      });
      
      // Listen for page changes
      roomRef.child('pageChanges').on('child_added', (snapshot) => {
        const pageChange = snapshot.val();
        // Don't notify for our own page change
        if (pageChange && pageChange.userId !== this.userId) {
          this.handlePageChange(pageChange);
        }
      });
      
      // Listen for typing indicators
      roomRef.child('typing').on('child_added', (snapshot) => {
        const typing = snapshot.val();
        // Don't handle our own typing
        if (typing && typing.userId !== this.userId) {
          this.handleUserTyping(typing);
        }
      });
      
      roomRef.child('typing').on('child_removed', (snapshot) => {
        const typing = snapshot.val();
        if (typing && typing.userId !== this.userId) {
          this.removeTypingIndicator(typing.userId);
        }
      });
      
      // Get current participants
      roomRef.child('participants').once('value', (snapshot) => {
        const participants = [];
        snapshot.forEach((childSnapshot) => {
          participants.push(childSnapshot.val());
        });
        this.updateParticipantsList(participants);
      });
      
      // Set up presence to detect disconnections
      const connectedRef = this.database.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
          // We're connected (or reconnected)
          console.log('Connected to Firebase');
          
          // Set a presence reference
          const presenceRef = roomRef.child('participants').child(this.userId);
          
          // Remove the user when they disconnect
          presenceRef.onDisconnect().remove();
          
          // Update their info
          presenceRef.set({
            userId: this.userId,
            userName: this.userName,
            pageNumber: this.currentPage,
            lastActive: firebase.database.ServerValue.TIMESTAMP
          });
        }
      });
    }
    
    initializeTabSwitching() {
      const tabs = document.querySelectorAll('.reader__tab');
      if (!tabs.length) return;
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active class from all tabs
          tabs.forEach(t => t.classList.remove('active'));
          
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Get tab id
          const tabId = tab.dataset.tab;
          
          // Hide all tab contents
          document.querySelectorAll('.reader__tab-content').forEach(content => {
            content.classList.remove('active');
          });
          
          // Show selected tab content
          const tabContent = document.getElementById(`${tabId}-tab`);
          if (tabContent) {
            tabContent.classList.add('active');
          }
        });
      });
    }
    
    initializeEvents() {
      // Comment input events
      if (this.commentInput) {
        this.commentInput.addEventListener('keyup', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendComment();
          } else {
            this.sendTypingStatus();
          }
        });
      }
      
      if (this.sendCommentBtn) {
        this.sendCommentBtn.addEventListener('click', () => {
          this.sendComment();
        });
      }
      
      // Page navigation
      if (this.pageInput) {
        this.pageInput.addEventListener('change', () => {
          const pageNum = parseInt(this.pageInput.value);
          this.changePage(pageNum);
        });
      }
      
      if (this.prevPageBtn) {
        this.prevPageBtn.addEventListener('click', () => {
          this.changePage(this.currentPage - 1);
        });
      }
      
      if (this.nextPageBtn) {
        this.nextPageBtn.addEventListener('click', () => {
          this.changePage(this.currentPage + 1);
        });
      }
      
      // Text selection for highlighting
      if (this.readerContent) {
        this.readerContent.addEventListener('mouseup', () => {
          this.handleTextSelection();
        });
      }
      
      // Share dialog
      if (this.shareBtn) {
        this.shareBtn.addEventListener('click', () => {
          this.openShareDialog();
        });
      }
      
      if (this.shareCloseBtn) {
        this.shareCloseBtn.addEventListener('click', () => {
          this.closeShareDialog();
        });
      }
      
      if (this.copyLinkBtn) {
        this.copyLinkBtn.addEventListener('click', () => {
          this.copyShareLink();
        });
      }
      
      // Document event for click outside selection menu
      document.addEventListener('click', (e) => {
        const selectionMenu = document.querySelector('.selection-menu');
        if (selectionMenu && !selectionMenu.contains(e.target)) {
          selectionMenu.remove();
        }
      });
    }
    
    joinRoom() {
      if (!this.isConnected || !this.bookId) return;
      
      this.currentRoom = `book_${this.bookId}`;
      const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
      
      // Add this user to the participants
      roomRef.child('participants').child(this.userId).set({
        userId: this.userId,
        userName: this.userName,
        pageNumber: this.currentPage,
        lastActive: firebase.database.ServerValue.TIMESTAMP
      });
      
      console.log(`Joined reading room for book ${this.bookId}`);
    }
    
    leaveRoom() {
      if (!this.isConnected || !this.currentRoom) return;
      
      const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
      
      // Remove this user from participants
      roomRef.child('participants').child(this.userId).remove();
      
      // Remove any typing indicators
      roomRef.child('typing').child(this.userId).remove();
      
      console.log('Left reading room');
      this.currentRoom = null;
    }
    
    sendComment() {
      if (!this.commentInput || !this.commentInput.value.trim() || !this.isConnected || !this.currentRoom) return;
      
      const text = this.commentInput.value.trim();
      const selection = window.getSelection();
      let selectedText = null;
      
      if (selection && !selection.isCollapsed) {
        selectedText = selection.toString();
      }
      
      const comment = {
        userId: this.userId,
        userName: this.userName,
        text,
        pageNumber: this.currentPage,
        selection: selectedText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      
      // Add to Firebase
      const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
      roomRef.child('comments').push(comment);
      
      // Clear input
      this.commentInput.value = '';
      
      // Clear typing indicator
      clearTimeout(this.typingTimeout);
      this.removeTypingStatus();
    }
    
    sendTypingStatus() {
      if (!this.isConnected || !this.currentRoom) return;
      
      clearTimeout(this.typingTimeout);
      
      const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
      
      // Set typing indicator
      roomRef.child('typing').child(this.userId).set({
        userId: this.userId,
        userName: this.userName,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Clear after delay
      this.typingTimeout = setTimeout(() => {
        this.removeTypingStatus();
      }, 2000);
    }
    
    removeTypingStatus() {
      if (!this.isConnected || !this.currentRoom) return;
      
      const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
      roomRef.child('typing').child(this.userId).remove();
    }
    
    addHighlight(selection) {
      if (!selection || selection.isCollapsed || !this.isConnected || !this.currentRoom) return;
      
      const selectedText = selection.toString();
      
      const highlight = {
        userId: this.userId,
        userName: this.userName,
        selection: selectedText,
        pageNumber: this.currentPage,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      
      // Add to Firebase
      const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
      roomRef.child('highlights').push(highlight);
      
      // Add local highlight immediately for better UX
      this.addHighlightToText(selectedText, this.userId, this.userName);
    }
    
    changePage(pageNum) {
      // Get total pages from page total span (e.g. "/ 250")
      let totalPages = 250; // Default
      if (this.pageTotalSpan) {
        const totalText = this.pageTotalSpan.textContent;
        if (totalText) {
          const match = totalText.match(/\d+/);
          if (match) {
            totalPages = parseInt(match[0]);
          }
        }
      }
      
      // Validate page number
      if (isNaN(pageNum) || pageNum < 1 || (totalPages && pageNum > totalPages)) {
        if (this.pageInput) {
          this.pageInput.value = this.currentPage;
        }
        return;
      }
      
      this.currentPage = pageNum;
      this.updatePageUI(pageNum);
      this.loadBookContent(pageNum);
      
      // Notify other users if connected to Firebase
      if (this.isConnected && this.currentRoom && this.database) {
        const pageChange = {
          userId: this.userId,
          userName: this.userName,
          pageNumber: pageNum,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Add to Firebase
        const roomRef = this.database.ref(`rooms/${this.currentRoom}`);
        roomRef.child('pageChanges').push(pageChange);
        
        // Update user's current page in participants list
        roomRef.child('participants').child(this.userId).update({
          pageNumber: pageNum,
          lastActive: firebase.database.ServerValue.TIMESTAMP
        });
      }
    }
    
    updatePageUI(pageNum) {
      if (this.pageInput) {
        this.pageInput.value = pageNum;
      }
    }
    
    loadBookContent(pageNum) {
      if (!this.readerContent) return;
      
      // Get book from localStorage if available
      const books = JSON.parse(localStorage.getItem('books') || '[]');
      const book = books.find(b => b.id === this.bookId);
      
      // Create book content based on page number
      // In a real implementation, you would load actual book content
      let content = '';
      
      if (book) {
        content = `
          <h2>Chapter ${pageNum}</h2>
          <p><strong>${book.title}</strong> - Page ${pageNum}</p>
          <p>${book.description || 'No description available.'}</p>
        `;
      } else {
        content = `
          <h2>Chapter ${pageNum}</h2>
          <p>This is a sample text for page ${pageNum} of the book. In a real implementation, this content would be loaded from a server based on the book ID and page number.</p>
          <p>Users can select this text to highlight it or add comments. The highlights will be visible to all users in the collaborative reading session.</p>
          <p>When other users change pages, you'll be notified. If you have "Sync Pages" enabled, your book will automatically sync to the same page they're viewing.</p>
          <p>This collaborative reading feature allows book clubs, study groups, or friends to read and discuss books together in real-time, making the reading experience more social and interactive.</p>
        `;
      }
      
      this.readerContent.innerHTML = content;
      
      // Add extra paragraphs to make the page longer for demonstration
      for (let i = 0; i < 5; i++) {
        const paragraph = document.createElement('p');
        paragraph.textContent = `This is paragraph ${i+1} of page ${pageNum}. It contains sample text that can be highlighted and discussed by multiple readers in real time. Try selecting this text and using the highlight or comment options.`;
        this.readerContent.appendChild(paragraph);
      }
    }
    
    handleUserJoined(data) {
      this.showNotification(`${data.userName} joined the reading session`, 'info');
    }
    
    handleUserLeft(data) {
      this.showNotification(`${data.userName} left the reading session`, 'info');
    }
    
    handleNewComment(data) {
      if (!this.commentsList) return;
      
      const commentEl = this.createCommentElement(data);
      this.commentsList.appendChild(commentEl);
      this.commentsList.scrollTop = this.commentsList.scrollHeight;
      
      // Remove typing indicator for this user if exists
      this.removeTypingIndicator(data.userId);
    }
    
    handleNewHighlight(data) {
      this.addHighlightToText(data.selection, data.userId, data.userName);
    }
    
    handlePageChange(data) {
      this.showNotification(`${data.userName} moved to page ${data.pageNumber}`, 'info');
      
      // If sync is enabled and it's not our own page change
      if (this.syncReadingCheckbox && this.syncReadingCheckbox.checked && data.userId !== this.userId) {
        this.currentPage = data.pageNumber;
        this.updatePageUI(data.pageNumber);
        this.loadBookContent(data.pageNumber);
      }
    }
    
    handleUserTyping(data) {
      if (!this.commentsList) return;
      
      // Don't show typing indicator for current user
      if (data.userId === this.userId) return;
      
      // Check if typing indicator already exists for this user
      let typingIndicator = document.querySelector(`.typing-indicator[data-user-id="${data.userId}"]`);
      
      if (!typingIndicator) {
        typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.setAttribute('data-user-id', data.userId);
        typingIndicator.innerHTML = `
          ${data.userName} is typing
          <div class="typing-indicator__dots">
            <div class="typing-indicator__dot"></div>
            <div class="typing-indicator__dot"></div>
            <div class="typing-indicator__dot"></div>
          </div>
        `;
        this.commentsList.appendChild(typingIndicator);
        this.commentsList.scrollTop = this.commentsList.scrollHeight;
      }
    }
    
    removeTypingIndicator(userId) {
      const typingIndicator = document.querySelector(`.typing-indicator[data-user-id="${userId}"]`);
      if (typingIndicator) {
        typingIndicator.remove();
      }
    }
    
    updateParticipantsList(participants) {
      if (!this.participantsList) return;
      
      this.participantsList.innerHTML = '';
      
      participants.forEach(participant => {
        const participantEl = document.createElement('div');
        participantEl.className = 'reader__participant';
        
        const color = this.getUserColor(participant.userId);
        
        participantEl.innerHTML = `
          <div class="reader__participant-avatar" style="background-color: ${color}">
            ${participant.userName.charAt(0).toUpperCase()}
          </div>
          <span class="reader__participant-name">${participant.userName}</span>
          <span class="reader__participant-page">Page: ${participant.pageNumber}</span>
        `;
        
        this.participantsList.appendChild(participantEl);
      });
    }
    
    createCommentElement(data) {
      const commentEl = document.createElement('div');
      commentEl.className = 'reader__comment';
      
      const color = this.getUserColor(data.userId);
      
      commentEl.innerHTML = `
        <div class="reader__comment-header">
          <div class="reader__comment-avatar" style="background-color: ${color}">
            ${data.userName.charAt(0).toUpperCase()}
          </div>
          <span class="reader__comment-author">${data.userName}</span>
          <span class="reader__comment-time">${this.formatTimestamp(data.timestamp)}</span>
        </div>
        <div class="reader__comment-text">${data.text}</div>
        ${data.selection ? `<div class="reader__comment-selection">"${data.selection}"</div>` : ''}
      `;
      
      return commentEl;
    }
    
    addHighlightToText(selection, userId, userName) {
      // For this example, we'll use a simple approach that works for exact text matches
      
      if (!this.readerContent || !selection) return;
      
      const color = this.getUserColor(userId);
      const textNodes = this.getTextNodes(this.readerContent);
      
      for (let node of textNodes) {
        const text = node.nodeValue;
        const index = text.indexOf(selection);
        
        if (index >= 0) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + selection.length);
          
          const span = document.createElement('span');
          span.className = 'highlight';
          span.style.backgroundColor = `${color}50`; // 50% opacity
          span.setAttribute('data-user-id', userId);
          span.setAttribute('data-username', userName);
          
          range.surroundContents(span);
          return; // Stop after first match
        }
      }
    }
    
    getTextNodes(element) {
      const textNodes = [];
      const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let node;
      
      while (node = walk.nextNode()) {
        textNodes.push(node);
      }
      
      return textNodes;
    }
    
    handleTextSelection() {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed) return;
      
      // Remove any existing selection menu
      const existingMenu = document.querySelector('.selection-menu');
      if (existingMenu) existingMenu.remove();
      
      const selectedText = selection.toString().trim();
      
      if (!selectedText) return;
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      this.showSelectionMenu(rect.left, rect.bottom, selectedText);
    }
    
    showSelectionMenu(x, y, selectedText) {
      const menu = document.createElement('div');
      menu.className = 'selection-menu';
      menu.style.left = `${x}px`;
      menu.style.top = `${y + window.scrollY + 10}px`; // Add 10px offset
      
      menu.innerHTML = `
        <button class="selection-menu__button highlight-btn">
          <i class="ri-mark-pen-line"></i> Highlight
        </button>
        <button class="selection-menu__button comment-btn">
          <i class="ri-chat-1-line"></i> Comment
        </button>
      `;
      
      document.body.appendChild(menu);
      
      // Make it visible after a small delay to ensure proper positioning
      setTimeout(() => {
        menu.classList.add('visible');
      }, 10);
      
      // Set up event listeners
      const highlightBtn = menu.querySelector('.highlight-btn');
      const commentBtn = menu.querySelector('.comment-btn');
      
      highlightBtn.addEventListener('click', () => {
        this.addHighlight(window.getSelection());
        menu.remove();
      });
      
      commentBtn.addEventListener('click', () => {
        if (this.commentInput) {
          this.commentInput.value = this.commentInput.value ? this.commentInput.value + ' "' + selectedText + '" ' : '"' + selectedText + '" ';
          this.commentInput.focus();
        }
        menu.remove();
      });
    }
    
    openShareDialog() {
      if (!this.shareDialog) return;
      
      // Generate share link
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set('book', this.bookId);
      shareUrl.searchParams.set('room', this.currentRoom);
      
      if (this.shareLinkInput) {
        this.shareLinkInput.value = shareUrl.href;
      }
      this.shareDialog.classList.add('show-dialog');
    }
    
    closeShareDialog() {
      if (!this.shareDialog) return;
      
      this.shareDialog.classList.remove('show-dialog');
    }
    
    copyShareLink() {
      if (!this.shareLinkInput) return;
      
      this.shareLinkInput.select();
      document.execCommand('copy');
      
      this.showNotification('Link copied to clipboard!', 'success');
    }
    
    showNotification(message, type = 'info') {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification notification--${type}`;
      notification.textContent = message;
      
      // Add to document
      document.body.appendChild(notification);
      
      // Show with animation
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 300); // Match transition time
      }, 3000);
    }
    
    getUserColor(userId) {
      // Generate consistent color based on user ID
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const colors = [
        '#4285F4', '#EA4335', '#FBBC05', '#34A853', // Google colors
        '#1877F2', '#E4405F', '#25D366', '#7289DA', // Social media colors
        '#FF5733', '#33FF57', '#3357FF', '#F033FF', // Bright colors
      ];
      
      return colors[Math.abs(hash) % colors.length];
    }
    
    formatTimestamp(timestamp) {
      // Firebase timestamps might be server values or numbers
      const date = timestamp ? new Date(timestamp) : new Date();
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    disconnect() {
      this.leaveRoom();
    }
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a reader page
    if (document.querySelector('.reader')) {
      window.collaborativeReading = new CollaborativeReading();
      
      // Get user info from localStorage or fetch from server
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const userId = currentUser?.userId || localStorage.getItem('userId') || 'guest-' + Math.random().toString(36).substr(2, 9);
      const userName = currentUser?.name || localStorage.getItem('userName') || 'Guest User';
      
      // Store user ID if not already stored
      if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId);
      }
      
      // Get book ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = urlParams.get('id') || '1';
      
      // Initialize collaborative reading
      window.collaborativeReading.initialize(userId, userName, bookId, 1);
    }
  });
  
  // Clean up when leaving page
  window.addEventListener('beforeunload', () => {
    if (window.collaborativeReading) {
      window.collaborativeReading.disconnect();
    }
  });