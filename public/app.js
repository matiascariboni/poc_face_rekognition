// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const poweredBy = document.getElementById('poweredBy');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const passwordInput = document.getElementById('password');

const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const toggleBtn = document.getElementById('toggleBtn');
const resultsContent = document.getElementById('resultsContent');

// State variables
let sessionId = null;
let stream = null;
let analysisInterval = null;
let captureIntervalMs = 1500;
let isActive = false;

console.log('=== APP.JS LOADED ===');
console.log('DOM elements found:', {
    loginScreen: !!loginScreen,
    mainApp: !!mainApp,
    video: !!video,
    canvas: !!canvas,
    toggleBtn: !!toggleBtn,
    resultsContent: !!resultsContent
});

// Load config from backend
async function loadConfig() {
    console.log('[CONFIG] Loading configuration from server...');
    try {
        const response = await fetch('/api/config');
        console.log('[CONFIG] Response status:', response.status);

        const config = await response.json();
        console.log('[CONFIG] Config received:', config);

        captureIntervalMs = config.captureIntervalSeconds * 1000;
        console.log('[CONFIG] Capture interval set to:', captureIntervalMs, 'ms');
    } catch (error) {
        console.error('[CONFIG ERROR] Error loading config:', error);
        console.log('[CONFIG] Using default interval:', captureIntervalMs, 'ms');
    }
}

// Initialize
console.log('[INIT] Initializing app...');
loadConfig();

// Login form handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('\n=== LOGIN ATTEMPT ===');

    const password = passwordInput.value;

    try {
        console.log('[LOGIN] Sending login request...');
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();
        console.log('[LOGIN] Response:', data);

        if (data.success) {
            console.log('[LOGIN] ✓ Login successful');
            sessionId = data.sessionId;

            // Hide login, show main app
            loginScreen.style.display = 'none';
            mainApp.style.display = 'flex';
            poweredBy.style.display = 'flex';

            console.log('[LOGIN] Session ID stored:', sessionId);
        } else {
            console.log('[LOGIN] ✗ Login failed');
            showLoginError(data.message || 'Invalid password');
        }
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        showLoginError('Connection error. Please try again.');
    }
});

// Show login error
function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
    passwordInput.value = '';
    passwordInput.focus();

    // Hide error after 3 seconds
    setTimeout(() => {
        loginError.style.display = 'none';
    }, 3000);
}

// Toggle button - Start/Stop everything
toggleBtn.addEventListener('click', async () => {
    console.log('\n[BUTTON] Toggle button clicked, isActive:', isActive);

    if (isActive) {
        stopEverything();
    } else {
        await startEverything();
    }
});

// Start webcam and analysis
async function startEverything() {
    console.log('\n=== STARTING WEBCAM & ANALYSIS ===');

    try {
        // Start webcam
        console.log('[WEBCAM] Requesting user media...');
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        console.log('[WEBCAM] Stream obtained:', stream);
        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                console.log('[WEBCAM] Video metadata loaded');
                console.log('[WEBCAM] Video dimensions:', video.videoWidth, 'x', video.videoHeight);
                resolve();
            };
        });

        // Update state and button
        isActive = true;
        toggleBtn.textContent = 'Stop Camera & Analysis';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');

        console.log('[WEBCAM] Webcam started successfully');

        // Start analysis
        startAnalysis();

    } catch (error) {
        console.error('[WEBCAM ERROR] Error accessing webcam:', error);
        console.error('[WEBCAM ERROR] Error name:', error.name);
        console.error('[WEBCAM ERROR] Error message:', error.message);
        alert('Could not access webcam. Please check permissions.');
    }
}

// Stop webcam and analysis
function stopEverything() {
    console.log('\n=== STOPPING WEBCAM & ANALYSIS ===');

    // Stop analysis
    stopAnalysis();

    // Stop webcam
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('[WEBCAM] Track stopped:', track.kind);
        });
        stream = null;
        video.srcObject = null;
        console.log('[WEBCAM] Webcam stopped');
    }

    // Update state and button
    isActive = false;
    toggleBtn.textContent = 'Start Camera & Analysis';
    toggleBtn.classList.remove('btn-primary');
    toggleBtn.classList.add('btn-secondary');

    // Clear results
    resultsContent.innerHTML = '<p class="placeholder">Start the camera to begin facial analysis...</p>';

    console.log('[STOP] Everything stopped');
}

// Start continuous analysis
function startAnalysis() {
    console.log('\n=== STARTING ANALYSIS ===');
    console.log('[ANALYSIS] Capture interval:', captureIntervalMs, 'ms');

    // First capture immediately
    console.log('[ANALYSIS] Triggering first capture immediately...');
    analyzeFrame();

    // Then continue at intervals
    analysisInterval = setInterval(() => {
        console.log('[ANALYSIS] Interval triggered, capturing frame...');
        analyzeFrame();
    }, captureIntervalMs);

    console.log('[ANALYSIS] Analysis started with interval ID:', analysisInterval);
}

// Stop continuous analysis
function stopAnalysis() {
    if (analysisInterval) {
        clearInterval(analysisInterval);
        console.log('[ANALYSIS] Interval cleared:', analysisInterval);
        analysisInterval = null;
    }
}

