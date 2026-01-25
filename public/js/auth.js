/**
 * auth.js
 * Authentication logic for GitWars Portal
 * 
 * Handles user login by querying Firestore users collection
 * and managing session creation.
 */

import { db, collection, query, where, getDocs } from "./firebase.js";
import { saveSession, redirectToDashboard, isLoggedIn } from "./utils.js";

/**
 * Authenticate user against Firestore users collection
 * @param {string} username - The entered username
 * @param {string} password - The entered password
 * @returns {Object} - Result object with success status and user data or error message
 */
export async function authenticateUser(username, password) {
    try {
        // Query Firestore for matching username
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        
        // Check if user exists
        if (querySnapshot.empty) {
            return {
                success: false,
                error: "Invalid username or password."
            };
        }
        
        // Get user document
        let userData = null;
        querySnapshot.forEach((doc) => {
            userData = { id: doc.id, ...doc.data() };
        });
        
        // Verify password
        if (userData.password !== password) {
            return {
                success: false,
                error: "Invalid username or password."
            };
        }
        
        // Return successful authentication
        return {
            success: true,
            user: {
                username: userData.username,
                role: userData.role
            }
        };
        
    } catch (error) {
        console.error("Authentication error:", error);
        return {
            success: false,
            error: "An error occurred during login. Please try again."
        };
    }
}

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
export async function handleLogin(event) {
    event.preventDefault();
    
    // Get form elements
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("error-message");
    const loginBtn = document.getElementById("login-btn");
    
    // Get input values
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    // Validate inputs
    if (!username || !password) {
        errorMessage.textContent = "Please enter both username and password.";
        errorMessage.classList.add("visible");
        return;
    }
    
    // Disable button during authentication
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    errorMessage.classList.remove("visible");
    
    // Attempt authentication
    const result = await authenticateUser(username, password);
    
    if (result.success) {
        // Save session and redirect
        saveSession(result.user.username, result.user.role);
        redirectToDashboard();
    } else {
        // Show error message
        errorMessage.textContent = result.error;
        errorMessage.classList.add("visible");
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
}

/**
 * Initialize login page
 * Sets up event listeners and checks for existing session
 */
export function initLoginPage() {
    // If already logged in, redirect to dashboard
    if (isLoggedIn()) {
        redirectToDashboard();
        return;
    }
    
    // Set up form submission handler
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
    
    console.log("Login page initialized.");
}
