/**
 *          Description:        Contains Automated Smart Home webapp's functionalities
 *                              Contains firebase authentication, communication with
 *                              RTDB, device control interface handlers, RTDB status
 *                              updates.
 * 
 *          Author:             Eddie Kwak
 *          Last Modified:      11/14/2025
 */

// ============================================================================
//                                  IMPORTS
// ============================================================================
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ============================================================================
//                              CONFIGURATION
// ============================================================================
// These configs won't be pushed. Just text me for them if you need to test.

const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
}

// Initialize Firebase services
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);

// ============================================================================
//                                  GLOBALS
// ============================================================================
// const ESP32_IP_KEY = "esp32_ip_address";
let messageTimeout;

// Servo movements
let servoLeftInterval = null;
let servoRightInterval = null;
let servoUpInterval = null;
let servoDownInterval = null;

// DOM selector helper functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// ============================================================================
//                                  INITS
// ============================================================================
// Initialize all page functionality when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initAuthForms();
    initGoogleAuth();
    initSignOut();
    initDashboardNavigation();
    initDashboardControls();
});

// ============================================================================
//                      AUTHENTICATION STATE MONITORING
// ============================================================================
// Monitor Firebase authentication state and show/hide UI elements
// Redirects to login page if user is not authenticated
onAuthStateChanged(auth, (user) => {
    const authCard = document.getElementById("authCard");
    const appSection = document.getElementById("appSection");
    const signOutBtn = document.getElementById("signOutBtn");
    const userEmail = document.getElementById("userEmail");
    const isDashboard = Boolean(document.getElementById("dashboardPage"));

    if (user) {
        authCard?.classList.add("hidden");
        appSection?.classList.remove("hidden");
        if (signOutBtn) signOutBtn.hidden = false;
        if (userEmail) userEmail.textContent = user.email ?? "User";
    } 
    else {
        authCard?.classList.remove("hidden");
        appSection?.classList.add("hidden");
        if (signOutBtn) signOutBtn.hidden = true;
        if (userEmail) userEmail.textContent = "";
        if (isDashboard) {
            window.location.href = "./index.html";
        }
    }
});

// ============================================================================
//                                  UI INITS
// ============================================================================
function initTabs() {
    const tabs = $$(".tab");
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            const target = tab.getAttribute("data-tab");
            const panels = $$(".panel");
            panels.forEach((panel) => {
                const isTarget = panel.getAttribute("data-panel") === target;
                panel.classList.toggle("hidden", !isTarget);
                panel.setAttribute("aria-hidden", String(!isTarget));
            });
        });
    });
}

function initAuthForms() {
    // Login form handler
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = /** @type {HTMLInputElement} */ (
                document.getElementById("loginEmail")
            ).value.trim();
            const password = /** @type {HTMLInputElement} */ (
                document.getElementById("loginPassword")
            ).value;
            const messageEl = document.getElementById("loginMessage");
            clearFormMessage(messageEl);

            if (!email || !password) {
                setFormMessage(messageEl, "Please enter email and password.");
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
                setFormMessage(messageEl, "Logged in successfully.", "success");
                window.location.href = "./dashboard.html";
            } 
            catch (error) {
                console.error("Login error:", error);
                setFormMessage(messageEl, parseAuthError(error));
            }
        });
    }

    // Sign up form handler
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = /** @type {HTMLInputElement} */ (
                document.getElementById("signupEmail")
            ).value.trim();
            const password = /** @type {HTMLInputElement} */ (
                document.getElementById("signupPassword")
            ).value;
            const messageEl = document.getElementById("signupMessage");
            clearFormMessage(messageEl);

            if (!email || !password || password.length < 6) {
                setFormMessage(
                    messageEl,
                    "Use a valid email and 6+ character password pls"
                );
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                console.log("Account created:", userCredential.user.uid);
                setFormMessage(messageEl, "Account created. You are now signed in.", "success");
                window.location.href = "./dashboard.html";
            } 
            catch (error) {
                console.error("Signup error:", error);
                setFormMessage(messageEl, parseAuthError(error));
            }
        });
    }
}