// Analyze single frame
async function analyzeFrame() {
    console.log('\n--- Analyzing Frame ---');
    console.log('[FRAME] Video ready state:', video.readyState);
    console.log('[FRAME] Video dimensions:', video.videoWidth, 'x', video.videoHeight);

    try {
        // Capture frame from video
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        console.log('[FRAME] Frame captured to canvas');
        console.log('[FRAME] Canvas dimensions:', canvas.width, 'x', canvas.height);

        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const imageBase64 = dataUrl.split(',')[1];

        console.log('[FRAME] Image converted to base64');
        console.log('[FRAME] Base64 length:', imageBase64.length, 'characters');

        // Send to backend with session ID
        console.log('[API] Sending request to /api/analyze-face...');
        const startTime = Date.now();

        const response = await fetch('/api/analyze-face', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': sessionId
            },
            body: JSON.stringify({ image: imageBase64 })
        });

        const elapsed = Date.now() - startTime;
        console.log('[API] Response received in', elapsed, 'ms');
        console.log('[API] Response status:', response.status);

        if (response.status === 401) {
            console.error('[AUTH] Unauthorized - session expired');
            alert('Session expired. Please login again.');
            location.reload();
            return;
        }

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[API] Data parsed:', data);
        console.log('[RESULT] Face detected:', data.faceDetected);
        console.log('[RESULT] Identity match:', data.identity?.externalImageId || 'None');

        // Display results
        displayResults(data);

        console.log('--- Frame Analysis Complete ---');

    } catch (error) {
        console.error('\n[FRAME ERROR] Error analyzing frame');
        console.error('[ERROR] Message:', error.message);
        console.error('[ERROR] Stack:', error.stack);

        // Only show error in UI if analysis is still running
        if (isActive) {
            resultsContent.innerHTML = `
                <div class="result-item" style="border-left-color: #dc3545;">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        }
    }
}

// Display analysis results
function displayResults(data) {
    console.log('[UI] Updating results display...');

    if (!data.faceDetected) {
        console.log('[UI] Displaying no face detected message');
        resultsContent.innerHTML = `
            <div class="no-match">
                <h3>⚠️ No Face Detected</h3>
                <p>Please ensure your face is clearly visible in the camera.</p>
            </div>
        `;
        return;
    }

    let html = '';

    // Identity match section
    if (data.identity) {
        console.log('[UI] Rendering identity match:', data.identity.externalImageId);
        html += `
            <div class="identity-match">
                <h3>✓ Identity Match Found</h3>
                <div class="result-item">
                    <strong>Name:</strong> <span>${data.identity.externalImageId}</span>
                </div>
                <div class="result-item">
                    <strong>Confidence:</strong> <span>${data.identity.similarity.toFixed(2)}%</span>
                </div>
            </div>
        `;
    } else {
        console.log('[UI] Rendering no identity match');
        html += `
            <div class="no-match">
                <h3>❌ Identity Not Recognized</h3>
                <p>Face detected but no match found in the collection.</p>
            </div>
        `;
    }

    // Face attributes section
    html += '<h3 style="margin-top: 24px; margin-bottom: 16px; color: var(--deep-navy); font-family: var(--main-font);">Face Attributes:</h3>';

    const attrs = data.attributes;
    console.log('[UI] Rendering face attributes');

    html += `
        <div class="result-item">
            <strong>Gender:</strong> <span>${attrs.Gender.Value} (${attrs.Gender.Confidence.toFixed(1)}%)</span>
        </div>
        <div class="result-item">
            <strong>Age Range:</strong> <span>${attrs.AgeRange.Low} - ${attrs.AgeRange.High} years</span>
        </div>
        <div class="result-item">
            <strong>Emotions:</strong> <span>${formatEmotions(attrs.Emotions)}</span>
        </div>
        <div class="result-item">
            <strong>Smile:</strong> <span>${attrs.Smile.Value ? 'Yes' : 'No'} (${attrs.Smile.Confidence.toFixed(1)}%)</span>
        </div>
        <div class="result-item">
            <strong>Eyeglasses:</strong> <span>${attrs.Eyeglasses.Value ? 'Yes' : 'No'} (${attrs.Eyeglasses.Confidence.toFixed(1)}%)</span>
        </div>
        <div class="result-item">
            <strong>Sunglasses:</strong> <span>${attrs.Sunglasses.Value ? 'Yes' : 'No'} (${attrs.Sunglasses.Confidence.toFixed(1)}%)</span>
        </div>
        <div class="result-item">
            <strong>Beard:</strong> <span>${attrs.Beard.Value ? 'Yes' : 'No'} (${attrs.Beard.Confidence.toFixed(1)}%)</span>
        </div>
        <div class="result-item">
            <strong>Mustache:</strong> <span>${attrs.Mustache.Value ? 'Yes' : 'No'} (${attrs.Mustache.Confidence.toFixed(1)}%)</span>
        </div>
        <div class="result-item">
            <strong>Eyes Open:</strong> <span>${attrs.EyesOpen.Value ? 'Yes' : 'No'} (${attrs.EyesOpen.Confidence.toFixed(1)}%)</span>
        </div>
        <div class="result-item">
            <strong>Mouth Open:</strong> <span>${attrs.MouthOpen.Value ? 'Yes' : 'No'} (${attrs.MouthOpen.Confidence.toFixed(1)}%)</span>
        </div>
    `;

    resultsContent.innerHTML = html;
    console.log('[UI] Results display updated');
}

// Format emotions array
function formatEmotions(emotions) {
    return emotions
        .sort((a, b) => b.Confidence - a.Confidence)
        .slice(0, 3)
        .map(e => `${e.Type} (${e.Confidence.toFixed(1)}%)`)
        .join(', ');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log('[CLEANUP] Page unloading, stopping everything...');
    stopEverything();
});

console.log('[INIT] App initialization complete');