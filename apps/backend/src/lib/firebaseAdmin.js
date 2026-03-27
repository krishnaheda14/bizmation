/**
 * Firebase Admin SDK - lazy initialisation
 *
 * Required Railway environment variables:
 *   FIREBASE_PROJECT_ID        - e.g. "bizmation-gold"
 *   FIREBASE_CLIENT_EMAIL      - service account email
 *                                e.g. "firebase-adminsdk-xxx@bizmation-gold.iam.gserviceaccount.com"
 *   FIREBASE_PRIVATE_KEY       - RSA private key from the service account JSON file
 *                                (paste the entire "private_key" value, Railway preserves \n)
 *
 * How to get these:
 *   1. Firebase Console → Project Settings → Service Accounts
 *   2. Click "Generate new private key" → download JSON
 *   3. Copy projectId, client_email, private_key into Railway Variables
 */
import admin from 'firebase-admin';
let _app = null;
function initApp() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Railway stores multi-line secrets with literal \n - convert to real newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase Admin not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, ' +
            'FIREBASE_PRIVATE_KEY to Railway Variables. ' +
            'Get them from Firebase Console → Project Settings → Service Accounts → Generate new private key.');
    }
    if (admin.apps.length)
        return admin.apps[0];
    return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
}
export function getFirebaseAdmin() {
    if (!_app)
        _app = initApp();
    return _app;
}
export function getAdminAuth() {
    return getFirebaseAdmin().auth();
}
export function getAdminFirestore() {
    return getFirebaseAdmin().firestore();
}
//# sourceMappingURL=firebaseAdmin.js.map