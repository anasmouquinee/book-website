/**
 * Firebase configuration for the book website
 */

// Firebase configuration
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

// Initialize Firebase if not already initialized
async function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK is not loaded. Make sure to include Firebase scripts.');
    return null;
  }
  
  try {
    // Check if firebase is already initialized
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
    } else {
      console.log('Using existing Firebase instance');
    }
    
    // Check if user has selected "Remember Me" previously
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    // Set persistence based on stored preference
    if (rememberMe) {
      try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('Firebase persistence set to LOCAL');
      } catch (persistenceError) {
        console.error('Error setting persistence:', persistenceError);
      }
    } else {
      try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
        console.log('Firebase persistence set to SESSION');
      } catch (persistenceError) {
        console.error('Error setting persistence:', persistenceError);
      }
    }
    
    // Set up Firebase services
    const services = {
      auth: firebase.auth(),
      db: firebase.database()
    };
    
    // Make services available globally
    window.firebaseServices = services;
    
    return services;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return null;
  }
}

// Initialize Firebase
(async function() {
  try {
    const firebaseServices = await initializeFirebase();
    if (firebaseServices) {
      console.log('Firebase services ready');
    }
  } catch (error) {
    console.error('Error during Firebase initialization:', error);
  }
})();