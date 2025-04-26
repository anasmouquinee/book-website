/**
 * Firebase configuration for the book website
 * Centralizes Firebase setup to avoid duplication
 */

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
function initializeFirebase() {
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
    
    return {
      auth: firebase.auth(),
      db: firebase.database()
    };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return null;
  }
}

// Create Firebase services
const firebaseServices = initializeFirebase();

// Make services available globally
if (typeof window !== 'undefined') {
  window.firebaseServices = firebaseServices;
  console.log('Firebase services exported to window.firebaseServices');
}