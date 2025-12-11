// src/config/firebaseConfig.js

import firebase from '@react-native-firebase/app';
import '@react-native-firebase/firestore';
import '@react-native-firebase/storage'; // Added for completeness, matching GlobalScreen.js usage

// --- NOTE: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyCfcUPBvpaSDnmz28lViXa0_sjRzA8jzyQ",
    authDomain: "pokeexplorer-4ca50.firebaseapp.com",
    projectId: "pokeexplorer-4ca50",
    storageBucket: "pokeexplorer-4ca50.firebasestorage.app",
    messagingSenderId: "739285685456",
    appId: "1:739285685456:android:9e933d607c722a4473fad5",
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
    // If you are using auto-initialization via google-services.json/plist,
    // this block might be empty, or you use firebase.initializeApp(firebaseConfig)
    // if you need custom config. Assuming you need custom config here:
    firebase.initializeApp(firebaseConfig);
}

// 🚨 FIX: EXPORT THE FIRESTORE AND STORAGE INSTANCE FUNCTIONS 🚨
// Calling .firestore() and .storage() returns the initialized service functions.
export const firestore = firebase.firestore; // NOTE: @react-native-firebase often exports the service function directly
export const storage = firebase.storage;

export default firebase;