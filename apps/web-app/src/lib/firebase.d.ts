/**
 * Firebase Initialization
 *
 * Single source of truth for Firebase app, Auth, Firestore, and Analytics.
 * All config values come from VITE_FIREBASE_* environment variables.
 */
declare const app: import("@firebase/app").FirebaseApp;
export declare const auth: import("firebase/auth").Auth;
export declare const db: import("@firebase/firestore").Firestore;
export declare const analytics: Promise<import("@firebase/analytics").Analytics | null>;
export default app;
//# sourceMappingURL=firebase.d.ts.map