// Initialize Google login button
function initGoogleAuth() {
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    if (!googleLoginBtn) return;

    googleLoginBtn.addEventListener("click", async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            window.location.href = "./dashboard.html";
        } 
        catch (error) {
            console.error("Google login error:", error);
            const messageEl = document.getElementById("loginMessage");
            setFormMessage(messageEl, parseAuthError(error));
        }
    });
}

// Sign out button handler
function initSignOut() {
    const signOutBtn = document.getElementById("signOutBtn");
    if (!signOutBtn) return;

    signOutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            if (!location.pathname.endsWith("index.html")) {
                window.location.href = "./index.html";
            }
        } 
        catch (error) {
            console.error("Sign out error:", error);
        }
    });
}

// Go to dashboard button
function initDashboardNavigation() {
    const goDashboard = document.getElementById("goDashboard");
    if (!goDashboard) return;

    goDashboard.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = "./dashboard.html";
    });
}

// ============================================================================
//                              DEVICE CONTROL
// ============================================================================
// Initialize dashboard device controls and listeners for RTDB
// If you're planning on adding a new peripheral, 
// add firebase reference and onValue() listener here
function initDashboardControls() {
    const ipInput = document.getElementById("esp32-ip");
    if (ipInput) {
        ipInput.style.display = "none";
        const ipLabel = ipInput.previousElementSibling;
        if (ipLabel && ipLabel.tagName === "LABEL") {
            ipLabel.style.display = "none";
        }
    }
    refreshStatus();
    
    // ========================================================================
    //                              LISTENERS
    // ========================================================================
    // Listener for temperature sensor state changes
    const temperatureSensorRef = ref(database, "temperature_sensor/state");
    onValue(temperatureSensorRef, (snapshot) => {
        const state = snapshot.exists() ? (snapshot.val() === 1 ? "on" : "off") : "unknown";
        updateDeviceStatus("temperature_sensor", state);
    });

    // Listener for heating pad state changes
    const heatingPadRef = ref(database, "heating_pad/state");
    onValue(heatingPadRef, (snapshot) => {
        // Convert Firebase value (0 or 1) to string ("off" or "on")
        const state = snapshot.exists() ? (snapshot.val() === 1 ? "on" : "off") : "unknown";
        updateDeviceStatus("heating_pad", state);
    });

    // ========================================================================
    //                         CAMERA ORIENTATION
    // ========================================================================
    const cameraLeftBtn = document.getElementById("camera-left-btn");
    const cameraRightBtn = document.getElementById("camera-right-btn");
    const cameraUpBtn = document.getElementById("camera-up-btn");
    const cameraDownBtn = document.getElementById("camera-down-btn");

    if (cameraLeftBtn) {
        addServoPressHandlers(cameraLeftBtn, "left");
    }
    if (cameraRightBtn) {
        addServoPressHandlers(cameraRightBtn, "right");
    }
    if (cameraUpBtn) {
        addServoPressHandlers(cameraUpBtn, "up");
    }
    if (cameraUpBtn) {
        addServoPressHandlers(cameraDownBtn, "down");
    }
}

// ============================================================================
//                          DEVICE CONTROL FUNCTIONS
// ============================================================================

/**
 * Control a device by writing state to Firebase
 * 
 * 
 * @param {string} device : Device identifier (ex: "heating_pad", temperature_sensor", etc.)
 * @param {string} action : Action to perform (ex: "on" or "off", "increase" or "decrease", etc.)
 * 
 * 
 * If you want to add a new peripheral, you're going to ahve to add device mapping
 * in the firebasePath assignment.
 */
