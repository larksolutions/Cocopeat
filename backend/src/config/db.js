import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firebaseConfig = {
  databaseURL: "https://cocopeat-d2bd3-default-rtdb.asia-southeast1.firebasedatabase.app"
};

let db = null;

export const initializeFirebase = () => {
    try {
        // Priority 1: Try to load from local serviceAccountKey.json file
        const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
        
        if (existsSync(serviceAccountPath)) {
            console.log("Loading Firebase credentials from serviceAccountKey.json...");
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: firebaseConfig.databaseURL
            });
        }
        // Priority 2: Try environment variable with service account JSON
        else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log("Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT env variable...");
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: firebaseConfig.databaseURL
            });
        }
        // Priority 3: Try GOOGLE_APPLICATION_CREDENTIALS path
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log("Loading Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS...");
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                databaseURL: firebaseConfig.databaseURL
            });
        }
        // No credentials found
        else {
            console.error("\n❌ FIREBASE CREDENTIALS NOT FOUND!");
            console.error("\n📋 Quick Setup Instructions:");
            console.error("1. Go to: https://console.firebase.google.com/project/cocopeat-d2bd3/settings/serviceaccounts/adminsdk");
            console.error("2. Click 'Generate new private key'");
            console.error("3. Save the downloaded JSON file as:");
            console.error("   → backend/src/config/serviceAccountKey.json");
            console.error("4. Restart the server\n");
            process.exit(1);
        }
        
        db = admin.database();
        console.log("✅ Firebase Realtime Database connected successfully");
        return db;
    } catch (error) {
        console.error("\n❌ Firebase initialization failed:", error.message);
        console.error("\n📋 Setup Instructions:");
        console.error("1. Download service account key from Firebase Console");
        console.error("2. Save as: backend/src/config/serviceAccountKey.json");
        console.error("3. Or set FIREBASE_SERVICE_ACCOUNT environment variable");
        console.error("\nDirect link: https://console.firebase.google.com/project/cocopeat-d2bd3/settings/serviceaccounts/adminsdk\n");
        process.exit(1);
    }
};

export const getDatabase = () => {
    if (!db) {
        return initializeFirebase();
    }
    return db;
};