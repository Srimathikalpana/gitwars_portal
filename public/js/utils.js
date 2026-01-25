/**
 * utils.js
 * Utility functions for session management and page protection
 * 
 * Handles localStorage operations for user session data
 * and provides page access control functions.
 */

// Session storage keys
const SESSION_KEYS = {
    USERNAME: "gitwars_username",
    ROLE: "gitwars_role"
};

/**
 * Save user session to localStorage
 * @param {string} username - The logged-in user's username
 * @param {string} role - The user's role (ADMIN or PUBLIC)
 */
export function saveSession(username, role) {
    localStorage.setItem(SESSION_KEYS.USERNAME, username);
    localStorage.setItem(SESSION_KEYS.ROLE, role);
    console.log(`Session saved: ${username} (${role})`);
}

/**
 * Get current session data from localStorage
 * @returns {Object|null} - Session object with username and role, or null if not logged in
 */
export function getSession() {
    const username = localStorage.getItem(SESSION_KEYS.USERNAME);
    const role = localStorage.getItem(SESSION_KEYS.ROLE);
    
    if (username && role) {
        return { username, role };
    }
    return null;
}

/**
 * Clear session data from localStorage (logout)
 */
export function clearSession() {
    localStorage.removeItem(SESSION_KEYS.USERNAME);
    localStorage.removeItem(SESSION_KEYS.ROLE);
    console.log("Session cleared.");
}

/**
 * Check if user is logged in
 * @returns {boolean} - True if user has an active session
 */
export function isLoggedIn() {
    return getSession() !== null;
}

/**
 * Get the current user's role
 * @returns {string|null} - User role or null if not logged in
 */
export function getUserRole() {
    const session = getSession();
    return session ? session.role : null;
}

/**
 * Get the current user's username
 * @returns {string|null} - Username or null if not logged in
 */
export function getUsername() {
    const session = getSession();
    return session ? session.username : null;
}

/**
 * Protect a page by required role
 * Redirects to login if user doesn't have the required role
 * @param {string} requiredRole - The role required to access the page (ADMIN or PUBLIC)
 */
export function protectPage(requiredRole) {
    const session = getSession();
    
    // If no session, redirect to login
    if (!session) {
        console.log("No session found. Redirecting to login.");
        window.location.href = "login.html";
        return false;
    }
    
    // If role doesn't match, redirect to login
    if (session.role !== requiredRole) {
        console.log(`Role mismatch. Required: ${requiredRole}, Found: ${session.role}`);
        window.location.href = "login.html";
        return false;
    }
    
    console.log(`Page access granted for ${session.username} (${session.role})`);
    return true;
}

/**
 * Redirect user to their appropriate dashboard based on role
 */
export function redirectToDashboard() {
    const role = getUserRole();
    
    if (role === "ADMIN") {
        window.location.href = "admin.html";
    } else if (role === "PUBLIC") {
        window.location.href = "public.html";
    } else {
        window.location.href = "login.html";
    }
}
