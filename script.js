
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    doc, updateDoc, deleteDoc, setDoc, increment, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
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
const analytics = getAnalytics(app);
const db = getFirestore(app);

console.log("GitWars Leaderboard loaded with Firestore.");

// DOM Elements
const leaderboardBody = document.getElementById("leaderboard-body");
const nameInput = document.getElementById("team-name-input");
const initialPointsSelect = document.getElementById("initial-points");
const addTeamBtn = document.getElementById("add-team-btn");

// Timer Elements
const displayElement = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const presetBtns = document.querySelectorAll(".preset-btn");

// Global State
let teams = []; // Synced from Firestore
let currentGameState = { timer: 30, timerRunning: false }; // Synced from Firestore

/* =========================
   FIRESTORE LISTENERS
========================= */

// Listen for Teams Updates
onSnapshot(collection(db, "teams"), (snapshot) => {
    teams = [];
    snapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() });
    });
    renderLeaderboard();
});

// Listen for Game/Timer State Updates
onSnapshot(doc(db, "gameState", "current"), (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        currentGameState = data; // Update local cache
        updateTimerDisplay(data.timer);
        
        // Auto-stop local interval if remote says stop (and we are controller)
        if (!data.timerRunning && localIsController && localTimerInterval) {
            clearInterval(localTimerInterval);
            localIsController = false;
        }
    } else {
        // Initialize if not exists
        setDoc(doc(db, "gameState", "current"), {
            round: "easy",
            timer: 30, // seconds
            timerRunning: false
        });
    }
});


/* =========================
   RENDER LEADERBOARD
========================= */
function renderLeaderboard() {
  leaderboardBody.innerHTML = "";

  // Sort teams by score (descending)
  teams.sort((a, b) => b.score - a.score);

  teams.forEach((team, index) => {
    const row = document.createElement("tr");
    row.classList.add("team-row");

    row.innerHTML = `
      <td class="rank">${index + 1}</td>
      <td class="team-name">${team.name}</td>
      <td class="score">${team.score}</td>
      <td class="shields">${team.shields}</td>
      <td class="actions">
        <button class="btn-score-inc" data-id="${team.id}">+10</button>
        <button class="btn-score-dec" data-id="${team.id}">-10</button>
        <button class="btn-shield-add" data-id="${team.id}">+ Shield</button>
        <button class="btn-shield-use" data-id="${team.id}">Use </button>
        <button class="delete-btn" data-id="${team.id}"></button>
      </td>
    `;

    leaderboardBody.appendChild(row);
  });
}

// Event Delegation for Dynamic Buttons
leaderboardBody.addEventListener("click", async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;

    if (e.target.closest(".btn-score-inc")) {
        await updateDoc(doc(db, "teams", id), { score: increment(10) });
    } else if (e.target.closest(".btn-score-dec")) {
        // Firestore doesnt support "decrement" directly with validation to 0 easily in one go
        // Use transaction or simple read-then-write or just increment(-10) 
        // We will read current value to prevent negative or just use increment and handled display
        // Requirement says "Decrease score".
        // Let us just increment(-10) and if it goes negative, we might handle it or just let it be.
        // Actually, let is do a read-write for safety since we want min 0.
        const teamDoc = await getDoc(doc(db, "teams", id));
        if (teamDoc.exists()) {
            const newScore = Math.max(0, teamDoc.data().score - 10);
            await updateDoc(doc(db, "teams", id), { score: newScore });
        }
    } else if (e.target.closest(".btn-shield-add")) {
        await updateDoc(doc(db, "teams", id), { shields: increment(1) });
    } else if (e.target.closest(".btn-shield-use")) {
        const teamDoc = await getDoc(doc(db, "teams", id));
        if (teamDoc.exists() && teamDoc.data().shields > 0) {
            await updateDoc(doc(db, "teams", id), { shields: increment(-1) });
            alert("Shield used! Damage blocked ");
        }
    } else if (e.target.closest(".delete-btn")) {
        if(confirm("Delete this team?")) {
            await deleteDoc(doc(db, "teams", id));
        }
    }
});


