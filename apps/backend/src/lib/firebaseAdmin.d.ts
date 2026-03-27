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
export declare function getFirebaseAdmin(): admin.app.App;
export declare function getAdminAuth(): admin.auth.Auth;
export declare function getAdminFirestore(): admin.firestore.Firestore;
//# sourceMappingURL=firebaseAdmin.d.ts.map