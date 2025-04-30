/*=============== UTILITIES ===============*/
class DOMUtils {
    static getElement(selector, required = true) {
      const element = document.querySelector(selector);
      if (!element && required) {
        throw new Error(`Element ${selector} not found`);
      }
      return element;
    }
  
    static getAllElements(selector) {
      return [...document.querySelectorAll(selector)];
    }
  
    static showMessage(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }
  
  /*=============== FIREBASE INTEGRATION ===============*/
  class FirebaseManager {
    constructor() {
      // Check if Firebase is already initialized
      if (typeof firebase === 'undefined') {
        console.error('Firebase SDK is not loaded');
        DOMUtils.showMessage('Firebase SDK not loaded. Some features may not work.', 'error');
        return;
      }
  
      try {
        // If Firebase is already initialized in reader.html, use that instance
        if (firebase.apps.length) {
          this.auth = firebase.auth();
          this.db = firebase.database();
          console.log('Using existing Firebase instance');
        } else {
          // Initialize Firebase with config
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
          firebase.initializeApp(firebaseConfig);
          this.auth = firebase.auth();
          this.db = firebase.database();
          console.log('Firebase initialized');
        }
  
        // Set auth state change listener
        this.auth.onAuthStateChanged(user => {
          console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
          if (user) {
            this.getCurrentUserData(user.uid);
          }
        });
      } catch (error) {
        console.error('Firebase initialization error:', error);
        DOMUtils.showMessage('Failed to initialize Firebase', 'error');
      }
    }
  
    async getCurrentUserData(uid) {
      try {
        const snapshot = await this.db.ref(`users/${uid}`).once('value');
        return snapshot.val();
      } catch (error) {
        console.error('Error getting user data:', error);
        return null;
      }
    }
  
    async saveUserData(uid, userData) {
      try {
        await this.db.ref(`users/${uid}`).update(userData);
        console.log('User data saved');
        return true;
      } catch (error) {
        console.error('Error saving user data:', error);
        return false;
      }
    }
  