async function controlDevice(device, action) {
    try {
        // Device to firebase path mapping 
        const firebasePath = device === "heating_pad" 
            ? "heating_pad/state" 
            : device === "temperature_sensor"
            ? "temperature_sensor/state"
            : null;
        
        if (!firebasePath) {
            showMessage("Unknown device: " + device, "error");
            return;
        }
        
        const state = action === "on" ? 1 : 0;
        
        const stateRef = ref(database, firebasePath);
        await set(stateRef, state);

        showMessage(`${formatDeviceName(device)} turned ${action}`, "success");
        updateDeviceStatus(device, action);
    } 
    catch (error) {
        console.error("Device control error:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

// Refresh device status. When adding peripherals, add the device reading logic here
async function refreshStatus() {
    try {
        const heatingPadRef = ref(database, "heating_pad/state");
        const temperatureSensorRef = ref(database, "temperature_sensor/state");
        
        const heatingPadSnapshot = await get(heatingPadRef);
        const temperatureSensorSnapshot = await get(temperatureSensorRef);
        
        const heatingPadState = heatingPadSnapshot.exists() 
            ? (heatingPadSnapshot.val() === 1 ? "on" : "off") 
            : "unknown";
        const temperatureSensorState = temperatureSensorSnapshot.exists() 
            ? (temperatureSensorSnapshot.val() === 1 ? "on" : "off") 
            : "unknown";
        
        updateDeviceStatus("heating_pad", heatingPadState);
        updateDeviceStatus("temperature_sensor", temperatureSensorState);

        showMessage("Status updated", "success");
    } 
    catch (error) {
        console.error("Status refresh error:", error);
        showMessage(`Error: ${error.message}`, "error");
    }
}

/**
 * Update device status indicator in the UI
 * 
 * @param {string} device : Device identifier (ex: "heating_pad")
 * @param {string} state  : Device state (ex: "on", "off", or "unknown")
 * 
 * 
 * When adding a peripheral, add device ID mapping in the deviceId assignment
 */
function updateDeviceStatus(device, state) {
    const deviceId = device === "heating_pad" 
        ? "heating-pad" 
        : device === "temperature_sensor"
        ? "temperature-sensor"
        : null;
    
    if (!deviceId) {
        console.error("Unknown device for status update:", device);
        return;
    }
    
    const indicator = document.getElementById(`${deviceId}-indicator`);
    const statusText = document.getElementById(`${deviceId}-status`);

    if (!indicator || !statusText) {
        console.error(`Status elements not found for device: ${deviceId}`);
        return;
    }

    const normalizedState = typeof state === "string" ? state.toLowerCase() : "unknown";
    indicator.className = `status-indicator ${normalizedState}`;
    statusText.textContent = `Status: ${normalizedState.toUpperCase()}`;
}

// ========================================================================
//                         SERVO CONTROL FOR CAMERA
// ========================================================================
function getServoPath(direction) {
    if (direction == "left") return "camera_servo/left";
    if (direction == "right") return "camera_servo/right";
    if (direction == "up") return "camera_servo/up";
    if (direction == "down") return "camera_servo/down";
    return null;
}

function startServo(direction) {
    const path = getServoPath(direction);
    if (!path) return;

    const stateRef = ref(database, path);
    set(stateRef, 1).catch((error) => {
        console.error("Servo start error: ", error);
    });

    const intervalFn = () => {
        set(stateRef, 1).catch((error) => {
            console.error("Servo repeat error: ", error);
        });
    };

    if (direction === "left") {
        if (servoLeftInterval !== null) return;
        servoLeftInterval = window.setInterval(intervalFn, 100);
    }
    else if (direction === "right") {
        if (servoRightInterval !== null) return;
        servoRightInterval = window.setInterval(intervalFn, 100);
    }
    else if (direction == "up") {
        if (servoUpInterval !== null) return;
        servoUpInterval = window.setInterval(intervalFn, 100);
    }
    else if (direction == "down") {
        if (servoDownInterval !== null) return;
        servoDownInterval = window.setInterval(intervalFn, 100);
    }
}

function stopServo(direction) {
    const path = getServoPath(direction);
    if (!path) return;

    const stateRef = ref(database, path);

    if (direction === "left") {
        if (servoLeftInterval !== null) {
            clearInterval(servoLeftInterval);
            servoLeftInterval = null;
        }
    }
    else if (direction === "right") {
        if (servoRightInterval !== null) {
            clearInterval(servoRightInterval);
            servoRightInterval = null;
        }
    }
    else if (direction == "up") {
        if (servoUpInterval !== null) {
            clearInterval(servoUpInterval);
            servoUpInterval = null;
        }
    }
    else if (direction == "down") {
        if (servoDownInterval !== null) {
            clearInterval(servoDownInterval);
            servoDownInterval = null;
        }
    }

    // Send 0 once to indicate stop
    set(stateRef, 0).catch((error) => {
        console.error("Servo stop error: ", error);
    });
}

function addServoPressHandlers(button, direction) {
    const start = () => startServo(direction);
    const stop = () => stopServo(direction);

    button.addEventListener("mousedown", start);
    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);

    button.addEventListener("touchstart", (event) => {
        event.preventDefault();
        start();
    }, { passive: false });

    button.addEventListener("touchend", stop);
    button.addEventListener("touchcancel", stop);
}

// ============================================================================
//                              UTILITY FUNCTIONS
// ============================================================================
/**
 * Get ESP32 IP address from input field.
 * 
 * Note: I used this function for initial prototyping. This
 *       function is now depreciated since wireless connection
 *       over different networks works now.
 */
// Get ESP32 IP address from input field
// function getESP32IP() {
//     const ipInput = document.getElementById("esp32-ip");
//     if (!ipInput) return null;

//     const ip = ipInput.value.trim();
//     if (!ip) {
//         showMessage("Please enter ESP32 IP address", "error");
//         return null;
//     }
//     return ip;
// }

// Show temporary status message (used for debugging)
function showMessage(text, type) {
    const messageEl = document.getElementById("message");
    if (!messageEl) return;

    clearTimeout(messageTimeout);
    messageEl.textContent = text;
    messageEl.className = `status-message ${type}`;

    messageTimeout = window.setTimeout(() => {
        messageEl.textContent = "";
        messageEl.className = "status-message";
    }, 3000);
}

// Clear form message
function clearFormMessage(element) {
    if (!element) return;
    element.textContent = "";
    element.className = "form-message";
}

// Set form message with text and type
function setFormMessage(element, text, type = "error") {
    if (!element) return;
    element.textContent = text;
    element.className = `form-message ${type}`;
}

// Parse firebase authentication errors
function parseAuthError(error) {
    console.error("Full Firebase error:", error);
    if (!error || !error.code) {
        return "Unknown error occurred. Please check console for details.";
    }

    const code = String(error.code);
    const message = error.message || "";

    const errorMap = {
        "invalid-email": "Please enter a valid email address.",
        "invalid-credential": "Invalid email or password.",
        "user-disabled": "This account has been disabled.",
        "user-not-found": "No account found with this email.",
        "wrong-password": "Incorrect password.",
        "email-already-in-use": "An account with this email already exists.",
        "weak-password": "Password should be at least 6 characters.",
        "too-many-requests": "Too many failed attempts. Please try again later.",
        "operation-not-allowed": "This sign-in method is not enabled. Please contact support.",
        "network-request-failed": "Network error. Please check your internet connection.",
        "invalid-api-key": "Configuration error. Please contact support.",
        "app-not-authorized": "App not authorized. Please contact support.",
        "quota-exceeded": "Service temporarily unavailable. Please try again later.",
        "credential-already-in-use": "This credential is already associated with a different account.",
        "account-exists-with-different-credential": "An account already exists with a different sign-in method.",
        "invalid-argument": "Invalid input. Please check your email and password.",
        "missing-email": "Please enter an email address.",
        "missing-password": "Please enter a password.",
    };

    for (const [key, value] of Object.entries(errorMap)) {
        if (code.includes(key) || message.toLowerCase().includes(key)) {
            return value;
        }
    }

    return `Error: ${code}. ${message || "Please check console for details."}`;
}

// Format device name for UI display. 
function formatDeviceName(device) {
    switch (device) {
        case "heating_pad":
            return "Heating pad";
        case "temperature_sensor":
            return "Temperature sensor";
        // TO ADD A NEW PERIPHERAL: Add case here
        // case "water_pump":
        //     return "Water pump";
        default:
            return device;
    }
}

// ============================================================================
//                          GLOBAL ONCLICK FUNCTIONS
// ============================================================================
window.controlDevice = controlDevice;
window.refreshStatus = refreshStatus;
