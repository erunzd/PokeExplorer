// src/config/firebaseConfig.js

import firebase from '@react-native-firebase/app';
// import '@react-native-firebase/database'; // <-- REMOVE
import '@react-native-firebase/firestore'; // <-- ADD

// ... firebaseConfig object (remains the same) ...

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 🚨 EXPORT THE FIRESTORE INSTANCE 🚨
export const firestore = firebase.firestore();

export default firebase;