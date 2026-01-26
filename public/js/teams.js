/**
 * teams.js
 * Team management logic for GitWars Portal
 * 
 * Handles team creation, validation, and real-time updates.
 * Only accessible to ADMIN users.
 */

import { 
    db, 
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
} from "./firebase.js";

// Module state
let allTeams = [];
let unsubscribeTeams = null;

/**
 * Get the next available team number
 * @returns {Promise<number>} - The next team number
 */
async function getNextTeamNumber() {
    if (allTeams.length === 0) {
        return 1;
    }
    
    // Find the highest team number and add 1
    const maxNumber = Math.max(...allTeams.map(team => team.teamNumber || 0));
    return maxNumber + 1;
}

/**
 * Check if a team name already exists in Firestore (case-insensitive)
 * @param {string} teamName - The team name to check
 * @returns {Promise<boolean>} - True if name exists, false otherwise
 */
export async function checkTeamNameExists(teamName) {
    try {
        const teamsRef = collection(db, "teams");
        const querySnapshot = await getDocs(teamsRef);
        
        // Normalize the input name to lowercase for comparison
        const normalizedName = teamName.trim().toLowerCase();
        
        // Check each team name (case-insensitive)
        for (const doc of querySnapshot.docs) {
            const existingName = doc.data().teamName;
            if (existingName && existingName.toLowerCase() === normalizedName) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error("Error checking team name:", error);
        return false;
    }
}

/**
 * Add a new team to Firestore
 * @param {Object} teamData - Team data (teamName, class, role)
 * @returns {Promise<Object>} - Result object with success status
 */
export async function addTeam(teamData) {
    try {
        const { teamName, teamClass, role } = teamData;
        
        // Validate team name
        if (!teamName || teamName.trim() === "") {
            return {
                success: false,
                error: "Team name is required."
            };
        }
        
        // Check if name already exists
        const nameExists = await checkTeamNameExists(teamName);
        if (nameExists) {
            return {
                success: false,
                error: "Team name already exists. Please choose a different name."
            };
        }
        
        // Get next team number
        const teamNumber = await getNextTeamNumber();
        
        // Create team document
        const newTeam = {
            teamNumber: teamNumber,
            teamName: teamName.trim(),
            score: 0,
            class: parseInt(teamClass, 10),
            role: role
        };
        
        // Add to Firestore
        await addDoc(collection(db, "teams"), newTeam);
        
        console.log(`Team "${teamName}" added successfully with number ${teamNumber}`);
        
        return {
            success: true,
            teamNumber: teamNumber
        };
        
    } catch (error) {
        console.error("Error adding team:", error);
        return {
            success: false,
            error: "Failed to add team. Please try again."
        };
    }
}

/**
 * Subscribe to real-time team updates from Firestore
 * @param {Function} callback - Function to call when teams update
 */
export function subscribeToTeams(callback) {
    // Unsubscribe from previous listener if exists
    if (unsubscribeTeams) {
        unsubscribeTeams();
    }
    
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, orderBy("teamNumber", "asc"));
    
    unsubscribeTeams = onSnapshot(q, (snapshot) => {
        allTeams = [];
        snapshot.forEach((doc) => {
            allTeams.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Teams updated: ${allTeams.length} teams loaded`);
        
        // Call the callback with updated teams
        if (callback) {
            callback(allTeams);
        }
    }, (error) => {
        console.error("Error listening to teams:", error);
    });
}

/**
 * Unsubscribe from team updates
 */
export function unsubscribeFromTeams() {
    if (unsubscribeTeams) {
        unsubscribeTeams();
        unsubscribeTeams = null;
    }
}

/**
 * Get all teams (from cache)
 * @returns {Array} - Array of team objects
 */
export function getAllTeams() {
    return [...allTeams];
}

/* =========================
   SCORE UPDATE FUNCTIONS
========================= */

/**
 * Update a team's score in Firestore
 * @param {string} teamId - The Firestore document ID of the team
 * @param {number} scoreChange - The amount to add (positive) or subtract (negative)
 * @returns {Promise<Object>} - Result object with success status
 */
export async function updateTeamScore(teamId, scoreChange) {
    try {
        // Validate inputs
        if (!teamId) {
            return { success: false, error: "Team ID is required." };
        }
        
        if (typeof scoreChange !== 'number' || isNaN(scoreChange)) {
            return { success: false, error: "Score change must be a valid number." };
        }
        
        // Get current team data
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        
        if (!teamSnap.exists()) {
            return { success: false, error: "Team not found." };
        }
        
        const currentScore = teamSnap.data().score || 0;
        let newScore = currentScore + scoreChange;
        
        // Ensure score doesn't go below 0
        if (newScore < 0) {
            newScore = 0;
        }
        
        // Update Firestore
        await updateDoc(teamRef, { score: newScore });
        
        console.log(`Team ${teamId}: Score updated from ${currentScore} to ${newScore} (change: ${scoreChange})`);
        
        return { 
            success: true, 
            previousScore: currentScore,
            newScore: newScore,
            actualChange: newScore - currentScore
        };
        
    } catch (error) {
        console.error("Error updating team score:", error);
        return { success: false, error: "Failed to update score. Please try again." };
    }
}

/**
 * Add Round 1 (Code Charades) score to a team
 * Score calculation: timeLeft * 2
 * @param {string} teamId - The Firestore document ID of the team
 * @param {number} timeLeft - Time remaining in seconds
 * @returns {Promise<Object>} - Result object with success status
 */
export async function addRound1Score(teamId, timeLeft) {
    // Validate timeLeft
    if (typeof timeLeft !== 'number' || isNaN(timeLeft) || timeLeft < 0) {
        return { success: false, error: "Time left must be a non-negative number." };
    }
    
    // Calculate score: timeLeft * 2
    const scoreToAdd = timeLeft * 2;
    
    const result = await updateTeamScore(teamId, scoreToAdd);
    
    if (result.success) {
        return {
            ...result,
            round: 1,
            timeLeft: timeLeft,
            pointsAdded: scoreToAdd
        };
    }
    
    return result;
}

/**
 * Add Round 2 (Cup Round) score to a team
 * @param {string} teamId - The Firestore document ID of the team
 * @param {number} cupPoints - Points to add (can be positive or negative)
 * @returns {Promise<Object>} - Result object with success status
 */
export async function addRound2Score(teamId, cupPoints) {
    // Validate cupPoints
    if (typeof cupPoints !== 'number' || isNaN(cupPoints)) {
        return { success: false, error: "Cup points must be a valid number." };
    }
    
    const result = await updateTeamScore(teamId, cupPoints);
    
    if (result.success) {
        return {
            ...result,
            round: 2,
            pointsAdded: cupPoints
        };
    }
    
    return result;
}

/**
 * Reduce a team's score
 * @param {string} teamId - The Firestore document ID of the team
 * @param {number} amount - Amount to reduce (positive number)
 * @returns {Promise<Object>} - Result object with success status
 */
export async function reduceScore(teamId, amount) {
    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
        return { success: false, error: "Reduction amount must be a non-negative number." };
    }
    
    // Reduce by negating the amount
    const result = await updateTeamScore(teamId, -amount);
    
    if (result.success) {
        return {
            ...result,
            pointsReduced: Math.abs(result.actualChange)
        };
    }
    
    return result;
}
