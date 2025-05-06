/**
 * Handles text highlighting functionality for the reading room
 */
class HighlightController {
    constructor(options = {}) {
        console.log('HighlightController constructor called with options:', options);
        this.isActive = false;
        this.roomId = options.roomId;
        this.bookId = options.bookId;
        this.currentUser = options.currentUser;
        this.db = options.db;
        this.readerContent = options.readerContent || document.getElementById('reader-content');
        this.highlightToggle = options.highlightToggle || document.getElementById('highlight-toggle');
        
        console.log('Found readerContent:', !!this.readerContent);
        console.log('Found highlightToggle:', !!this.highlightToggle);
        
        this.highlights = [];
        this.controlsElement = null;
        
        // Initialize
        this.init();
      }
    
    init() {
      console.log('Initializing highlight controller');
      // Add event listeners
      this.highlightToggle?.addEventListener('click', () => this.toggleHighlightMode());
      
      // Selection event
      document.addEventListener('mouseup', (e) => this.handleSelection(e));
      
      // Create highlight controls element
      this.createControlsElement();
      
      // Load existing highlights
      if (this.roomId && this.db) {
        this.loadHighlights();
      }
    }
    
    /**
 * Handle page changes - should be called whenever content changes
 */
handlePageChange() {
    // This method should be called whenever the page content changes
    // to ensure highlights are properly re-applied
    console.log('Page changed, reloading highlights');
    
    // Clear any active controls
    this.hideControls();
    
    // Load highlights after a small delay to ensure DOM is ready
    setTimeout(() => this.loadHighlights(), 300);
  }
    createControlsElement() {
      const controls = document.createElement('div');
      controls.className = 'highlight-controls';
      controls.innerHTML = `
        <div class="highlight-color yellow" data-color="yellow">
          <span class="highlight-tooltip">Yellow</span>
        </div>
        <div class="highlight-color red" data-color="red">
          <span class="highlight-tooltip">Red</span>
        </div>
        <div class="highlight-color green" data-color="green">
          <span class="highlight-tooltip">Green</span>
        </div>
        <div class="highlight-color blue" data-color="blue">
          <span class="highlight-tooltip">Blue</span>
        </div>
        <button class="highlight-delete">
          <i class="ri-delete-bin-line"></i>
          <span class="highlight-tooltip">Remove</span>
        </button>
      `;
      
      // Add color click handlers
      controls.querySelectorAll('.highlight-color').forEach(colorEl => {
        colorEl.addEventListener('click', () => {
          const color = colorEl.dataset.color;
          this.applyColor(color);
        });
      });
      
      // Add delete handler
      controls.querySelector('.highlight-delete').addEventListener('click', () => {
        this.removeHighlight();
      });
      
      // Add to document
      document.body.appendChild(controls);
      this.controlsElement = controls;
      console.log('Highlight controls created');
    }
    
    toggleHighlightMode() {
        console.log('Toggling highlight mode');
        this.isActive = !this.isActive;
        
        if (this.highlightToggle) {
          // Toggle active class for visual feedback
          if (this.isActive) {
            this.highlightToggle.classList.add('active');
            this.showNotification('Highlight mode enabled. Select text to highlight it.');
          } else {
            this.highlightToggle.classList.remove('active');
            this.showNotification('Highlight mode disabled.');
          }
        }
        
        // Update cursor style
        if (this.readerContent) {
          this.readerContent.style.cursor = this.isActive ? 'text' : '';
        }
        
        // Hide controls when toggling mode
        this.hideControls();
      }
      
      // Add this notification helper to HighlightController
      showNotification(message, type = 'info') {
        if (window.showNotification) {
          window.showNotification(message, type);
        } else {
          // Fallback if global function not available
          console.log(message);
          alert(message);
        }
      }
    
    handleSelection(e) {
      const selection = window.getSelection();
      
      // Don't handle empty selections or if not in highlight mode
      if (!selection || selection.toString().trim() === '') {
        return;
      }
      
      // Only proceed if highlight mode is active or if target is already a highlight
      const isHighlight = e.target.classList && e.target.classList.contains('highlight');
      if (!this.isActive && !isHighlight) {
        return;
      }
      
      // If clicked on an existing highlight, show controls
      if (isHighlight) {
        console.log('Clicked on existing highlight');
        this.showControlsForHighlight(e.target, e);
        return;
      }
      
      // For new selections
      const range = selection.getRangeAt(0);
      
      // Make sure we're selecting within reader content
      if (!this.readerContent.contains(range.commonAncestorContainer)) {
        return;
      }
      
      console.log('Creating new highlight');
      // Create highlight
      this.createHighlight(range, 'yellow');
      
      // Clear selection
      selection.removeAllRanges();
    }
    
