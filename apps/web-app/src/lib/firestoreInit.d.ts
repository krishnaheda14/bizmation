/**
 * firestoreInit.ts
 *
 * Seeds every Firestore collection with one starter document so that
 * all collections appear in the Firebase Console immediately.
 *
 * Usage - call once from a browser console or an admin route:
 *
 *   import { initializeCollections } from '../lib/firestoreInit';
 *   await initializeCollections();
 *
 * Safe to run multiple times - uses `setDoc` with `merge: true`
 * so existing data is preserved.
 */
/**
 * Creates all seed documents in Firestore using batched writes.
 * Batches are limited to 500 ops each.
 */
export declare function initializeCollections(): Promise<void>;
//# sourceMappingURL=firestoreInit.d.ts.map