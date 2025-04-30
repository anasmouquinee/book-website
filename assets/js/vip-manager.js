/**
 * VIP Management System
 * Handles VIP subscriptions, permissions, and feature access
 */

class VIPManager {
    constructor() {
      // Initialize VIP Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if firebase services are initialized before creating VIP manager
  const initVipManager = () => {
    if (typeof firebase !== 'undefined' && firebase.apps.length) {
      window.vipManager = new VIPManager();
      console.log('VIP Manager initialized');
    } else {
      // Retry after delay
      setTimeout(initVipManager, 1000);
    }
  };
  
  initVipManager();
});
      // Initialize Firebase
      const services = window.firebaseServices || this.initializeFirebase();
      if (!services) {
        console.error('Failed to initialize Firebase services for VIP Manager');
        return;
      }
      
      this.auth = services.auth;
      this.db = services.db;
      
      // Initialize properties
      this.currentUser = null;
      
      // Add auth state listener
      this.auth.onAuthStateChanged(user => {
        if (user) {
          this.fetchUserProfile(user.uid);
        } else {
          this.currentUser = null;
        }
      });
      
      // Create VIP upgrade modal if it doesn't exist
      this.createVIPModal();
      
      // Attach event listeners
      this.attachEventListeners();
      
      // Make the global function available
      window.showVIPUpgradeDialog = this.showVIPModal.bind(this);
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
        }
        return {
          auth: firebase.auth(),
          db: firebase.database()
        };
      } catch (error) {
        console.error('Firebase initialization failed:', error);
        return null;
      }
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
          
          // Check if admin, auto-grant VIP if admin
          if (userData.isAdmin && !userData.isVIP) {
            this.grantVIPToAdmin();
          }
        }
      } catch (error) {
        console.error('Error fetching user profile for VIP manager:', error);
      }
    }
    
    async grantVIPToAdmin() {
      if (!this.currentUser || !this.currentUser.isAdmin) return;
      
      try {
        await this.db.ref(`users/${this.currentUser.uid}`).update({
          isVIP: true,
          VIPActivatedAt: firebase.database.ServerValue.TIMESTAMP,
          VIPSource: 'admin_auto'
        });
        
        this.currentUser.isVIP = true;
        console.log('VIP status automatically granted to admin user');
      } catch (error) {
        console.error('Error granting VIP to admin:', error);
      }
    }
    
    createVIPModal() {
      if (document.getElementById('vip-upgrade-modal')) return;
      
      const modal = document.createElement('div');
      modal.id = 'vip-upgrade-modal';
      modal.className = 'vip-upgrade-modal';
      
      modal.innerHTML = `
        <div class="vip-modal-content">
          <button id="vip-modal-close" class="vip-modal-close"><i class="ri-close-line"></i></button>
          
          <div class="vip-modal-header">
            <i class="ri-vip-crown-line"></i>
            <h3>Upgrade to VIP</h3>
            <p>Unlock premium features and enhance your reading experience</p>
          </div>
          
          <div class="vip-features">
            <div class="vip-feature">
              <i class="ri-book-read-line"></i>
              <h4>Reading Rooms</h4>
              <p>Create private reading sessions with friends</p>
            </div>
            
            <div class="vip-feature">
              <i class="ri-chat-3-line"></i>
              <h4>Live Discussions</h4>
              <p>Chat with other readers in real-time</p>
            </div>
            
            <div class="vip-feature">
              <i class="ri-bookmark-line"></i>
              <h4>Unlimited Bookmarks</h4>
              <p>Save and organize your favorite passages</p>
            </div>
            
            <div class="vip-feature">
              <i class="ri-24-hours-line"></i>
              <h4>Early Access</h4>
              <p>Get early access to new books and features</p>
            </div>
          </div>
          
          <div class="vip-pricing">
            <div class="vip-price-option">
              <h4>Monthly</h4>
              <div class="vip-price">$4.99<span>/month</span></div>
              <button id="vip-subscribe-monthly" class="button vip-subscribe-btn">Subscribe</button>
            </div>
            
            <div class="vip-price-option featured">
              <div class="price-badge">Popular</div>
              <h4>Annual</h4>
              <div class="vip-price">$39.99<span>/year</span></div>
              <div class="vip-savings">Save 33%</div>
              <button id="vip-subscribe-annual" class="button vip-subscribe-btn">Subscribe</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add styles
      this.addVIPStyles();
    }
    
    addVIPStyles() {
      if (document.getElementById('vip-manager-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'vip-manager-styles';
      style.textContent = `
        .vip-upgrade-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.75);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        
        .vip-upgrade-modal.active {
          opacity: 1;
          visibility: visible;
        }
        
        .vip-modal-content {
          background-color: var(--body-color);
          border-radius: 1rem;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          transform: translateY(20px);
          transition: transform 0.3s ease;
        }
        
        .vip-upgrade-modal.active .vip-modal-content {
          transform: translateY(0);
        }
        
        .vip-modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-color-light);
          transition: color 0.2s;
        }
        
        .vip-modal-close:hover {
          color: var(--first-color);
        }
        
        .vip-modal-header {
          text-align: center;
          padding: 2rem 2rem 1rem;
        }
        
        .vip-modal-header i {
          font-size: 3rem;
          color: gold;
          margin-bottom: 1rem;
        }
        
        .vip-modal-header h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .vip-modal-header p {
          color: var(--text-color-light);
        }
        
        .vip-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          padding: 1rem 2rem;
        }
        
        .vip-feature {
          text-align: center;
          padding: 1rem;
        }
        
        .vip-feature i {
          font-size: 2rem;
          color: var(--first-color);
          margin-bottom: 0.5rem;
        }
        
        .vip-feature h4 {
          margin-bottom: 0.5rem;
        }
        
        .vip-feature p {
          font-size: 0.875rem;
          color: var(--text-color-light);
        }
        
        .vip-pricing {
          display: flex;
          justify-content: center;
          gap: 2rem;
          padding: 1rem 2rem 2rem;
        }
        
        .vip-price-option {
          flex: 1;
          max-width: 200px;
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          padding: 1.5rem;
          text-align: center;
          position: relative;
          background-color: var(--container-color);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .vip-price-option:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .vip-price-option.featured {
          border-color: var(--first-color);
          transform: scale(1.05);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        }
        
        .vip-price-option.featured:hover {
          transform: scale(1.05) translateY(-5px);
        }
        
        .price-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background-color: var(--first-color);
          color: white;
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-weight: 500;
        }
        
        .vip-price {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0;
          color: var(--title-color);
        }
        
        .vip-price span {
          font-size: 0.9rem;
          font-weight: normal;
          color: var(--text-color-light);
        }
        
        .vip-savings {
          color: #4caf50;
          font-weight: 500;
          margin-bottom: 1rem;
        }
        
        .vip-subscribe-btn {
          width: 100%;
        }
        
        /* Additional styles for VIP badges and indicators */
        .vip-badge {
          background-color: gold;
          color: #000;
          font-size: 0.7rem;
          padding: 0.1rem 0.5rem;
          border-radius: 1rem;
          font-weight: 500;
          display: inline-block;
          margin-left: 0.5rem;
          vertical-align: middle;
        }
        
        .vip-indicator {
          color: gold;
          margin-right: 0.25rem;
        }
        
        .notification {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          background-color: var(--container-color);
          border-left: 4px solid var(--first-color);
          border-radius: 0.5rem;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          transform: translateX(120%);
          transition: transform 0.3s ease;
          z-index: 1000;
        }
        
        .notification.show {
          transform: translateX(0);
        }
        
        .notification--success {
          border-left-color: #4caf50;
        }
        
        .notification--error {
          border-left-color: #f44336;
        }
        
        .notification--info {
          border-left-color: #2196f3;
        }
        
        @media screen and (max-width: 768px) {
          .vip-features {
            grid-template-columns: 1fr;
          }
          
          .vip-pricing {
            flex-direction: column;
            align-items: center;
          }
          
          .vip-price-option {
            max-width: 100%;
            width: 100%;
          }
        }
      `;
      
      document.head.appendChild(style);
    }
    
    attachEventListeners() {
      // Close modal button
      document.getElementById('vip-modal-close')?.addEventListener('click', () => {
        this.hideVIPModal();
      });
      
      // Subscribe buttons
      document.getElementById('vip-subscribe-monthly')?.addEventListener('click', () => {
        this.upgradeToVIP('monthly');
      });
      
      document.getElementById('vip-subscribe-annual')?.addEventListener('click', () => {
        this.upgradeToVIP('annual');
      });
      
      // Close modal when clicking outside content
      document.getElementById('vip-upgrade-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'vip-upgrade-modal') {
          this.hideVIPModal();
        }
      });
    }
    
    showVIPModal() {
      const modal = document.getElementById('vip-upgrade-modal');
      if (!modal) {
        this.createVIPModal();
      }
      
      document.getElementById('vip-upgrade-modal').classList.add('active');
      
      // Disable scrolling on body
      document.body.style.overflow = 'hidden';
    }
    
    hideVIPModal() {
      document.getElementById('vip-upgrade-modal')?.classList.remove('active');
      
      // Re-enable scrolling
      document.body.style.overflow = '';
    }
    
    async upgradeToVIP(plan) {
      if (!this.currentUser) {
        this.showNotification('Please log in to upgrade to VIP', 'error');
        return;
      }
      
      this.showNotification('Processing your payment...', 'info');
      
      // Show payment processing modal
      this.showPaymentProcessingModal(plan);
    }
    
    showPaymentProcessingModal(plan) {
      // Create payment processing modal
      const modal = document.createElement('div');
      modal.className = 'payment-modal';
      modal.innerHTML = `
        <div class="payment-modal__content">
          <h3>Complete Your VIP Upgrade</h3>
          <p>You're upgrading to the ${plan === 'monthly' ? 'Monthly' : 'Annual'} VIP plan.</p>
          
          <div class="payment-form">
            <div class="payment-form__group">
              <label for="card-name">Cardholder Name</label>
              <input type="text" id="card-name" placeholder="John Doe" required>
            </div>
            
            <div class="payment-form__group">
              <label for="card-number">Card Number</label>
              <input type="text" id="card-number" placeholder="1234 5678 9012 3456" maxlength="19" required>
            </div>
            
            <div class="payment-form__row">
              <div class="payment-form__group">
                <label for="card-expiry">Expiry Date</label>
                <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5" required>
              </div>
              
              <div class="payment-form__group">
                <label for="card-cvc">CVC</label>
                <input type="text" id="card-cvc" placeholder="123" maxlength="3" required>
              </div>
            </div>
            
            <div class="payment-summary">
              <div class="payment-summary__item">
                <span>Plan:</span>
                <span>${plan === 'monthly' ? 'Monthly' : 'Annual'} VIP</span>
              </div>
              <div class="payment-summary__item">
                <span>Price:</span>
                <span>${plan === 'monthly' ? '$4.99/month' : '$39.99/year'}</span>
              </div>
              ${plan === 'annual' ? '<div class="payment-summary__item"><span>Savings:</span><span>Save 33%</span></div>' : ''}
              <div class="payment-summary__total">
                <span>Total Today:</span>
                <span>${plan === 'monthly' ? '$4.99' : '$39.99'}</span>
              </div>
            </div>
            
            <div class="payment-form__actions">
              <button class="button payment-submit-btn" id="process-payment">Complete Payment</button>
              <button class="button button--ghost payment-cancel-btn" id="cancel-payment">Cancel</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Format card number with spaces
      const cardNumberInput = document.getElementById('card-number');
      cardNumberInput?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '');
        if (value.length > 0) {
          value = value.match(new RegExp('.{1,4}', 'g')).join(' ');
        }
        e.target.value = value;
      });
      
      // Format expiry date with slash
      const expiryInput = document.getElementById('card-expiry');
      expiryInput?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) {
          value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
      });
      
      // Process payment
      document.getElementById('process-payment')?.addEventListener('click', async () => {
        const cardName = document.getElementById('card-name')?.value;
        const cardNumber = document.getElementById('card-number')?.value;
        const cardExpiry = document.getElementById('card-expiry')?.value;
        const cardCvc = document.getElementById('card-cvc')?.value;
        
        if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
          this.showNotification('Please fill in all payment details', 'error');
          return;
        }
        
        // Simple validation
        if (cardNumber.replace(/\s/g, '').length < 16) {
          this.showNotification('Please enter a valid card number', 'error');
          return;
        }
        
        if (cardExpiry.length < 5) {
          this.showNotification('Please enter a valid expiry date', 'error');
          return;
        }
        
        if (cardCvc.length < 3) {
          this.showNotification('Please enter a valid CVC', 'error');
          return;
        }
        
        // Show processing
        const submitBtn = document.getElementById('process-payment');
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Processing...';
          submitBtn.disabled = true;
        }
        
        try {
          // Simulate payment processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Update user record with VIP status
          await this.db.ref(`users/${this.currentUser.uid}`).update({
            isVIP: true,
            VIPActivatedAt: firebase.database.ServerValue.TIMESTAMP,
            VIPPlan: plan,
            VIPExpiresAt: plan === 'monthly' 
              ? Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
              : Date.now() + (365 * 24 * 60 * 60 * 1000), // 365 days
            paymentMethod: {
              type: 'card',
              lastFour: cardNumber.replace(/\s/g, '').slice(-4),
              expiryDate: cardExpiry
            }
          });
          
          // Update local user object
          this.currentUser.isVIP = true;
          
          // Remove modal
          modal.remove();
          
          this.showNotification('You are now a VIP member!', 'success');
          this.hideVIPModal();
          
          // Refresh any VIP features on the page
          this.triggerVIPUpdate();
          
        } catch (error) {
          console.error('Error processing payment:', error);
          this.showNotification('Payment processing failed. Please try again.', 'error');
          
          // Reset button
          if (submitBtn) {
            submitBtn.innerHTML = 'Complete Payment';
            submitBtn.disabled = false;
          }
        }
      });
      
      // Cancel payment
      document.getElementById('cancel-payment')?.addEventListener('click', () => {
        modal.remove();
        this.showNotification('Payment cancelled', 'info');
      });
      
      // Add payment modal styles
      this.addPaymentStyles();
    }
    
    addPaymentStyles() {
      if (document.getElementById('payment-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'payment-styles';
      style.textContent = `
        .payment-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.75);
          z-index: 10000;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .payment-modal__content {
          background-color: var(--body-color);
          border-radius: 1rem;
          width: 90%;
          max-width: 500px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .payment-modal__content h3 {
          margin-bottom: 1rem;
          text-align: center;
        }
        
        .payment-modal__content p {
          margin-bottom: 1.5rem;
          text-align: center;
          color: var(--text-color-light);
        }
        
        .payment-form__group {
          margin-bottom: 1rem;
        }
        
        .payment-form__group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .payment-form__group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          background-color: var(--container-color);
          color: var(--text-color);
        }
        
        .payment-form__row {
          display: flex;
          gap: 1rem;
        }
        
        .payment-form__row .payment-form__group {
          flex: 1;
        }
        
        .payment-summary {
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: var(--container-color);
          border-radius: 0.5rem;
        }
        
        .payment-summary__item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .payment-summary__total {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border-color);
          font-weight: 600;
        }
        
        .payment-form__actions {
          display: flex;
          gap: 1rem;
        }
        
        .payment-form__actions button {
          flex: 1;
        }
        
        .ri-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media screen and (max-width: 576px) {
          .payment-modal__content {
            padding: 1.5rem;
          }
          
          .payment-form__row {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `;
      
      document.head.appendChild(style);
    }
    
    showNotification(message, type = 'info') {
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
    
    triggerVIPUpdate() {
      // Dispatch a custom event that other modules can listen for
      const event = new CustomEvent('vip-status-changed', {
        detail: {
          isVIP: this.currentUser?.isVIP || false,
          user: this.currentUser
        }
      });
      
      document.dispatchEvent(event);
      
      // If reading room module exists, reload user rooms
      if (window.readingRoom) {
        window.readingRoom.loadUserRooms();
      }
    }
    
    // Allow admins to grant VIP status to other users
    async grantVIPToUser(userId) {
      if (!this.currentUser?.isAdmin) {
        console.error('Only admins can grant VIP status');
        return false;
      }
      
      try {
        await this.db.ref(`users/${userId}`).update({
          isVIP: true,
          VIPActivatedAt: firebase.database.ServerValue.TIMESTAMP,
          VIPPlan: 'admin_granted',
          VIPGrantedBy: {
            uid: this.currentUser.uid,
            name: this.currentUser.name,
            timestamp: firebase.database.ServerValue.TIMESTAMP
          }
        });
        
        console.log(`VIP status granted to user ${userId} by admin ${this.currentUser.uid}`);
        return true;
      } catch (error) {
        console.error('Error granting VIP status:', error);
        return false;
      }
    }
    
    // Allow admins to revoke VIP status
    async revokeVIPFromUser(userId) {
      if (!this.currentUser?.isAdmin) {
        console.error('Only admins can revoke VIP status');
        return false;
      }
      
      try {
        // Check if user is admin - admins can't have VIP status revoked
        const userSnapshot = await this.db.ref(`users/${userId}`).once('value');
        const userData = userSnapshot.val();
        
        if (userData.isAdmin) {
          console.error('Cannot revoke VIP status from admin users');
          return false;
        }
        
        await this.db.ref(`users/${userId}`).update({
          isVIP: false,
          VIPRevokedAt: firebase.database.ServerValue.TIMESTAMP,
          VIPRevokedBy: {
            uid: this.currentUser.uid,
            name: this.currentUser.name,
            timestamp: firebase.database.ServerValue.TIMESTAMP
          }
        });
        
        console.log(`VIP status revoked from user ${userId} by admin ${this.currentUser.uid}`);
        return true;
      } catch (error) {
        console.error('Error revoking VIP status:', error);
        return false;
      }
    }
  }
  
  // Initialize VIP Manager when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    window.vipManager = new VIPManager();
  });