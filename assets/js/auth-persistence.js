/**
 * Firebase Auth Persistence Handler
 * This file handles persistence settings for Firebase Auth
 */

// Initialize auth persistence based on user preferences
(function() {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined' || !firebase.auth) {
      console.error('Firebase Auth SDK not loaded');
      return;
    }
    
    try {
      // Get saved preference from localStorage
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      
      // Set appropriate persistence
      const persistenceType = rememberMe ? 
        firebase.auth.Auth.Persistence.LOCAL : 
        firebase.auth.Auth.Persistence.SESSION;
      
      // Apply persistence setting
      firebase.auth().setPersistence(persistenceType)
        .then(() => {
          console.log(`Firebase auth persistence set to ${rememberMe ? 'LOCAL' : 'SESSION'}`);
        })
        .catch((error) => {
          console.error('Error setting auth persistence:', error);
        });
    } catch (error) {
      console.error('Error in auth persistence handler:', error);
    }
  })();