    createHighlight(range, color) {
      // Create a unique ID for this highlight
      const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a span to wrap the highlighted text
      const highlightSpan = document.createElement('span');
      highlightSpan.className = `highlight highlight-${color}`;
      highlightSpan.dataset.highlightId = highlightId;
      
      // Add data about creator
      if (this.currentUser) {
        highlightSpan.dataset.createdBy = this.currentUser.uid;
        highlightSpan.dataset.creatorName = this.currentUser.name || this.currentUser.email || 'Unknown';
      }
      
      // Surround selection with highlight span
      try {
        range.surroundContents(highlightSpan);
        
        // Store highlight in database
        this.saveHighlight({
          id: highlightId,
          text: highlightSpan.textContent,
          color: color,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          createdBy: this.currentUser?.uid || 'anonymous',
          creatorName: this.currentUser?.name || this.currentUser?.email || 'Unknown',
          xpath: this.getXPath(highlightSpan),
          offset: this.getTextOffset(highlightSpan)
        });
        
        // Show controls for the new highlight
        this.showControlsForHighlight(highlightSpan);
      } catch (error) {
        console.error('Error creating highlight:', error);
        // May fail if selection spans multiple elements
        alert('Cannot highlight this selection. Please try selecting a smaller portion of text.');
      }
    }
    
    showControlsForHighlight(highlightEl, event = null) {
        if (!this.controlsElement) return;
        
        // Position controls above the highlight
        const rect = highlightEl.getBoundingClientRect();
        
        // Calculate position - above the highlight
        let x = rect.left + (rect.width / 2);
        let y = rect.top - 10; // Position above with a small gap
        
        // If triggered by click event, use click position instead
        if (event) {
          x = event.clientX;
          y = event.clientY - 40; // Position the panel above the cursor
        }
        
        // Ensure the controls don't go off-screen
        const controlsWidth = 160; // Approximate width of controls
        x = Math.max(controlsWidth/2, Math.min(x, window.innerWidth - controlsWidth/2));
        
        // Ensure controls don't go above viewport
        if (y < 50) y = rect.bottom + 10; // Position below if too close to top
        
        this.controlsElement.style.left = `${x}px`;
        this.controlsElement.style.top = `${y}px`;
        this.controlsElement.classList.add('active');
        this.controlsElement.dataset.highlightId = highlightEl.dataset.highlightId;
        
        // Set the currently active highlight color
        const color = [...highlightEl.classList].find(c => c.startsWith('highlight-'))?.replace('highlight-', '');
        if (color) {
          this.controlsElement.querySelectorAll('.highlight-color').forEach(el => {
            el.style.borderColor = el.dataset.color === color ? '#333' : 'transparent';
          });
        }
        
        // Click outside to hide
        setTimeout(() => {
          const clickOutsideHandler = (e) => {
            if (!this.controlsElement.contains(e.target) && !highlightEl.contains(e.target)) {
              this.hideControls();
              document.removeEventListener('click', clickOutsideHandler);
            }
          };
          document.addEventListener('click', clickOutsideHandler);
        }, 100);
      }
    
    hideControls() {
      if (this.controlsElement) {
        this.controlsElement.classList.remove('active');
        delete this.controlsElement.dataset.highlightId;
      }
    }
    
    applyColor(color) {
      if (!this.controlsElement || !this.controlsElement.dataset.highlightId) return;
      
      const highlightId = this.controlsElement.dataset.highlightId;
      const highlightEl = document.querySelector(`[data-highlight-id="${highlightId}"]`);
      
      if (highlightEl) {
        // Remove all color classes
        ['yellow', 'red', 'green', 'blue'].forEach(c => {
          highlightEl.classList.remove(`highlight-${c}`);
        });
        
        // Add new color class
        highlightEl.classList.add(`highlight-${color}`);
        
        // Update in database
        this.updateHighlight(highlightId, { color });
        
        // Update control UI
        this.controlsElement.querySelectorAll('.highlight-color').forEach(el => {
          el.style.borderColor = el.dataset.color === color ? '#333' : 'transparent';
        });
      }
    }
    
    removeHighlight() {
        if (!this.controlsElement || !this.controlsElement.dataset.highlightId) return;
        
        const highlightId = this.controlsElement.dataset.highlightId;
        const highlightEl = document.querySelector(`[data-highlight-id="${highlightId}"]`);
        
        if (highlightEl) {
          try {
            // Create a text node with the highlighted content
            const textNode = document.createTextNode(highlightEl.textContent);
            
            // Replace the highlight with the text content
            highlightEl.parentNode.replaceChild(textNode, highlightEl);
            
            // Remove from database
            this.deleteHighlight(highlightId);
            
            // Hide controls
            this.hideControls();
            
            console.log('Highlight successfully removed:', highlightId);
          } catch (error) {
            console.error('Error removing highlight:', error, highlightEl);
            
            // Fallback removal method if the above fails
            try {
              highlightEl.outerHTML = highlightEl.textContent;
              this.deleteHighlight(highlightId);
              this.hideControls();
            } catch (fallbackError) {
              console.error('Fallback removal also failed:', fallbackError);
            }
          }
        } else {
          console.warn('Highlight element not found for deletion:', highlightId);
          // Still remove from database if element can't be found
          this.deleteHighlight(highlightId);
          this.hideControls();
        }
      }
    