/* =========================
   TEAM MANAGEMENT
========================= */

if (addTeamBtn) {
  addTeamBtn.addEventListener("click", async () => {
    const name = (nameInput && nameInput.value || "").trim();
    const initial = parseInt((initialPointsSelect && initialPointsSelect.value) || "0", 10) || 0;
    
    if (!name) {
      alert("Please enter a team name.");
      nameInput.focus();
      return;
    }

    try {
        await addDoc(collection(db, "teams"), {
            name: name,
            score: Number(initial),
            shields: 0
        });

        nameInput.value = "";
        nameInput.focus();
    } catch (e) {
        console.error("Error adding team: ", e);
        alert("Error adding team");
    }
  });
}


/* =========================
   TIMER LOGIC (Controller)
========================= */
// The controller machine (volunteer) runs the interval and updates Firestore.
// Viewers just listen to Firestore.

let localTimerInterval;
let localIsController = false; 

// When we click start, we become the controller
async function startTimer() {
    // Use cached state
    if (currentGameState.timer <= 0) return;

    try {
        const docRef = doc(db, "gameState", "current");
        await updateDoc(docRef, { timerRunning: true });
        
        localIsController = true;
        if (localTimerInterval) clearInterval(localTimerInterval);

        localTimerInterval = setInterval(async () => {
            // Use cached state to decide
            if (!currentGameState.timerRunning) {
                clearInterval(localTimerInterval);
                localIsController = false;
                return;
            }

            if (currentGameState.timer > 0) {
                // Decrement
                // We use updateDoc (not transactional) for speed. 
                // Since we are the controller, we push the state.
                await updateDoc(docRef, { timer: increment(-1) });
            } else {
                // Stop
                await updateDoc(docRef, { timerRunning: false });
                clearInterval(localTimerInterval);
                localIsController = false;
            }
        }, 1000);
    } catch (e) {
        console.error("Error starting timer:", e);
        alert("Failed to start timer. Check console/permissions.");
    }
}

async function stopTimer() {
    localIsController = false;
    if (localTimerInterval) clearInterval(localTimerInterval);
    await updateDoc(doc(db, "gameState", "current"), { timerRunning: false });
}

async function resetTimer() {
    // Use last known duration or default
    // We need a stored "round duration", let us just pick from the UI state or default 30
    // Simpler: Reset sets it to 30, or whatever the last preset was. 
    // Let us track "lastSelectedDuration" in memory or DB.
    // For now, reset to the current value on UI might be tricky if synched.
    // Let us make the preset buttons the main way to "Reset to X".
    stopTimer();
    // Default reset to 30 if no other context
    await updateDoc(doc(db, "gameState", "current"), { 
        timer: 30, 
        timerRunning: false 
    });
}

async function setDuration(seconds) {
    stopTimer();
    await updateDoc(doc(db, "gameState", "current"), { 
        timer: seconds, 
        timerRunning: false,
        round: seconds === 30 ? "easy" : seconds === 60 ? "medium" : "hard"
    });
}


if (startBtn) startBtn.addEventListener("click", startTimer);
if (pauseBtn) pauseBtn.addEventListener("click", stopTimer);
if (resetBtn) resetBtn.addEventListener("click", resetTimer);

presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const duration = parseInt(btn.dataset.time);
        setDuration(duration);
    });
});


/* =========================
   UI HELPERS
========================= */
function updateTimerDisplay(timeRemaining) {
    if (!displayElement) return;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    displayElement.textContent = 
        (minutes < 10 ? "0" + minutes : minutes) + ":" + 
        (seconds < 10 ? "0" + seconds : seconds);
    
    if (timeRemaining === 0) {
        displayElement.classList.add("time-up");
        displayElement.textContent = "TIME UP";
    } else {
        displayElement.classList.remove("time-up");
    }
}

