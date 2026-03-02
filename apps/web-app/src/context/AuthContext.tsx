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
      }
      setLoadingAuth(false);
    });
    return unsub;
  }, [loadProfile]);

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const signUp = async (data: SignUpData) => {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = cred.user;

    // Set display name in Firebase Auth
    await updateProfile(user, { displayName: data.name });

    // Send verification email
    await sendEmailVerification(user);

    // Write full profile to Firestore
    const profile: UserProfile = {
      uid:                        user.uid,
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
      phoneVerified:              false,
      totalGoldPurchasedGrams:    0,
      totalSilverPurchasedGrams:  0,
      totalInvestedInr:           0,
      createdAt:                  serverTimestamp(),
      updatedAt:                  serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), profile);

    // Sign the user OUT immediately so they must verify their email before using the app
    await firebaseSignOut(auth);
  };

  // ── Sign In (email + password) ───────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    // Enforce email verification
    if (!user.emailVerified) {
      await firebaseSignOut(auth);
      const err = new Error('EMAIL_NOT_VERIFIED');
      (err as any).code = 'auth/email-not-verified';
      throw err;
    }
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
  };

  // ── Update last login timestamp ──────────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        lastLoginAt: serverTimestamp(),
        updatedAt:   serverTimestamp(),
      }).catch(() => {}); // silently ignore if doc doesn't exist yet
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, loadingAuth,
      signUp, signIn, signInWithPhonePassword, sendOtp, verifyOtp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