    async loadHighlights() {
      if (!this.roomId || !this.db) return;
      
      try {
        console.log('Loading highlights for room:', this.roomId);
        // Set up a listener for highlights
        this.db.ref(`readingRooms/${this.roomId}/highlights`).on('value', (snapshot) => {
          // Save current highlights
          this.highlights = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              this.highlights.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
              });
            });
          }
          
          console.log('Got highlights:', this.highlights.length);
          
          // Apply all highlights to the content
          this.applyHighlightsToContent();
        });
      } catch (error) {
        console.error('Error loading highlights:', error);
      }
    }
    
    applyHighlightsToContent() {
      if (!this.readerContent || this.highlights.length === 0) return;
      
      console.log('Applying highlights to content');
      
      // Remove all existing highlights to avoid duplicates
      const existingHighlights = this.readerContent.querySelectorAll('.highlight');
      existingHighlights.forEach(el => {
        const textNode = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(textNode, el);
      });
      
      // Add each highlight back
      this.highlights.forEach(highlight => {
        try {
          // For simple demo, just find the text and highlight it
          // In a real implementation, you'd need to use the proper xpath/offset
          this.findAndHighlightText(highlight.text, highlight);
        } catch (error) {
          console.error('Error applying highlight:', error);
        }
      });
    }
    
    findAndHighlightText(text, highlight) {
      // Simple implementation to find and highlight the first occurrence of text
      // This is a basic demo; in a real app you'd use the stored XPath for precision
      
      const content = this.readerContent;
      const allTextNodes = [];
      
      // Helper function to get all text nodes
      const getTextNodes = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          allTextNodes.push(node);
        } else {
          for (const child of node.childNodes) {
            getTextNodes(child);
          }
        }
      };
      
      getTextNodes(content);
      
      // Find the text in any text node
      for (const textNode of allTextNodes) {
        const nodeText = textNode.nodeValue;
        const index = nodeText.indexOf(text);
        
        if (index >= 0) {
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + text.length);
          
          // Create highlight element
          const highlightSpan = document.createElement('span');
          highlightSpan.className = `highlight highlight-${highlight.color}`;
          highlightSpan.dataset.highlightId = highlight.id;
          highlightSpan.dataset.createdBy = highlight.createdBy;
          highlightSpan.dataset.creatorName = highlight.creatorName;
          
          // Apply highlight
          try {
            range.surroundContents(highlightSpan);
            return true;
          } catch (e) {
            console.error('Could not apply highlight to found text:', e);
          }
        }
      }
      
      return false;
    }
    
    saveHighlight(highlight) {
      if (!this.db || !this.roomId) return;
      
      try {
        // Add book ID if available
        if (this.bookId) {
          highlight.bookId = this.bookId;
        }
        
        // Save to Firebase
        const highlightRef = this.db.ref(`readingRooms/${this.roomId}/highlights/${highlight.id}`);
        highlightRef.set(highlight);
        
        console.log('Highlight saved:', highlight.id);
      } catch (error) {
        console.error('Error saving highlight:', error);
      }
    }
    
    updateHighlight(highlightId, updates) {
      if (!this.db || !this.roomId) return;
      
      try {
        // Update in Firebase
        const highlightRef = this.db.ref(`readingRooms/${this.roomId}/highlights/${highlightId}`);
        highlightRef.update(updates);
        console.log('Highlight updated:', highlightId);
      } catch (error) {
        console.error('Error updating highlight:', error);
      }
    }
    
    deleteHighlight(highlightId) {
      if (!this.db || !this.roomId) return;
      
      try {
        // Remove from Firebase
        const highlightRef = this.db.ref(`readingRooms/${this.roomId}/highlights/${highlightId}`);
        highlightRef.remove();
        console.log('Highlight deleted:', highlightId);
      } catch (error) {
        console.error('Error deleting highlight:', error);
      }
    }
    
    // Helper function to get XPath to an element
    getXPath(element) {
      // Simple implementation for demo purposes
      // In a real implementation, you'd want to create a robust XPath
      return Math.random().toString(36).substring(2, 15);
    }
    
    // Get text offset within parent element
    getTextOffset(element) {
      // Simple implementation for demo purposes
      return 0;
    }
  }
  
  // Don't auto-initialize - this will be done from reader.js
  console.log('HighlightController loaded and ready to be initialized');