import express from 'express';
import { RekognitionClient, DetectFacesCommand, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { env } from './env.js';

const app = express();
const PORT = env.express.PORT;

console.log('=== SERVER INITIALIZATION ===');
console.log('Region:', env.aws.REGION);
console.log('Collection ID:', env.aws.services.rekognition.COLLECTION_ID);
console.log('Face Match Threshold:', env.aws.services.rekognition.FACE_MATCH_THRESHOLD);
console.log('Capture Interval:', env.analysis.CAPTURE_INTERVAL_SECONDS, 'seconds');

// Initialize Rekognition client
const rekognitionClient = new RekognitionClient({
    region: env.aws.REGION,
    credentials: {
        accessKeyId: env.aws.credentials.ACCESS_KEY_ID,
        secretAccessKey: env.aws.credentials.SECRET_ACCESS_KEY
    }
});

console.log('Rekognition client initialized');

// In-memory session storage (resets on server restart)
const activeSessions = new Set();

// Parse JSON bodies with increased limit for base64 images
app.use(express.json({ limit: '10mb' }));

// Serve static files from /public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('[/api/health] Health check requested');
    res.json({ status: 'OK', message: 'Server is running' });
});

// Config endpoint - expose capture interval to frontend
app.get('/api/config', (req, res) => {
    console.log('[/api/config] Config requested');
    const config = {
        captureIntervalSeconds: env.analysis.CAPTURE_INTERVAL_SECONDS
    };
    console.log('[/api/config] Returning config:', config);
    res.json(config);
});

// Login endpoint
app.post('/api/login', (req, res) => {
    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Timestamp:', new Date().toISOString());

    const { password } = req.body;

    if (!password) {
        console.log('[LOGIN] No password provided');
        return res.status(400).json({ success: false, message: 'Password required' });
    }

    if (password === env.auth.PASSWORD) {
        // Generate simple session ID
        const sessionId = Math.random().toString(36).substring(2, 15);
        activeSessions.add(sessionId);

        console.log('[LOGIN] ✓ Login successful');
        console.log('[LOGIN] Session ID:', sessionId);
        console.log('[LOGIN] Active sessions:', activeSessions.size);

        res.json({
            success: true,
            message: 'Login successful',
            sessionId: sessionId
        });
    } else {
        console.log('[LOGIN] ✗ Invalid password');
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Middleware to check session for protected routes
function checkSession(req, res, next) {
    const sessionId = req.headers['x-session-id'];

    if (!sessionId || !activeSessions.has(sessionId)) {
        console.log('[AUTH] Unauthorized request - invalid or missing session');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

// Analyze face endpoint (protected)
app.post('/api/analyze-face', checkSession, async (req, res) => {
    console.log('\n=== NEW FACE ANALYSIS REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());

    try {
        const { image } = req.body;

        if (!image) {
            console.error('[ERROR] No image provided in request body');
            return res.status(400).json({ error: 'No image provided' });
        }

        console.log('[INFO] Image received, length:', image.length, 'characters');

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(image, 'base64');
        console.log('[INFO] Image buffer created, size:', imageBuffer.length, 'bytes');

        // Step 1: Detect faces and get attributes
        console.log('[REKOGNITION] Calling DetectFaces...');
        const detectFacesCommand = new DetectFacesCommand({
            Image: {
                Bytes: imageBuffer
            },
            Attributes: ['ALL']
        });

        const detectResponse = await rekognitionClient.send(detectFacesCommand);
        console.log('[REKOGNITION] DetectFaces response received');
        console.log('[INFO] Faces detected:', detectResponse.FaceDetails?.length || 0);

        // Check if face detected
        if (!detectResponse.FaceDetails || detectResponse.FaceDetails.length === 0) {
            console.log('[RESULT] No face detected in image');
            return res.json({
                faceDetected: false,
                identity: null,
                attributes: null
            });
        }

        // Get first face attributes
        const faceAttributes = detectResponse.FaceDetails[0];
        console.log('[INFO] Face attributes extracted');
        console.log('[ATTRIBUTES] Gender:', faceAttributes.Gender?.Value);
        console.log('[ATTRIBUTES] Age Range:', faceAttributes.AgeRange?.Low, '-', faceAttributes.AgeRange?.High);
        console.log('[ATTRIBUTES] Emotions:', faceAttributes.Emotions?.slice(0, 2).map(e => e.Type).join(', '));

        // Step 2: Search for face in collection (identity matching)
        let identityMatch = null;

        try {
            console.log('[REKOGNITION] Calling SearchFacesByImage...');
            console.log('[INFO] Using collection:', env.aws.services.rekognition.COLLECTION_ID);
            console.log('[INFO] Threshold:', env.aws.services.rekognition.FACE_MATCH_THRESHOLD);

            const searchFacesCommand = new SearchFacesByImageCommand({
                CollectionId: env.aws.services.rekognition.COLLECTION_ID,
                Image: {
                    Bytes: imageBuffer
                },
                MaxFaces: 1,
                FaceMatchThreshold: env.aws.services.rekognition.FACE_MATCH_THRESHOLD
            });

            const searchResponse = await rekognitionClient.send(searchFacesCommand);
            console.log('[REKOGNITION] SearchFacesByImage response received');
            console.log('[INFO] Matches found:', searchResponse.FaceMatches?.length || 0);

            if (searchResponse.FaceMatches && searchResponse.FaceMatches.length > 0) {
                const match = searchResponse.FaceMatches[0];
                identityMatch = {
                    faceId: match.Face.FaceId,
                    externalImageId: match.Face.ExternalImageId,
                    similarity: match.Similarity
                };
                console.log('[MATCH FOUND] Identity:', identityMatch.externalImageId);
                console.log('[MATCH FOUND] Similarity:', identityMatch.similarity.toFixed(2), '%');
            } else {
                console.log('[NO MATCH] Face not found in collection');
            }
        } catch (searchError) {
            console.error('[ERROR] SearchFacesByImage failed:', searchError.message);
            console.error('[ERROR] Error code:', searchError.name);
            console.error('[ERROR] Full error:', searchError);
        }

        // Return combined results
        const result = {
            faceDetected: true,
            identity: identityMatch,
            attributes: faceAttributes
        };

        console.log('[SUCCESS] Returning results to client');
        console.log('=== END ANALYSIS ===\n');

        res.json(result);

    } catch (error) {
        console.error('\n[CRITICAL ERROR] analyze-face endpoint failed');
        console.error('[ERROR] Message:', error.message);
        console.error('[ERROR] Name:', error.name);
        console.error('[ERROR] Stack:', error.stack);
        res.status(500).json({
            error: 'Failed to analyze face',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('========================================\n');
});