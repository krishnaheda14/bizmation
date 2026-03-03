/**
 * AuthContext
 *
 * Provides:
 *  - currentUser    : Firebase User | null
 *  - userProfile    : Firestore profile document (name, phone, city, etc.)
 *  - loadingAuth    : true while Firebase resolves initial auth state
 *  - signUp()       : creates Auth user + Firestore profile (signs out immediately, user must verify email)
 *  - signIn()       : email + password login (enforces email verification)
 *  - signInWithPhonePassword() : look up email by phone in Firestore, then sign in
 *  - sendOtp()      : sends a magic-link / email-OTP to the address
 *  - verifyOtp()    : completes email-link sign-in from the URL
 *  - signOut()      : logs out
 */

import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, serverTimestamp, updateDoc,
  collection, query, where, getDocs, limit,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  dateOfBirth: string;           // ISO string "YYYY-MM-DD"
  panNumber: string;
  aadhaarLast4: string;          // last 4 digits only (for KYC display)
  kycStatus: 'PENDING' | 'VERIFIED';
  role: 'CUSTOMER' | 'STAFF' | 'OWNER';
  shopName?: string;             // for OWNER/STAFF accounts
  gstNumber?: string;            // GST registration number (OWNER)
  phoneVerified?: boolean;
  totalGoldPurchasedGrams: number;
  totalSilverPurchasedGrams: number;
  totalInvestedInr: number;
  createdAt: any;
  updatedAt: any;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  dateOfBirth: string;
  panNumber: string;
  aadhaarLast4: string;
  role?: 'CUSTOMER' | 'OWNER';
  shopName?: string;
  gstNumber?: string;  // GST registration number (required for OWNER)
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loadingAuth: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPhonePassword: (phone: string, password: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: () => Promise<{ success: boolean; email: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OTP_EMAIL_KEY = 'jewleryPosOtpEmail';

// The URL Firebase will redirect to after the user clicks the email link.
// Must be whitelisted in Firebase Console → Authentication → Settings → Authorised domains
const ACTION_CODE_URL = `${window.location.origin}${window.location.pathname}#/auth/verify`;

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser]         = useState<User | null>(null);
  const [userProfile, setUserProfile]         = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth]         = useState(true);

  // ── Load Firestore profile ───────────────────────────────────────────────
  const loadProfile = useCallback(async (user: User) => {
    const ref  = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setUserProfile(snap.data() as UserProfile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (currentUser) await loadProfile(currentUser);
  }, [currentUser, loadProfile]);

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadProfile(user);
      } else {
        setUserProfile(null);
        console.log('[AuthContext] User signed out, profile cleared');
      }
      setLoadingAuth(false);
    });
    return unsub;
  }, [loadProfile]);

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const signUp = async (data: SignUpData) => {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const createdUser = cred.user;

    // Set display name in Firebase Auth
    await updateProfile(createdUser, { displayName: data.name });

    // Send verification email
    await sendEmailVerification(createdUser);

    // Write full profile to Firestore
    const profile: UserProfile = {
      uid:                        createdUser.uid,
      name:                       data.name,
      email:                      data.email,
      phone:                      data.phone,
      city:                       data.city,
      state:                      data.state,
      country:                    data.country,
      dateOfBirth:                data.dateOfBirth,
      panNumber:                  data.panNumber.toUpperCase(),
      aadhaarLast4:               data.aadhaarLast4,
      kycStatus:                  'PENDING',
      role:                       data.role ?? 'CUSTOMER',
      ...(data.shopName ? { shopName: data.shopName.trim() } : {}),
      ...(data.gstNumber ? { gstNumber: data.gstNumber.trim().toUpperCase() } : {}),
      phoneVerified:              false,
      totalGoldPurchasedGrams:    0,
      totalSilverPurchasedGrams:  0,
      totalInvestedInr:           0,
      createdAt:                  serverTimestamp(),
      updatedAt:                  serverTimestamp(),
    };

    await setDoc(doc(db, 'users', createdUser.uid), profile);

    // Attempt to create/sync record in backend DB
    (async () => {
      try {
        if (profile.role === 'OWNER') {
          // Create a shop/wholesaler row for owners
          await fetch('/api/parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'wholesaler',
              businessName: profile.shopName || profile.name,
              ownerName: profile.name,
              phone: profile.phone || null,
              email: profile.email || null,
              city: profile.city || null,
              state: profile.state || null,
              address: null,
            }),
          });
        } else {
          await fetch('/api/parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'customer',
              name: profile.name,
              phone: profile.phone,
              email: profile.email,
              shopName: profile.shopName || null,
              totalPurchases: 0,
              lastPurchaseDate: null,
            }),
          });
        }
      } catch (err) {
        console.warn('[AuthContext] Failed to sync to backend', err);
      }
    })();

    // Also ensure Firestore has a shops document for owners and register customer under shop
    try {
      if (profile.role === 'OWNER') {
        const shopRef = doc(db, 'shops', createdUser.uid);
        await setDoc(shopRef, {
          id: createdUser.uid,
          name: profile.shopName || profile.name,
          ownerUid: createdUser.uid,
          ownerName: profile.name,
          email: profile.email || null,
          phone: profile.phone || null,
          city: profile.city || null,
          state: profile.state || null,
          country: profile.country || null,
          panNumber: profile.panNumber || null,
          gstNumber: (profile as any).gstNumber || null,
          aadhaarLast4: profile.aadhaarLast4 || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (profile.role === 'CUSTOMER' && profile.shopName) {
        // Find shop by name and add customer under its customers subcollection
        const shopQuery = query(collection(db, 'shops'), where('name', '==', profile.shopName), limit(1));
        const shopSnap = await getDocs(shopQuery);
        if (!shopSnap.empty) {
          const shopDoc = shopSnap.docs[0];
          const custRef = doc(db, `shops/${shopDoc.id}/customers`, createdUser.uid);
          await setDoc(custRef, {
            uid: createdUser.uid,
            name: profile.name,
            email: profile.email || null,
            phone: profile.phone || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to create shop/customer in Firestore', err);
    }

    // Sign the user OUT immediately so they must verify their email before using the app
    await firebaseSignOut(auth);
  };

  // ── Sign In (email + password) ───────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // No forced sign-out for unverified users. Email verification will be checked before transactions.
  };

  // ── Sign In with Phone + Password ────────────────────────────────────────
  // Looks up the user's email from Firestore by phone number, then signs in.
  const signInWithPhonePassword = async (phone: string, password: string) => {
    const normalised = phone.trim();
    const q = query(
      collection(db, 'users'),
      where('phone', '==', normalised),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('No account found with this phone number.');
    }
    const profileData = snap.docs[0].data() as UserProfile;
    if (!profileData.email) {
      throw new Error('Account has no email. Please sign in with your email instead.');
    }
    await signIn(profileData.email, password);
  };

  // ── Send Email OTP (magic link) ──────────────────────────────────────────
  const sendOtp = async (email: string) => {
    const actionCodeSettings = {
      url:             ACTION_CODE_URL,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save email locally so we can complete sign-in on the same device
    localStorage.setItem(OTP_EMAIL_KEY, email);
  };
    // ── Google Sign In ───────────────────────────────────────────────────────
    const signInWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        console.log('[AuthContext] signInWithGoogle', googleUser);
        // If new user, create Firestore profile
        const ref = doc(db, 'users', googleUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const profile: UserProfile = {
            uid: googleUser.uid,
            name: googleUser.displayName || '',
            email: googleUser.email || '',
            phone: googleUser.phoneNumber || '',
            city: '', state: '', country: '', dateOfBirth: '', panNumber: '', aadhaarLast4: '',
            kycStatus: 'PENDING', role: 'CUSTOMER', totalGoldPurchasedGrams: 0, totalSilverPurchasedGrams: 0, totalInvestedInr: 0,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          };
          await setDoc(ref, profile);
          console.log('[AuthContext] Google user profile created', googleUser.uid);
          // Sync to backend customers table
          (async () => {
            try {
              await fetch('/api/parties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'customer',
                  name: profile.name,
                  phone: profile.phone,
                  email: profile.email,
                  shopName: profile.shopName || null,
                  totalPurchases: 0,
                  lastPurchaseDate: null,
                }),
              });
            } catch (err) {
              console.warn('[AuthContext] Failed to sync Google user to backend', err);
            }
          })();
          // Also create shop doc for owners or register customer under shop in Firestore
          try {
            if (profile.role === 'OWNER') {
              const shopRef = doc(db, 'shops', googleUser.uid);
              await setDoc(shopRef, {
                id: googleUser.uid,
                name: profile.shopName || profile.name,
                ownerUid: googleUser.uid,
                ownerName: profile.name,
                email: profile.email || null,
                phone: profile.phone || null,
                city: profile.city || null,
                state: profile.state || null,
                country: profile.country || null,
                gstNumber: profile.panNumber || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } else if (profile.role === 'CUSTOMER' && profile.shopName) {
              const shopQuery = query(collection(db, 'shops'), where('name', '==', profile.shopName), limit(1));
              const shopSnap = await getDocs(shopQuery);
              if (!shopSnap.empty) {
                const shopDoc = shopSnap.docs[0];
                const custRef = doc(db, `shops/${shopDoc.id}/customers`, googleUser.uid);
                await setDoc(custRef, {
                  uid: googleUser.uid,
                  name: profile.name,
                  email: profile.email || null,
                  phone: profile.phone || null,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
            }
          } catch (err) {
            console.warn('[AuthContext] Failed to create shop/customer in Firestore for Google user', err);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Google sign-in error', err);
        throw err;
      }
    };

  // ── Verify email OTP (called on /auth/verify page) ──────────────────────
  const verifyOtp = async (): Promise<{ success: boolean; email: string | null }> => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      return { success: false, email: null };
    }
    let email = localStorage.getItem(OTP_EMAIL_KEY);
    if (!email) {
      // Fallback: ask the user (cross-device flow)
      email = window.prompt('Please enter your email to confirm sign-in') || '';
    }
    if (!email) return { success: false, email: null };

    await signInWithEmailLink(auth, email, window.location.href);
    localStorage.removeItem(OTP_EMAIL_KEY);
    return { success: true, email };
  };

  // ── Sign Out ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
    console.log('[AuthContext] signOut called');
  };

  // ── Update last login timestamp ──────────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        lastLoginAt: serverTimestamp(),
        updatedAt:   serverTimestamp(),
      }).catch(() => {}); // silently ignore if doc doesn't exist yet
      console.log('[AuthContext] Updated lastLoginAt for', currentUser.uid);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loadingAuth,
      signUp,
      signIn,
      signInWithPhonePassword,
      sendOtp,
      verifyOtp,
      signOut,
      refreshProfile,
      signInWithGoogle,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
