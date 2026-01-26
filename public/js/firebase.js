/**
 * firebase.js
 * Firebase configuration and initialization
 * 
 * This file sets up the Firebase connection and exports
 * the Firestore database instance for use throughout the app.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    addDoc,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBWgGAxPX2Mi0n6jAZNHBiUQtfQD8TtsDE",
    authDomain: "gitwars-portal.firebaseapp.com",
    projectId: "gitwars-portal",
    storageBucket: "gitwars-portal.firebasestorage.app",
    messagingSenderId: "732179610032",
    appId: "1:732179610032:web:7927291099ea86f0c53e75",
    measurementId: "G-DN1B76936X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

console.log("Firebase initialized successfully.");

// Export database and Firestore utilities
export { db, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, doc, updateDoc, getDoc };