    async getBooks() {
      try {
        const snapshot = await this.db.ref('books').once('value');
        const books = [];
        snapshot.forEach(childSnapshot => {
          books.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        return books;
      } catch (error) {
        console.error('Error getting books:', error);
        return [];
      }
    }
  
    async saveBook(bookData) {
      try {
        const bookId = bookData.id || this.db.ref('books').push().key;
        bookData.id = bookId;
        await this.db.ref(`books/${bookId}`).set(bookData);
        console.log('Book saved:', bookId);
        return bookId;
      } catch (error) {
        console.error('Error saving book:', error);
        throw error;
      }
    }
  
    async deleteBook(bookId) {
      try {
        await this.db.ref(`books/${bookId}`).remove();
        console.log('Book deleted:', bookId);
        return true;
      } catch (error) {
        console.error('Error deleting book:', error);
        throw error;
      }
    }
  
    async getUserCart(uid) {
      try {
        const snapshot = await this.db.ref(`carts/${uid}`).once('value');
        const cartItems = [];
        snapshot.forEach(childSnapshot => {
          cartItems.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        return cartItems;
      } catch (error) {
        console.error('Error getting cart:', error);
        return [];
      }
    }
  
    async addToCart(uid, item) {
      try {
        const cartRef = this.db.ref(`carts/${uid}`);
        const snapshot = await cartRef.child(item.id).once('value');
        
        if (snapshot.exists()) {
          // Item exists, update quantity
          const currentQty = snapshot.val().quantity || 1;
          await cartRef.child(item.id).update({
            quantity: currentQty + 1
          });
        } else {
          // New item
          await cartRef.child(item.id).set({
            ...item,
            quantity: 1,
            addedAt: firebase.database.ServerValue.TIMESTAMP
          });
        }
        console.log('Item added to cart:', item.id);
        return true;
      } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
      }
    }
  
    async removeFromCart(uid, itemId) {
      try {
        await this.db.ref(`carts/${uid}/${itemId}`).remove();
        console.log('Item removed from cart:', itemId);
        return true;
      } catch (error) {
        console.error('Error removing from cart:', error);
        throw error;
      }
    }
  
    async clearCart(uid) {
      try {
        await this.db.ref(`carts/${uid}`).remove();
        console.log('Cart cleared');
        return true;
      } catch (error) {
        console.error('Error clearing cart:', error);
        throw error;
      }
    }
  
    async addToRecentlyViewed(uid, book) {
      try {
        const recentRef = this.db.ref(`recentlyViewed/${uid}`);
        const newItemRef = recentRef.push();
        await newItemRef.set({
          ...book,
          viewedAt: firebase.database.ServerValue.TIMESTAMP
        });
  
        // Limit to 10 most recent
        const snapshot = await recentRef.orderByChild('viewedAt').once('value');
        const items = [];
        snapshot.forEach(childSnapshot => {
          items.push({
            key: childSnapshot.key,
            viewedAt: childSnapshot.val().viewedAt
          });
        });
  
        // Sort by viewedAt descending
        items.sort((a, b) => b.viewedAt - a.viewedAt);
  
        // Remove excess items (keep only 10 most recent)
        if (items.length > 10) {
          for (let i = 10; i < items.length; i++) {
            await recentRef.child(items[i].key).remove();
          }
        }
  
        return true;
      } catch (error) {
        console.error('Error adding to recently viewed:', error);
        return false;
      }
    }
  
    async getRecentlyViewed(uid) {
      try {
        const snapshot = await this.db.ref(`recentlyViewed/${uid}`)
          .orderByChild('viewedAt')
          .limitToLast(10)
          .once('value');
        
        const items = [];
        snapshot.forEach(childSnapshot => {
          items.push({
            id: childSnapshot.val().id,
            ...childSnapshot.val()
          });
        });
        
        // Sort by viewedAt in descending order (newest first)
        return items.sort((a, b) => b.viewedAt - a.viewedAt);
      } catch (error) {
        console.error('Error getting recently viewed:', error);
        return [];
      }
    }
  
    // Add an admin user if none exists yet
    async ensureAdminExists() {
      try {
        const snapshot = await this.db.ref('users').orderByChild('isAdmin').equalTo(true).once('value');
        if (snapshot.exists()) {
          console.log('Admin user already exists');
          return;
        }
  
        // Create admin user if none exists
        try {
          // Create auth account
          const userCredential = await this.auth.createUserWithEmailAndPassword('anasmouquine2@gmail.com', 'anasanas');
          const uid = userCredential.user.uid;
          
          // Set admin data
          await this.db.ref(`users/${uid}`).set({
            name: 'Admin',
            email: 'anasmouquine2@gmail.com',
            isAdmin: true,
            createdAt: firebase.database.ServerValue.TIMESTAMP
          });
          
          console.log('Admin user created');
        } catch (error) {
          if (error.code === 'auth/email-already-in-use') {
            // Email exists but user might not be set as admin, try to update
            try {
              const adminUser = await this.auth.signInWithEmailAndPassword('anasmouquine2@gmail.com', 'anasanas');
              await this.db.ref(`users/${adminUser.user.uid}`).update({
                isAdmin: true
              });
              console.log('Existing user updated to admin');
            } catch (loginError) {
              console.error('Could not set admin user:', loginError);
            }
          } else {
            console.error('Could not create admin user:', error);
          }
        }
      } catch (error) {
        console.error('Error ensuring admin exists:', error);
      }
    }
  }
  
  /*=============== AUTH CONTROLLER ===============*/
  class AuthController {
    constructor(firebase) {
      this.firebase = firebase;
      this.auth = firebase.auth;
      this.db = firebase.db;
      this.currentUser = null;
      
      // Set auth state listener
      this.auth.onAuthStateChanged(user => {
        if (user) {
          this.fetchUserProfile(user.uid);
        } else {
          this.currentUser = null;
        }
      });
  
      // Ensure admin user exists
      this.firebase.ensureAdminExists();
    }
  
    async fetchUserProfile(uid) {
      try {
        const snapshot = await this.db.ref(`users/${uid}`).once('value');
        if (snapshot.exists()) {
          this.currentUser = {
            uid,
            ...snapshot.val()
          };
          console.log('User profile fetched:', this.currentUser.name);
        } else {
          // User exists in Auth but not in Database
          const user = this.auth.currentUser;
          if (user) {
            const userData = {
              name: user.displayName || 'User',
              email: user.email,
              createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            await this.db.ref(`users/${uid}`).set(userData);
            this.currentUser = {
              uid,
              ...userData
            };
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
  
    async login(email, password, rememberMe = false) {
      try {
        console.log('Attempting login with remember me:', rememberMe);
        
        // Store the remember me preference 
        localStorage.setItem('rememberMe', rememberMe.toString());
        
        // Set persistence based on rememberMe option
        try {
          const persistenceType = rememberMe ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
            
          await this.auth.setPersistence(persistenceType);
          console.log('Persistence set to:', rememberMe ? 'LOCAL' : 'SESSION');
        } catch (persistenceError) {
          console.error('Error setting persistence:', persistenceError);
          // Continue with login despite persistence error
        }
        
        // Sign in user
        const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful, fetching user profile...');
        
        // Fetch user profile data
        await this.fetchUserProfile(userCredential.user.uid);
        
        return this.currentUser;
      } catch (error) {
        console.error('Login error:', error);
        throw new Error(this.getAuthErrorMessage(error));
      }
    }

    async signup(userData) {
      try {
        // Create auth user
        const userCredential = await this.auth.createUserWithEmailAndPassword(userData.email, userData.password);
        const uid = userCredential.user.uid;
        
        // Generate recovery code
        const recoveryCode = this.generateRecoveryCode();
        
        // Create user profile in database
        await this.db.ref(`users/${uid}`).set({
          name: userData.name,
          email: userData.email,
          recoveryCode,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        return recoveryCode;
      } catch (error) {
        console.error('Signup error:', error);
        throw new Error(this.getAuthErrorMessage(error));
      }
    }
  
    async logout() {
      try {
        await this.auth.signOut();
        this.currentUser = null;
        return true;
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    }
  
    async resetPassword(email, recoveryCode, newPassword) {
      try {
        // Find user with email and recovery code
        const userSnapshot = await this.db.ref('users').orderByChild('email').equalTo(email).once('value');
        
        let userId = null;
        let userFound = false;
        
        userSnapshot.forEach(childSnapshot => {
          const userData = childSnapshot.val();
          if (userData.recoveryCode === recoveryCode) {
            userId = childSnapshot.key;
            userFound = true;
            return true; // Break forEach loop
          }
        });
        
        if (!userFound) {
          throw new Error('Invalid email or recovery code');
        }
  
        // Sign in anonymously to be able to use resetPassword
        await this.auth.signInAnonymously();
        
        // Generate new recovery code
        const newRecoveryCode = this.generateRecoveryCode();
        
        // Update database entry with new recovery code
        await this.db.ref(`users/${userId}`).update({
          recoveryCode: newRecoveryCode
        });
        
        // Update Auth password
        // This is tricky because we need admin privileges or the user to be logged in
        // For this to work in a production app, you might need Firebase Functions
        // For now, we'll require Firebase admin to be set up separately
        
        // In a real app, you would use Firebase Functions or similar to update the password
        // For this demo, we'll just update the database
        
        return newRecoveryCode;
      } catch (error) {
        console.error('Reset password error:', error);
        throw new Error(this.getAuthErrorMessage(error));
      }
    }
  
    async updatePassword(currentPassword, newPassword) {
      try {
        if (!this.auth.currentUser) {
          throw new Error('You must be logged in to change your password');
        }
        
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
          this.auth.currentUser.email, 
          currentPassword
        );
        
        await this.auth.currentUser.reauthenticateWithCredential(credential);
        
        // Update password
        await this.auth.currentUser.updatePassword(newPassword);
        
        return true;
      } catch (error) {
        console.error('Update password error:', error);
        throw new Error(this.getAuthErrorMessage(error));
      }
    }
  
    generateRecoveryCode() {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
  
    getAuthErrorMessage(error) {
      switch (error.code) {
        case 'auth/user-not-found':
          return 'No account found with this email';
        case 'auth/wrong-password':
          return 'Incorrect password';
        case 'auth/email-already-in-use':
          return 'Email already registered';
        case 'auth/weak-password':
          return 'Password is too weak';
        case 'auth/invalid-email':
          return 'Invalid email address';
        case 'auth/requires-recent-login':
          return 'Please log in again before updating your password';
        default:
          return error.message;
      }
    }
  }
  
  /*=============== CART CONTROLLER ===============*/
  class CartController {
    constructor(firebase, userId) {
      this.firebase = firebase;
      this.db = firebase.db;
      this.userId = userId;
      this.items = [];
      this.listenToCartChanges();
    }
  
    setUserId(userId) {
      this.userId = userId;
      if (userId) {
        this.listenToCartChanges();
      } else {
        this.items = [];
      }
    }
  
    listenToCartChanges() {
        if (!this.userId) return;
        
        // Stop previous listener if exists
        if (this.cartListener) {
          this.cartListener();
        }
        
        // Set up real-time listener for cart changes
        const cartRef = this.db.ref(`carts/${this.userId}`);
        this.cartListener = cartRef.on('value', snapshot => {
          this.items = [];
          
          // Add this null check
          if (snapshot && snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
              this.items.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
              });
            });
          }
          
          // Dispatch event that cart was updated
          document.dispatchEvent(new CustomEvent('cart-updated'));
        });
      }
  
    async addItem(item) {
      if (!this.userId) {
        DOMUtils.showMessage('Please log in to add items to cart', 'error');
        return false;
      }
      
      try {
        await this.firebase.addToCart(this.userId, item);
        return true;
      } catch (error) {
        console.error('Error adding item to cart:', error);
        DOMUtils.showMessage('Failed to add item to cart', 'error');
        return false;
      }
    }
  
    async removeItem(itemId) {
      if (!this.userId) return false;
      
      try {
        await this.firebase.removeFromCart(this.userId, itemId);
        return true;
      } catch (error) {
        console.error('Error removing item from cart:', error);
        DOMUtils.showMessage('Failed to remove item from cart', 'error');
        return false;
      }
    }
  
    getTotal() {
      return this.items.reduce((sum, item) => {
        return sum + (item.price * (item.quantity || 1));
      }, 0);
    }
  
    async clearCart() {
      if (!this.userId) return false;
      
      try {
        await this.firebase.clearCart(this.userId);
        return true;
      } catch (error) {
        console.error('Error clearing cart:', error);
        return false;
      }
    }
  }
  
  /*=============== UI CONTROLLER ===============*/
  class UIController {
    constructor() {
      this.darkTheme = 'dark-theme';
      this.iconTheme = 'ri-sun-line';
      this.DEFAULT_BOOK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsQAAA7EB9YPtSQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAL5SURBVHic7d0/iBxlHMfxz+/2FEUURRRBBCsrQYV0aaKFnXZpLBQE0cLOQtBCsBLUQhC0ULAQtEqlEBHBQkguVVI8JI1/IEFQFPz3vp+12Sf3srkke8/u7Ozs8nm/YLmd3Wd3f8/3O7M7OzsDSZIkSZIkSZIkSZIk';
      
      // Initialize Firebase
      this.firebase = new FirebaseManager();
      
      // Controllers
      this.auth = new AuthController(this.firebase);
      this.cart = null;
      // Inside UIController constructor
this.auth.auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User is signed in on page load:', user.uid);
    // Update UI without full login process
    this.fetchUserAndUpdateUI(user.uid);
  } else {
    console.log('No user is signed in on page load');
    this.updateAuthUI(null);
  }
});
      // Initialize after a short delay to ensure Firebase is ready
      setTimeout(() => {
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeTheme();
        this.updateAuthUI();
        this.loadBooks();
        this.initializeSwipers();
      }, 500);
  
      // Set up auth state listener to update UI when auth state changes
      this.firebase.auth.onAuthStateChanged(user => {
        if (user) {
          if (!this.cart) {
            this.cart = new CartController(this.firebase, user.uid);
          } else {
            this.cart.setUserId(user.uid);
          }
          this.updateAuthUI();
          this.loadRecentlyViewed();
        } else {
          if (this.cart) {
            this.cart.setUserId(null);
          }
          this.updateAuthUI();
        }
      });
  
      // Listen for cart updates
      document.addEventListener('cart-updated', () => {
        this.updateCartUI();
      });
    }
  
    initializeElements() {
      // Core elements
      this.header = DOMUtils.getElement('#header', false);
      this.themeButton = DOMUtils.getElement('#theme-button', false);
      
      // Search elements
      this.searchButton = DOMUtils.getElement('#search-button', false);
      this.searchContent = DOMUtils.getElement('#search-content', false);
      this.searchClose = DOMUtils.getElement('#search-close', false);
      this.searchForm = DOMUtils.getElement('.search__form', false);
      this.searchInput = DOMUtils.getElement('.search__input', false);
  
      // Auth elements
      this.loginButton = DOMUtils.getElement('#login-button', false);
      this.loginContent = DOMUtils.getElement('#login-content', false);
      this.loginForm = DOMUtils.getElement('.login__form', false);
      this.loginClose = DOMUtils.getElement('#login-close', false);
  
      // Signup elements
      this.signupContent = DOMUtils.getElement('#signup-content', false);
      this.signupForm = DOMUtils.getElement('.signup__form', false);
      this.signupClose = DOMUtils.getElement('#signup-close', false);
      this.showSignupLink = DOMUtils.getElement('#show-signup', false);
  
      // Cart elements
      this.cartButton = DOMUtils.getElement('#cart-button', false);
      this.cartContent = DOMUtils.getElement('#cart-content', false);
  
      // Profile elements
      this.profileContent = DOMUtils.getElement('#profile-content', false);
      this.profileTabs = DOMUtils.getAllElements('.profile__tab');
    }
  
    initializeEventListeners() {
      // Auth listeners
      this.loginForm?.addEventListener('submit', e => {
        e.preventDefault();
        this.handleLogin();
      });
      
      this.signupForm?.addEventListener('submit', e => {
        e.preventDefault();
        this.handleSignup();
      });
      
      // Recovery form
      const recoveryForm = document.querySelector('.recovery__form');
      recoveryForm?.addEventListener('submit', e => {
        e.preventDefault();
        this.handlePasswordReset();
      });
      
       // Check auth state on page load
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log('User is signed in on page load');
      this.updateAuthUI();
    } else {
      console.log('No user is signed in on page load');
      this.updateAuthUI();
    }
  });
      // Password change form
      const passwordForm = document.querySelector('.profile__password-form');
      passwordForm?.addEventListener('submit', e => {
        e.preventDefault();
        this.handlePasswordUpdate();
      });
      
      // Search listeners
      this.searchButton?.addEventListener('click', () => this.showModal('search'));
      this.searchClose?.addEventListener('click', () => this.hideModal('search'));
      this.searchForm?.addEventListener('submit', e => {
        e.preventDefault();
        this.handleSearch(e);
      });
      this.searchInput?.addEventListener('input', () => this.handleSearch());
      
      // Modal close listeners
      this.loginClose?.addEventListener('click', () => this.hideModal('login'));
      this.signupClose?.addEventListener('click', () => this.hideModal('signup'));
      
      document.querySelector('.recovery__close')?.addEventListener('click', () => {
        this.hideModal('recovery');
      });
      
      document.querySelector('.profile__close')?.addEventListener('click', () => {
        document.querySelector('#profile-content')?.classList.remove('show-profile');
      });
  
      // Switch between login/signup
      this.showSignupLink?.addEventListener('click', e => {
        e.preventDefault();
        this.hideModal('login');
        this.showModal('signup');
      });
      
      document.querySelector('.switch-to-login')?.addEventListener('click', e => {
        e.preventDefault();
        this.hideModal('signup');
        this.showModal('login');
      });
      
      // Show recovery modal
      document.getElementById('show-recovery')?.addEventListener('click', e => {
        e.preventDefault();
        this.hideModal('login');
        this.showModal('recovery');
      });
  
      // Profile tab switching
      this.profileTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabId = tab.dataset.tab;
          this.switchProfileTab(tabId);
          
          if (tabId === 'admin') {
            this.loadAdminBooks();
          }
        });
      });
  
      // Add to cart and view details
      document.addEventListener('click', e => {
        // Handle add to cart
        if (e.target.matches('.add-to-cart') || e.target.closest('.add-to-cart')) {
          e.preventDefault();
          const button = e.target.matches('.add-to-cart') ? e.target : e.target.closest('.add-to-cart');
          const { bookId, bookTitle, bookPrice } = button.dataset;
          
          if (this.cart) {
            this.cart.addItem({
              id: bookId,
              title: bookTitle,
              price: parseFloat(bookPrice),
              image: button.closest('article')?.querySelector('img')?.src || null
            });
            
            DOMUtils.showMessage('Item added to cart', 'success');
          } else {
            DOMUtils.showMessage('Please log in to add items to cart', 'error');
          }
        }
        
        // Handle book details
        if (e.target.matches('.featured__actions button') || e.target.closest('.featured__actions button')) {
          e.preventDefault();
          const button = e.target.matches('button') ? e.target : e.target.closest('button');
          const article = button.closest('article');
          if (article) {
            const bookId = article.dataset.bookId;
            if (bookId) {
              this.showBookDetails(bookId);
            }
          }
        }
      });
  
      // Cart actions
      document.addEventListener('click', e => {
        if (e.target.matches('.cart-item__remove') || e.target.closest('.cart-item__remove')) {
          const cartItem = e.target.closest('.cart-item');
          if (!cartItem) return;
          
          const itemId = cartItem.dataset.itemId;
          if (confirm('Remove this item from cart?')) {
            if (this.cart) {
              this.cart.removeItem(itemId);
            }
          }
        }
      });
  
      // Add logout handler
      document.querySelector('.profile__logout')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          this.auth.logout().then(() => {
            document.querySelector('#profile-content')?.classList.remove('show-profile');
            this.updateAuthUI();
            DOMUtils.showMessage('Logged out successfully', 'info');
          }).catch(error => {
            DOMUtils.showMessage('Logout failed: ' + error.message, 'error');
          });
        }
      });
  
      // Admin handlers
      document.querySelector('.admin__add-book')?.addEventListener('click', () => {
        this.showBookForm();
      });
      
      document.getElementById('book-form')?.addEventListener('submit', e => {
        e.preventDefault();
        this.handleBookSubmit(e);
      });
      
      document.getElementById('cancel-book')?.addEventListener('click', () => {
        this.hideBookForm();
      });
      
      document.getElementById('admin-close')?.addEventListener('click', () => {
        document.getElementById('admin-panel')?.classList.remove('show-panel');
      });
      
      document.getElementById('book-image')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = e => {
            const preview = document.getElementById('image-preview');
            if (preview) {
              preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            }
          };
          reader.readAsDataURL(file);
        }
      });
  
      // Theme toggle
      this.themeButton?.addEventListener('click', () => this.toggleTheme());
  
      // Global escape key handler
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') this.hideAllModals();
      });
    }
  
    initializeTheme() {
      // Get saved preferences
      const savedTheme = localStorage.getItem('selected-theme');
      
      // Apply saved theme or default
      if (savedTheme === 'dark') {
        document.body.classList.add(this.darkTheme);
        this.themeButton?.classList.remove('ri-moon-line');
        this.themeButton?.classList.add(this.iconTheme);
      }
    }
  
    toggleTheme() {
      // Toggle body class
      document.body.classList.toggle(this.darkTheme);
      
      // Toggle icon
      const isDark = document.body.classList.contains(this.darkTheme);
      if (this.themeButton) {
        this.themeButton.className = isDark ? this.iconTheme : 'ri-moon-line';
      }
      
      // Save preference
      localStorage.setItem('selected-theme', isDark ? 'dark' : 'light');
    }
  
    initializeSwipers() {
      if (typeof Swiper !== 'undefined') {
        new Swiper('.featured__swiper', {
          loop: true,
          spaceBetween: 16,
          slidesPerView: 'auto',
          centeredSlides: true,
          grabCursor: true,
          autoplay: {
            delay: 3000,
            disableOnInteraction: false,
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }
        });
        
        new Swiper('.new__swiper', {
          loop: true,
          spaceBetween: 16,
          slidesPerView: 'auto'
        });
        
        new Swiper('.testimonial__swiper', {
          loop: true,
          spaceBetween: 16,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          breakpoints: {
            640: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
          },
        });
      }
    }
    async fetchUserAndUpdateUI(uid) {
      try {
        const userData = await this.firebase.getCurrentUserData(uid);
        if (userData) {
          this.auth.currentUser = {
            uid,
            ...userData
          };
          this.updateAuthUI(this.auth.currentUser);
        }
      } catch (error) {
        console.error('Error fetching user data on auth state change:', error);
      }
    }
    async loadBooks() {
      try {
        const books = await this.firebase.getBooks();
        
        if (books.length === 0) {
          // Create default books if none exist
          const defaultBooks = [
            {
              title: 'The Perfect Book',
              genre: 'Fiction',
              price: 29.99,
              discountPrice: 14.99,
              description: 'A sample book description',
              image: 'assets/img/book-1.png',
            },
            {
              title: 'Mystery Novel',
              genre: 'Mystery',
              price: 34.99,
              discountPrice: 19.99,
              description: 'Another sample book description',
              image: 'assets/img/book-2.png',
            }
          ];
          
          for (const book of defaultBooks) {
            await this.firebase.saveBook(book);
          }
          
          // Load books again
          return this.loadBooks();
        }
        
        this.updateBookDisplays(books);
        return books;
      } catch (error) {
        console.error('Error loading books:', error);
        DOMUtils.showMessage('Failed to load books', 'error');
        return [];
      }
    }
  
    async loadAdminBooks() {
      try {
        const books = await this.firebase.getBooks();
        const container = document.querySelector('.admin__book-list');
        
        if (!container) return;
        
        if (books.length === 0) {
          container.innerHTML = '<p class="admin__no-books">No books added yet</p>';
          return;
        }
        
        container.innerHTML = books.map(book => `
          <div class="admin__book-item" data-book-id="${book.id}">
            <img src="${book.image || 'assets/img/default-book.png'}" alt="${book.title}" class="admin__book-cover">
            <div class="admin__book-info">
              <h3 class="admin__book-title">${book.title}</h3>
              <span class="admin__book-genre">${book.genre || 'General'}</span>
              <div class="admin__book-price">
                ${book.discountPrice ? 
                  `<span class="discount">$${book.discountPrice}</span>
                  <span class="original">$${book.price}</span>` : 
                  `<span class="price">$${book.price}</span>`
                }
              </div>
              <p class="admin__book-desc">${book.description || 'No description available'}</p>
            </div>
            <div class="admin__book-actions">
              <button class="button edit-book" onclick="app.editBook('${book.id}')">
                <i class="ri-edit-line"></i>
              </button>
              <button class="button button--ghost delete-book" onclick="app.deleteBook('${book.id}')">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
        `).join('');
      } catch (error) {
        console.error('Error loading admin books:', error);
        DOMUtils.showMessage('Failed to load books', 'error');
      }
    }
  
    updateBookDisplays(books) {
      if (!books) return;
      
      // Map books with default image fallback
      const booksWithImages = books.map(book => ({
        ...book,
        image: book.image || this.DEFAULT_BOOK_IMAGE
      }));
      
      this.updateFeaturedBooks(booksWithImages);
      this.updateNewBooks(booksWithImages);
    }
  
    updateFeaturedBooks(books) {
      const container = document.getElementById('featured-books');
      if (!container) return;
  
      container.innerHTML = books.map(book => `
        <article class="featured__card swiper-slide" data-book-id="${book.id}">
          <img src="${book.image}" alt="${book.title}" class="featured__img">
          <h2 class="featured__title">${book.title}</h2>
          <div class="featured__prices">
            ${book.discountPrice ? 
              `<span class="featured__discount">$${book.discountPrice}</span>
               <span class="featured__price">$${book.price}</span>` :
              `<span class="featured__discount">$${book.price}</span>`
            }
          </div>
          <button class="button add-to-cart" 
                  data-book-id="${book.id}"
                  data-book-title="${book.title}"
                  data-book-price="${book.discountPrice || book.price}">
            Add To Cart
          </button>
          <div class="featured__actions">
            <button onclick="app.showBookDetails('${book.id}')">
              <i class="ri-eye-line"></i>
            </button>
            <button class="add-to-wishlist" data-book-id="${book.id}">
              <i class="ri-heart-3-line"></i>
            </button>
          </div>
        </article>
      `).join('');
    }
  
    updateNewBooks(books) {
      const container = document.getElementById('new-books');
      if (!container) return;
  
      // Sort by addedAt to get newest books
      const sortedBooks = [...books].sort((a, b) => {
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      }).slice(0, 10);
  
      container.innerHTML = sortedBooks.map(book => `
        <a href="#" class="new__card swiper-slide" onclick="app.showBookDetails('${book.id}'); return false;" data-book-id="${book.id}">
          <img src="${book.image}" alt="${book.title}" class="new__img">
          <div>
            <h2 class="new__title">${book.title}</h2>
            <div class="new__prices">
              ${book.discountPrice ? 
                `<span class="new__discount">$${book.discountPrice}</span>
                 <span class="new__price">$${book.price}</span>` :
                `<span class="new__discount">$${book.price}</span>`
              }
            </div>
            <div class="new__stars">
              <i class="ri-star-fill"></i>
              <i class="ri-star-fill"></i>
              <i class="ri-star-fill"></i>
              <i class="ri-star-fill"></i>
              <i class="ri-star-half-fill"></i>
            </div>
          </div>
        </a>
      `).join('');
    }
  
    async showBookDetails(bookId) {
      try {
        // Get book from Firebase
        const snapshot = await this.firebase.db.ref(`books/${bookId}`).once('value');
        const book = snapshot.val();
        
        if (!book) return;
        
        // Add book to recently viewed if user is logged in
        if (this.auth.currentUser) {
          this.firebase.addToRecentlyViewed(this.auth.currentUser.uid, {
            id: bookId,
            title: book.title,
            price: book.price,
            discountPrice: book.discountPrice,
            image: book.image
          });
        }
  
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'book-details-modal';
        modal.innerHTML = `
          <div class="book-details__content">
            <img src="${book.image || 'assets/img/default-book.png'}" alt="${book.title}" class="book-details__img">
            <h2 class="book-details__title">${book.title}</h2>
            <span class="book-details__genre">${book.genre || 'General'}</span>
            <p class="book-details__description">${book.description || 'No description available.'}</p>
            <div class="book-details__prices">
              ${book.discountPrice ? 
                `<span class="book-details__discount">$${book.discountPrice}</span>
                 <span class="book-details__price">$${book.price}</span>` :
                `<span class="book-details__price">$${book.price}</span>`
              }
            </div>
            <button class="button add-to-cart"
                    data-book-id="${bookId}"
                    data-book-title="${book.title}"
                    data-book-price="${book.discountPrice || book.price}">
              Add To Cart
            </button>
            <a href="reader.html?id=${bookId}" class="button button--ghost" style="margin-top: 1rem;">
              <i class="ri-book-open-line"></i> Read Sample
            </a>
            <i class="ri-close-line book-details__close"></i>
          </div>
        `;
  
        document.body.appendChild(modal);
        
        // Add close handler
        modal.querySelector('.book-details__close').onclick = () => {
          modal.remove();
        };
      } catch (error) {
        console.error('Error showing book details:', error);
        DOMUtils.showMessage('Failed to load book details', 'error');
      }
    }
  
    async loadRecentlyViewed() {
      if (!this.auth.currentUser) return;
      
      try {
        const recentlyViewed = await this.firebase.getRecentlyViewed(this.auth.currentUser.uid);
        const container = document.getElementById('history-content');
        if (!container) return;
        
        const historyList = container.querySelector('.profile__history');
        if (!historyList) return;
        
        if (recentlyViewed.length === 0) {
          historyList.innerHTML = `
            <div class="history-empty">
              <i class="ri-history-line"></i>
              <p>No recently viewed items</p>
            </div>
          `;
        } else {
          historyList.innerHTML = recentlyViewed.map(book => `
            <div class="history-item">
              <img src="${book.image || 'assets/img/default-book.png'}" alt="${book.title}" class="history-item__img">
              <div class="history-item__info">
                <h3 class="history-item__title">${book.title}</h3>
                <span class="history-item__price">$${book.discountPrice || book.price}</span>
                <span class="history-item__date">Viewed: ${new Date(book.viewedAt).toLocaleDateString()}</span>
              </div>
              <button class="button" onclick="app.showBookDetails('${book.id}')">
                <i class="ri-eye-line"></i>
              </button>
            </div>
          `).join('');
        }
      } catch (error) {
        console.error('Error loading recently viewed:', error);
      }
    }
  
    updateCartUI() {
        const cartList = this.cartContent?.querySelector('.profile__cart');
        if (!cartList || !this.cart) return;
        
        if (this.cart.items.length === 0) {
          cartList.innerHTML = `
            <div class="cart-empty">
              <i class="ri-shopping-cart-line"></i>
              <p>Your cart is empty</p>
            </div>
            <div class="cart-total">
              <span>Total:</span>
              <span class="cart__total">$0.00</span>
            </div>
          `;
        } else {
          cartList.innerHTML = `
            ${this.cart.items.map(item => `
              <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image || this.DEFAULT_BOOK_IMAGE}" alt="${item.title}" class="cart-item__img">
                <div class="cart-item__info">
                  <h3 class="cart-item__title">${item.title}</h3>
                  <span class="cart-item__price">$${item.price}</span>
                  <span class="cart-item__quantity">Quantity: ${item.quantity || 1}</span>
                </div>
                <button class="cart-item__remove">
                  <i class="ri-delete-bin-line"></i>
                </button>
              </div>
            `).join('')}
            <div class="cart-total">
              <span>Total:</span>
              <span class="cart__total">$${this.cart.getTotal().toFixed(2)}</span>
            </div>
            <button class="button checkout-btn">Proceed to Checkout</button>
          `;
        
        // Add event listener to the checkout button
        const checkoutBtn = cartList.querySelector('.checkout-btn');
        if (checkoutBtn) {
          checkoutBtn.addEventListener('click', () => {
            const checkout = document.getElementById('checkout-content');
            if (checkout) {
              checkout.classList.add('show-checkout');
              // Load checkout items
              this.loadCheckoutItems();
            }
          });
        }
      }
    }
  
    loadCheckoutItems() {
      if (!this.cart) return;
      
      const checkoutSummary = document.querySelector('.checkout__summary');
      if (!checkoutSummary) return;
      
      if (this.cart.items.length === 0) {
        checkoutSummary.innerHTML = `
          <div class="checkout__empty">
            <i class="ri-shopping-cart-line"></i>
            <p>Your cart is empty</p>
          </div>
        `;
        return;
      }
      
      checkoutSummary.innerHTML = `
        <h4 class="checkout__subtitle">Your Items</h4>
        <div class="checkout__items">
          ${this.cart.items.map(item => `
            <div class="checkout__item">
              <img src="${item.image || 'assets/img/default-book.png'}" alt="${item.title}" class="checkout__item-img">
              <div class="checkout__item-info">
                <h3 class="checkout__item-title">${item.title}</h3>
                <span class="checkout__item-price">$${item.price}</span>
                <span class="checkout__item-quantity">Quantity: ${item.quantity || 1}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="checkout__total">
          <span>Total:</span>
          <span class="checkout__total-price">$${this.cart.getTotal().toFixed(2)}</span>
        </div>
      `;
    }
  
    handleSearch() {
      const query = this.searchInput?.value.toLowerCase().trim();
      const searchResults = document.querySelector('.search__results');
      
      if (!query || !searchResults) {
        if (searchResults) {
          searchResults.innerHTML = `
            <div class="search__empty">
              <i class="ri-search-line"></i>
              <p>Type something to search</p>
            </div>
          `;
        }
        return;
      }
      
      // Search in Firebase
      this.firebase.db.ref('books').orderByChild('title').once('value', snapshot => {
        const results = [];
        
        snapshot.forEach(childSnapshot => {
          const book = childSnapshot.val();
          book.id = childSnapshot.key;
          
          if (book.title.toLowerCase().includes(query) || 
              (book.description && book.description.toLowerCase().includes(query)) ||
              (book.genre && book.genre.toLowerCase().includes(query))) {
            results.push(book);
          }
        });
        
        if (results.length === 0) {
          searchResults.innerHTML = `
            <div class="search__empty">
              <i class="ri-error-warning-line"></i>
              <p>No results found</p>
            </div>
          `;
          return;
        }
        
        searchResults.innerHTML = `
          <div class="search__grid">
            ${results.map(book => `
              <article class="search__card" onclick="app.showBookDetails('${book.id}')">
                <img src="${book.image || 'assets/img/default-book.png'}" alt="${book.title}" class="search__img">
                <div class="search__data">
                  <h3 class="search__title">${book.title}</h3>
                  <span class="search__genre">${book.genre || 'General'}</span>
                  <span class="search__price">$${book.discountPrice || book.price}</span>
                </div>
              </article>
            `).join('')}
          </div>
        `;
      });
    }
  
    switchProfileTab(tabId) {
      // Get all tabs and contents safely
      const allTabs = Array.from(document.querySelectorAll('.profile__tab'));
      const allContents = Array.from(document.querySelectorAll('.profile__content'));
      
      if (!allTabs.length || !allContents.length) {
        console.warn('No tabs or content found');
        return;
      }
      
      // Remove active class from all tabs and contents
      allTabs.forEach(tab => {
        tab.classList?.remove('active');
        const content = document.getElementById(`${tab.dataset.tab}-content`);
        if (content) {
          content.classList.remove('active');
          content.classList.remove('fade-in');
        }
      });
  
      // Add active class to selected tab and content
      const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
      const selectedContent = document.getElementById(`${tabId}-content`);
      
      if (selectedTab && selectedContent) {
        selectedTab.classList.add('active');
        selectedContent.classList.add('active', 'fade-in');
        
        // Load books if admin tab
        if (tabId === 'admin') {
          this.loadAdminBooks();
        }
        
        // Update cart UI if cart tab
        if (tabId === 'cart') {
          this.updateCartUI();
        }
        
        // Load recently viewed if history tab
        if (tabId === 'history') {
          this.loadRecentlyViewed();
        }
      }
    }
  
    showModal(type) {
      const modal = document.getElementById(`${type}-content`);
      if (modal) {
        modal.classList.add(`show-${type}`);
      }
    }
  
    hideModal(type) {
      const modal = document.getElementById(`${type}-content`);
      if (modal) {
        modal.classList.remove(`show-${type}`);
      }
    }
  
    hideAllModals() {
        const modals = ['login', 'signup', 'profile', 'book-form', 'recovery', 'checkout'];
        modals.forEach(type => {
          this.hideModal(type);
        });
        
        // Also hide any book-details modal
        const detailsModal = document.querySelector('.book-details-modal');
        if (detailsModal) {
          detailsModal.remove();
        }
      }
  
    showBookForm(bookData = null) {
      const modal = document.getElementById('book-form-modal');
      const form = document.getElementById('book-form');
      
      if (!modal || !form) return;
      
      // Reset the form and preview
      form.reset();
      const preview = document.getElementById('image-preview');
      if (preview) {
        preview.innerHTML = '';
      }
      
      if (bookData) {
        // Fill form for editing
        form.elements['book-title'].value = bookData.title || '';
        form.elements['book-genre'].value = bookData.genre || '';
        form.elements['book-price'].value = bookData.price || '';
        form.elements['book-discount'].value = bookData.discountPrice || '';
        form.elements['book-description'].value = bookData.description || '';
        
        // Set data-edit-id attribute for later use
        form.dataset.editId = bookData.id;
        
        // Show image preview
        if (bookData.image && preview) {
          preview.innerHTML = `<img src="${bookData.image}" alt="Preview">`;
        }
      } else {
        // Clear edit ID
        delete form.dataset.editId;
      }
      
      modal.classList.add('show-modal');
    }
  
    hideBookForm() {
      const modal = document.getElementById('book-form-modal');
      if (modal) {
        modal.classList.remove('show-modal');
      }
    }
  
    async editBook(bookId) {
      try {
        const snapshot = await this.firebase.db.ref(`books/${bookId}`).once('value');
        const book = snapshot.val();
        if (book) {
          book.id = bookId;
          this.showBookForm(book);
        }
      } catch (error) {
        console.error('Error getting book for editing:', error);
        DOMUtils.showMessage('Failed to load book', 'error');
      }
    }
  
    async deleteBook(bookId) {
      if (confirm('Are you sure you want to delete this book?')) {
        try {
          await this.firebase.deleteBook(bookId);
          DOMUtils.showMessage('Book deleted successfully', 'success');
          
          // Reload books
          this.loadAdminBooks();
          this.loadBooks();
        } catch (error) {
          console.error('Error deleting book:', error);
          DOMUtils.showMessage('Failed to delete book', 'error');
        }
      }
    }
  
    async handleBookSubmit(e) {
      const form = e.target;
      const bookId = form.dataset.editId;
      
      try {
        // Get image file
        const imageFile = form.elements['book-image'].files[0];
        let imageUrl = null;
        
        if (imageFile) {
          // Convert image to data URL
          imageUrl = await this.handleImageUpload(imageFile);
        } else if (bookId) {
          // If editing and no new image provided, keep existing image
          const snapshot = await this.firebase.db.ref(`books/${bookId}`).once('value');
          imageUrl = snapshot.val()?.image || null;
        }
        
        // Prepare book data
        const bookData = {
          title: form.elements['book-title'].value,
          genre: form.elements['book-genre'].value,
          price: parseFloat(form.elements['book-price'].value) || 0,
          discountPrice: parseFloat(form.elements['book-discount'].value) || null,
          description: form.elements['book-description'].value,
          image: imageUrl,
          addedAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        if (bookId) {
          // Update existing book
          bookData.id = bookId;
          await this.firebase.saveBook(bookData);
        } else {
          // Add new book
          await this.firebase.saveBook(bookData);
        }
        
        // Reset form and close modal
        form.reset();
        this.hideBookForm();
        
        // Reload books
        this.loadAdminBooks();
        this.loadBooks();
        
        DOMUtils.showMessage('Book saved successfully', 'success');
      } catch (error) {
        console.error('Error saving book:', error);
        DOMUtils.showMessage('Failed to save book', 'error');
      }
    }
  
    async handleImageUpload(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          resolve(e.target.result);
        };
        reader.onerror = e => {
          reject(e);
        };
        reader.readAsDataURL(file);
      });
    }
  
    updateAuthUI() {
        if (!this.loginButton) return;
        
        const user = this.auth.currentUser;
        console.log('Updating UI with user:', user); // Add this debug line
        
        if (user) {
          // Update login button
          this.loginButton.innerHTML = `<i class="ri-user-line"></i> ${user.name || 'User'}`;
          this.loginButton.onclick = () => {
            // Show profile immediately when clicked
            if (this.profileContent) {
              this.profileContent.classList.add('show-profile');
              
              // Update profile info fields
              const profileName = document.getElementById('profile-name');
              const profileEmail = document.getElementById('profile-email');
              
              if (profileName && profileEmail) {
                profileName.value = user.name || '';
                profileEmail.value = user.email || '';
              }
              
              // Show admin panel if admin
              if (user.isAdmin) {
                const adminTab = document.querySelector('[data-tab="admin"]');
                if (adminTab) adminTab.style.display = 'block';
                
                // Also show admin panel
                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) {
                  adminPanel.classList.add('show-panel');
                  this.loadAdminBooks();
                }
              }
            }
          };
        } else {
        // Update for logged out state
        this.loginButton.innerHTML = `<i class="ri-user-line"></i>`;
        this.loginButton.onclick = () => this.showModal('login');
        
        // Hide admin tab if it exists
        const adminTab = document.querySelector('[data-tab="admin"]');
        if (adminTab) {
          adminTab.style.display = 'none';
        }
      }
    }
  
async handleLogin() {
  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const rememberMeCheckbox = document.getElementById('remember-me');
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
    
    console.log('Login attempt with:', email, 'Remember Me:', rememberMe);
    
    if (!email || !password) {
      DOMUtils.showMessage('Please enter both email and password', 'error');
      return;
    }
    
    const user = await this.auth.login(email, password, rememberMe);
    console.log('Login successful, user data:', user);
    
    // Success
    DOMUtils.showMessage(`Welcome, ${user.name || 'User'}!`, 'success');
    this.hideModal('login');
    this.updateAuthUI();
    
    // Reset form (but preserve remember me state)
    document.getElementById('login-email').value = '';
    document.getElementById('login-pass').value = '';
    
    return user;
  } catch (error) {
    console.error('Detailed login error:', error);
    DOMUtils.showMessage(error.message, 'error');
    return null;
  }
}
  
    async handleSignup() {
      try {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-pass').value;
        const confirm = document.getElementById('signup-confirm').value;
        
        if (!name || !email || !password || !confirm) {
          DOMUtils.showMessage('Please fill in all fields', 'error');
          return;
        }
        
        if (password !== confirm) {
          DOMUtils.showMessage('Passwords do not match', 'error');
          return;
        }
        
        if (password.length < 6) {
          DOMUtils.showMessage('Password must be at least 6 characters', 'error');
          return;
        }
        
        const recoveryCode = await this.auth.signup({
          name,
          email,
          password
        });
        
        // Show recovery code in alert
        alert(`Please save this recovery code: ${recoveryCode}\nYou will need it to reset your password if you forget it.`);
        
        // Success
        DOMUtils.showMessage('Account created successfully! Please log in.', 'success');
        this.hideModal('signup');
        this.showModal('login');
        
        // Reset form
        document.getElementById('signup-name').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-pass').value = '';
        document.getElementById('signup-confirm').value = '';
      } catch (error) {
        DOMUtils.showMessage(error.message, 'error');
      }
    }
  
    async handlePasswordReset() {
      try {
        const email = document.getElementById('recovery-email').value;
        const code = document.getElementById('recovery-code').value;
        const newPassword = document.getElementById('recovery-new-pass').value;
        
        if (!email || !code || !newPassword) {
          DOMUtils.showMessage('Please fill in all fields', 'error');
          return;
        }
        
        if (newPassword.length < 6) {
          DOMUtils.showMessage('Password must be at least 6 characters', 'error');
          return;
        }
        
        const newCode = await this.auth.resetPassword(email, code, newPassword);
        
        // Show new recovery code in alert
        alert(`Your password has been reset.\nYour new recovery code is: ${newCode}`);
        
        // Success
        DOMUtils.showMessage('Password reset successfully! Please log in.', 'success');
        this.hideModal('recovery');
        this.showModal('login');
        
        // Reset form
        document.getElementById('recovery-email').value = '';
        document.getElementById('recovery-code').value = '';
        document.getElementById('recovery-new-pass').value = '';
      } catch (error) {
        DOMUtils.showMessage(error.message, 'error');
      }
    }
  
    async handlePasswordUpdate() {
      try {
        const currentPass = document.getElementById('current-pass').value;
        const newPass = document.getElementById('new-pass').value;
        const confirmPass = document.getElementById('confirm-pass').value;
        
        if (!currentPass || !newPass || !confirmPass) {
          DOMUtils.showMessage('Please fill in all fields', 'error');
          return;
        }
        
        if (newPass !== confirmPass) {
          DOMUtils.showMessage('New passwords do not match', 'error');
          return;
        }
        
        if (newPass.length < 6) {
          DOMUtils.showMessage('Password must be at least 6 characters', 'error');
          return;
        }
        
        await this.auth.updatePassword(currentPass, newPass);
        
        // Success
        DOMUtils.showMessage('Password updated successfully', 'success');
        
        // Reset form
        document.getElementById('current-pass').value = '';
        document.getElementById('new-pass').value = '';
        document.getElementById('confirm-pass').value = '';
      } catch (error) {
        DOMUtils.showMessage(error.message, 'error');
      }
    }
  }
  
  // Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    try {
      window.app = new UIController();
      console.log('Application initialized successfully');
      
      // Initialize checkout handlers after app is initialized
      initCheckoutHandlers();
    } catch (error) {
      console.error('Initialization error:', error);
      if (typeof DOMUtils !== 'undefined') {
        DOMUtils.showMessage('Failed to initialize application', 'error');
      } else {
        alert('Failed to initialize application: ' + error.message);
      }
    }
  });
  
  // Initialize checkout handlers
  function initCheckoutHandlers() {
    const checkout = document.getElementById('checkout-content');
    const checkoutClose = document.getElementById('checkout-close');
    const continueButton = document.getElementById('continue-shopping');
    const checkoutTabs = document.querySelectorAll('.checkout__tab');
    const placeOrderButton = document.getElementById('place-order');
    
    // Close checkout
    if (checkoutClose) {
      checkoutClose.addEventListener('click', () => {
        checkout?.classList.remove('show-checkout');
      });
    }
    
    // Continue shopping
    if (continueButton) {
      continueButton.addEventListener('click', () => {
        checkout?.classList.remove('show-checkout');
      });
    }
    
    // Switch checkout tabs
    if (checkoutTabs.length) {
      checkoutTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabId = tab.dataset.tab;
          
          // Remove active class from all tabs and contents
          checkoutTabs.forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.checkout__content').forEach(c => c.classList.remove('active'));
          
          // Add active class to current tab and content
          tab.classList.add('active');
          document.getElementById(`${tabId}-checkout`)?.classList.add('active');
        });
      });
    }
    
    // Place order
    if (placeOrderButton) {
      placeOrderButton.addEventListener('click', () => {
        // Validate form
        const form = document.getElementById('checkout-form');
        if (!form) return;
        
        if (form.checkValidity()) {
          // Show success message
          const orderMessage = document.createElement('div');
          orderMessage.className = 'order-success';
          orderMessage.innerHTML = `
            <i class="ri-check-line"></i>
            <h3>Order Placed Successfully!</h3>
            <p>Thank you for your purchase.</p>
            <p>Your order number is: ORD-${Math.floor(Math.random() * 10000)}</p>
            <button class="button" id="close-order-message">Continue</button>
          `;
          
          document.body.appendChild(orderMessage);
          
          // Add close handler
          document.getElementById('close-order-message')?.addEventListener('click', () => {
            orderMessage.remove();
            checkout?.classList.remove('show-checkout');
            
            // Clear cart if user is logged in
            if (window.app && window.app.cart) {
              window.app.cart.clearCart();
            }
          });
        } else {
          // Show validation message
          form.reportValidity();
        }
      });
    }
  }
  
  // Show checkout function
  function showCheckout() {
    const checkout = document.getElementById('checkout-content');
    if (checkout) {
      checkout.classList.add('show-checkout');
    }
  }
  
  // Add a style element for toast and order success
  const style = document.createElement('style');
  style.textContent = `
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 80%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  .toast.show {
    transform: translateX(0);
  }
  .toast--success { background-color: #4caf50; }
  .toast--error { background-color: #f44336; }
  .toast--info { background-color: #2196f3; }
  
  .order-success {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    text-align: center;
    z-index: 2000;
    max-width: 90%;
    width: 400px;
  }
  
  .order-success i {
    font-size: 3rem;
    color: #4caf50;
    margin-bottom: 1rem;
  }
  
  .order-success h3 {
    margin-bottom: 0.5rem;
  }
  
  .order-success p {
    margin-bottom: 1rem;
    color: #666;
  }
  
  .order-success button {
    margin-top: 1rem;
  }
  
  @media screen and (max-width: 576px) {
    .order-success {
      width: 90%;
      padding: 1.5rem;
    }
  }
  `;
  document.head.appendChild(style);
  