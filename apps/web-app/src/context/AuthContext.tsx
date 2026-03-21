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
  signInWithCustomToken,
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
import { generateCustomerId, generateShopId, generateOwnerCode } from '../utils/bizId';

const UNASSIGNED_SHOP_NAME = 'unassigned-customers';
const UNASSIGNED_SHOP_ID = 'UNASSIGNED';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  bizCustomerId?: string;           // BIZ-CUST-XXXXXXXX (stable)
  bizShopId?: string;               // BIZ-SHOP-XXXXXXXX (owners only)
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
  role: 'CUSTOMER' | 'STAFF' | 'OWNER' | 'SUPER_ADMIN';
  shopName?: string;             // for OWNER/STAFF accounts
  shopId?: string;
  ownerCode?: string;            // code shared by owner to onboard customers
  gstNumber?: string;            // GST registration number (OWNER)
  hallmarkLicenseNumber?: string;
  aadhaarNumber?: string;
  businessAddress?: string;
  businessPincode?: string;
  shopVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  shopVerificationRequestedAt?: any;
  shopVerificationReviewedAt?: any;
  shopVerificationReviewedBy?: string;
  shopVerificationNote?: string;
  shopVerified?: boolean;
  nominee?: {
    name?: string;
    relation?: string;
    phone?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    updatedAt?: any;
  };
  phoneVerified?: boolean;
  manualEmailVerified?: boolean;
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
  aadhaarNumber?: string;
  role?: 'CUSTOMER' | 'OWNER';
  shopName?: string;
  ownerCode?: string;
  gstNumber?: string;  // GST registration number (required for OWNER)
  hallmarkLicenseNumber?: string;
  businessAddress?: string;
  businessPincode?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loadingAuth: boolean;
  signUp: (data: SignUpData, onProgress?: (stepId: string, status: 'running' | 'done' | 'error', detail?: string) => void) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPhonePassword: (phone: string, password: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: () => Promise<{ success: boolean; email: string | null }>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, code: string) => Promise<{ valid: boolean }>;
  verifyPhoneOtpAndLogin: (phone: string, code: string) => Promise<{ valid: boolean }>;
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

  // Normalize phone input to E.164-like format used across the app (best-effort)
  function normalizePhone(raw: string): string {
    if (!raw) return raw;
    let s = String(raw).trim();
    // keep leading + if present, remove all other non-digits
    if (s.startsWith('+')) {
      s = '+' + s.slice(1).replace(/\D/g, '');
      return s;
    }
    // remove non-digits
    s = s.replace(/\D/g, '');
    // if 10 digits → assume Indian local number, add +91
    if (s.length === 10) return '+91' + s;
    // if already starts with 91 and 12 digits, add +
    if (s.length === 12 && s.startsWith('91')) return '+' + s;
    // fallback: prefix + if missing
    return s.startsWith('+') ? s : ('+' + s);
  }

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
        // console.log('[AuthContext] User signed out, profile cleared');
      }
      setLoadingAuth(false);
    });
    return unsub;
  }, [loadProfile]);

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const signUp = async (
    data: SignUpData,
    onProgress?: (stepId: string, status: 'running' | 'done' | 'error', detail?: string) => void,
  ) => {
    const role = data.role ?? 'CUSTOMER';
    const aadhaarDigits = (data.aadhaarNumber ?? '').replace(/\D/g, '');
    const aadhaarLast4 = aadhaarDigits ? aadhaarDigits.slice(-4) : (data.aadhaarLast4 || '').trim();

    if (role === 'OWNER') {
      if (!data.panNumber?.trim()) throw new Error('PAN number is required for shop owner signup.');
      if (!data.gstNumber?.trim()) throw new Error('GST number is required for shop owner signup.');
      if (!data.hallmarkLicenseNumber?.trim()) throw new Error('Hallmark license number is required for shop owner signup.');
      if (!/^\d{12}$/.test(aadhaarDigits)) throw new Error('Aadhaar number must be exactly 12 digits for shop owner signup.');
      if (!data.businessAddress?.trim()) throw new Error('Business address is required for shop owner signup.');
    }

    let resolvedShopName = (data.shopName ?? '').trim().toLowerCase();
    const ownerCodeInput = (data.ownerCode ?? '').trim().toUpperCase();

    if (role === 'CUSTOMER') {
      if (!ownerCodeInput) {
        resolvedShopName = UNASSIGNED_SHOP_NAME;
      } else {
        const shopByCode = await getDocs(query(collection(db, 'shops'), where('ownerCode', '==', ownerCodeInput), limit(1)));
        if (shopByCode.empty) {
          throw new Error(`Owner code "${ownerCodeInput}" not found. Please confirm with your shop owner.`);
        }
        const found = shopByCode.docs[0];
        resolvedShopName = String(found.data()?.name ?? '').trim().toLowerCase();
      }
    }

    let ownerCode = ownerCodeInput;
    if (role === 'OWNER') {
      ownerCode = '';
      for (let i = 0; i < 8; i++) {
        const candidate = generateOwnerCode(data.name || data.shopName || 'SHOP');
        const existing = await getDocs(query(collection(db, 'shops'), where('ownerCode', '==', candidate), limit(1)));
        if (existing.empty) {
          ownerCode = candidate;
          break;
        }
      }
      if (!ownerCode) {
        throw new Error('Could not generate a unique owner code. Please retry signup.');
      }
    }

    // ── Step 1: Create Firebase Auth account ──────────────────────────────
    // IMPORTANT: we create the auth user FIRST so all subsequent Firestore
    // operations run as an authenticated user and pass security rules.
    onProgress?.('create-auth', 'running');
    let createdUser: User;
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      createdUser = cred.user;
    } catch (err: any) {
      onProgress?.('create-auth', 'error', err?.message);
      throw err;
    }
    onProgress?.('create-auth', 'done');

    // Force-refresh token so Firestore immediately recognises this user
    await createdUser.getIdToken(true);

    // Set display name in Firebase Auth
    await updateProfile(createdUser, { displayName: data.name });

    // ── Step 2: Send email verification ───────────────────────────────────
    onProgress?.('verify-email', 'running');
    try {
      await sendEmailVerification(createdUser);
      onProgress?.('verify-email', 'done');
    } catch (err: any) {
      // console.warn('[signUp] sendEmailVerification failed (non-fatal):', err?.message);
      onProgress?.('verify-email', 'done'); // treat as non-fatal
    }

    // Build Firestore profile object
    const profile: UserProfile = {
      uid:                        createdUser.uid,
      ...(role === 'CUSTOMER' ? { bizCustomerId: generateCustomerId() } : {}),
      ...(role === 'OWNER' ? { bizShopId: generateShopId() } : {}),
      name:                       data.name,
      email:                      data.email,
      phone:                      data.phone,
      city:                       role === 'OWNER' ? '' : data.city,
      state:                      role === 'OWNER' ? '' : data.state,
      country:                    role === 'OWNER' ? '' : data.country,
      dateOfBirth:                role === 'OWNER' ? '' : data.dateOfBirth,
      panNumber:                  (data.panNumber || '').trim().toUpperCase(),
      aadhaarLast4,
      ...(aadhaarDigits ? { aadhaarNumber: aadhaarDigits } : {}),
      kycStatus:                  'PENDING',
      role,
      ...(resolvedShopName ? { shopName: resolvedShopName } : {}),
      ...(role === 'OWNER' ? { shopId: createdUser.uid } : {}),
      ...(role === 'CUSTOMER' && !ownerCode ? { shopId: UNASSIGNED_SHOP_ID } : {}),
      ...(ownerCode ? { ownerCode } : {}),
      ...(data.gstNumber ? { gstNumber: data.gstNumber.trim().toUpperCase() } : {}),
      ...(data.hallmarkLicenseNumber ? { hallmarkLicenseNumber: data.hallmarkLicenseNumber.trim().toUpperCase() } : {}),
      ...(data.businessAddress ? { businessAddress: data.businessAddress.trim() } : {}),
      ...(data.businessPincode ? { businessPincode: data.businessPincode.trim() } : {}),
      ...(role === 'OWNER' ? {
        shopVerificationStatus: 'PENDING' as const,
        shopVerificationRequestedAt: serverTimestamp(),
        shopVerified: false,
      } : {}),
      phoneVerified:              false,
      totalGoldPurchasedGrams:    0,
      totalSilverPurchasedGrams:  0,
      totalInvestedInr:           0,
      createdAt:                  serverTimestamp(),
      updatedAt:                  serverTimestamp(),
    };

    // ── Step 3: Save profile to Firestore ─────────────────────────────────
    // User is now authenticated, so security rules allow this write.
    onProgress?.('save-profile', 'running');
    try {
      await setDoc(doc(db, 'users', createdUser.uid), profile);
      onProgress?.('save-profile', 'done');
    } catch (fsErr: any) {
      // Gather additional auth/token diagnostics when permission issues occur
      let tokenDiag: Record<string, any> | null = null;
      try {
        const idr = await createdUser.getIdTokenResult();
        tokenDiag = {
          uid: createdUser.uid,
          authTime: idr.authTime,
          issuedAtTime: idr.issuedAtTime,
          expirationTime: idr.expirationTime,
          signInProvider: idr.signInProvider,
          claims: idr.claims,
        };
      } catch (tErr) {
        tokenDiag = { errorGettingIdTokenResult: (tErr as any)?.message ?? String(tErr) };
      }

      const detail = fsErr?.code === 'permission-denied'
        ? 'Firestore permission denied — rules may not be deployed. Run: firebase deploy --only firestore:rules'
        : (fsErr?.message ?? 'Unknown error');

      onProgress?.('save-profile', 'error', detail + (tokenDiag ? ` | tokenDiag: ${JSON.stringify(tokenDiag)}` : ''));
      // console.error('[signUp] Firestore profile write failed:', fsErr?.code, fsErr?.message, fsErr);
      // console.error('[signUp] Token diagnostic:', tokenDiag);
      await firebaseSignOut(auth).catch(() => {});
      throw new Error('Failed to save profile: ' + (fsErr?.message ?? 'permission-denied'));
    }

    // Write phone → email index for phone-based sign-in (non-blocking, best-effort)
    // phoneIndex has public reads so phone-login works without auth
    if (data.phone && data.phone.trim().length > 4) {
      try {
        const normalizedPhone = normalizePhone(data.phone);
        setDoc(doc(db, 'phoneIndex', normalizedPhone), {
          email:     data.email,
          uid:       createdUser.uid,
          updatedAt: serverTimestamp(),
        }).catch((e: any) => {}); // console.warn('[signUp] phoneIndex write (non-fatal):', e?.message);
      } catch (e) {
        // console.warn('[signUp] phone normalization failed:', e);
      }
    }

    // Attempt to create/sync record in backend DB (non-blocking — never stalls signup)
    (async () => {
      try {
        if (profile.role === 'OWNER') {
          await fetch('/api/parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'wholesaler',
              businessName: profile.shopName || profile.name,
              ownerName: profile.name,
              phone: profile.phone || null,
              email: profile.email || null,
              city: null,
              state: null,
              address: (profile as any).businessAddress || null,
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
        // console.warn('[AuthContext] Backend party sync failed (non-fatal):', err);
      }
    })();

    // ── Step 4: Shop / customer Firestore setup ───────────────────────────
    try {
      if (profile.role === 'OWNER') {
        onProgress?.('setup-shop', 'running');
        const shopRef = doc(db, 'shops', createdUser.uid);
        await setDoc(shopRef, {
          id:          createdUser.uid,
          bizShopId:   profile.bizShopId ?? generateShopId(),
          name:        profile.shopName || profile.name,
          ownerCode:   profile.ownerCode || ownerCode,
          ownerUid:    createdUser.uid,
          ownerName:   profile.name,
          email:       profile.email || null,
          phone:       profile.phone || null,
          city:        null,
          state:       null,
          country:     null,
          businessAddress: (profile as any).businessAddress || null,
          businessPincode: (profile as any).businessPincode || null,
          panNumber:   profile.panNumber || null,
          gstNumber:   (profile as any).gstNumber || null,
          hallmarkLicenseNumber: (profile as any).hallmarkLicenseNumber || null,
          aadhaarNumber: (profile as any).aadhaarNumber || null,
          aadhaarLast4: profile.aadhaarLast4 || null,
          verificationStatus: 'PENDING',
          verificationRequestedAt: serverTimestamp(),
          verificationReviewedAt: null,
          verificationReviewedBy: null,
          verificationNote: `Please email KYC documents to contact@bizmation.in with owner code ${profile.ownerCode || ownerCode}.`,
          verified: false,
          createdAt:   serverTimestamp(),
          updatedAt:   serverTimestamp(),
        });
        onProgress?.('setup-shop', 'done');
      } else if (profile.role === 'CUSTOMER' && profile.ownerCode) {
        onProgress?.('link-shop', 'running');
        const shopQuery = query(collection(db, 'shops'), where('ownerCode', '==', profile.ownerCode), limit(1));
        const shopSnap  = await getDocs(shopQuery);
        if (!shopSnap.empty) {
          const shopDoc = shopSnap.docs[0];
          const linkedShopName = String(shopDoc.data()?.name ?? '').trim().toLowerCase();
          // Store shopId in user profile for fast lookups later
          await updateDoc(doc(db, 'users', createdUser.uid), {
            shopId:    shopDoc.id,
            shopName:  linkedShopName,
            ownerCode: profile.ownerCode,
            updatedAt: serverTimestamp(),
          });
          // Create customer sub-doc under the shop
          await setDoc(doc(db, `shops/${shopDoc.id}/customers`, createdUser.uid), {
            uid:          createdUser.uid,
            bizCustomerId: profile.bizCustomerId ?? generateCustomerId(),
            name:         profile.name,
            email:        profile.email || null,
            phone:        profile.phone || null,
            createdAt:    serverTimestamp(),
            updatedAt:    serverTimestamp(),
          });
          onProgress?.('link-shop', 'done');
        } else {
          onProgress?.('link-shop', 'error', `Owner code "${profile.ownerCode}" not found.`);
          // console.warn('[signUp] No shop found with ownerCode:', profile.ownerCode);
        }
      }
    } catch (err: any) {
      const stepId = profile.role === 'OWNER' ? 'setup-shop' : 'link-shop';
      onProgress?.(stepId, 'error', err?.message);
      // console.warn('[AuthContext] Shop/customer setup failed (non-fatal):', err?.message);
    }

    // Sign the user OUT — they must verify email before using the app
    await firebaseSignOut(auth);
  };

  // ── Sign In (email + password) ───────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // No forced sign-out for unverified users. Email verification will be checked before transactions.
  };

  // ── Sign In with Phone + Password ────────────────────────────────────────
  // Reads the phoneIndex collection (public reads — no auth required) to find
  // the email linked to this phone number, then signs in with email + password.
  const signInWithPhonePassword = async (phone: string, password: string) => {
    const normalised = normalizePhone(phone);
    // phoneIndex is a public collection — getDoc works without authentication
    let indexSnap = await getDoc(doc(db, 'phoneIndex', normalised));
    if (!indexSnap.exists()) {
      // Fallback: try raw trimmed value (legacy entries may be stored without normalization)
      const legacyKey = phone.trim();
      if (legacyKey !== normalised) {
        indexSnap = await getDoc(doc(db, 'phoneIndex', legacyKey));
      }
    }
    if (!indexSnap.exists()) {
      throw new Error('No account found with this phone number. Please sign in with your email or create an account.');
    }
    const email = indexSnap.data()?.email as string | undefined;
    if (!email) {
      throw new Error('Phone account has no linked email. Please sign in with your email instead.');
    }
    await signIn(email, password);
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
  // ── Phone OTP via Twilio Worker (Cloudflare) ────────────────────────────
  // All three functions below call the deployed Twilio Cloudflare Worker.
  // Set VITE_TWILIO_WORKER_URL in Cloudflare Pages → Settings → Environment Variables
  // Value: the URL of your deployed twilio-otp-worker, e.g.
  //   https://twilio-otp-worker.<your-subdomain>.workers.dev
  function twilioWorkerBase(): string {
    const url = (import.meta.env.VITE_TWILIO_WORKER_URL as string) || '';
    if (!url) {
      // console.warn(
      //  '[OTP] VITE_TWILIO_WORKER_URL is not set.\n'
      //  + '  Add it in Cloudflare Pages → Settings → Environment Variables\n'
      //  + '  Value: https://twilio-otp-worker.<subdomain>.workers.dev'
      //);
    }
    return url;
  }

  const sendPhoneOtp = async (phone: string): Promise<void> => {
    const base = twilioWorkerBase();
    const normalizedPhone = normalizePhone(phone);
    const url = `${base}/api/auth/send-otp`;
    // console.log('[sendPhoneOtp] →', url, normalizedPhone);

    let res: Response;
    try {
      res = await fetch(url, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ phone: normalizedPhone }),
      });
    } catch (fetchErr: any) {
      // console.error('[sendPhoneOtp] Network error:', fetchErr);
      throw new Error(`Network error calling Twilio Worker. Check VITE_TWILIO_WORKER_URL. (${fetchErr?.message})`);
    }

    let json: any;
    try { json = await res.json(); } catch { json = {}; }
    // console.log('[sendPhoneOtp] status:', res.status, json);
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
  };

  const verifyPhoneOtp = async (phone: string, code: string): Promise<{ valid: boolean }> => {
    const base = twilioWorkerBase();
    const normalizedPhone = normalizePhone(phone);
    const url = `${base}/api/auth/verify-otp`;
    // console.log('[verifyPhoneOtp] →', url);

    let res: Response;
    try {
      res = await fetch(url, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ phone: normalizedPhone, code }),
      });
    } catch (fetchErr: any) {
      throw new Error(`Network error calling Twilio Worker. (${fetchErr?.message})`);
    }

    let json: any;
    try { json = await res.json(); } catch { json = {}; }
    // console.log('[verifyPhoneOtp] status:', res.status, json);
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
    return { valid: json.valid ?? false };
  };

  // ── Phone OTP auto-login ──────────────────────────────────────────────────
  // Calls /api/auth/phone-login on the Twilio Worker which:
  //  1. Verifies OTP with Twilio
  //  2. Looks up UID in Firestore phoneIndex (public read)
  //  3. Returns a Firebase custom token → signInWithCustomToken logs the user in
  const verifyPhoneOtpAndLogin = async (phone: string, code: string): Promise<{ valid: boolean }> => {
    const base = twilioWorkerBase();
    const normalizedPhone = normalizePhone(phone);
    const url = `${base}/api/auth/phone-login`;
    // console.log('[verifyPhoneOtpAndLogin] →', url);

    let res: Response;
    try {
      res = await fetch(url, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ phone: normalizedPhone, code }),
      });
    } catch (fetchErr: any) {
      throw new Error(`Network error calling Twilio Worker. (${fetchErr?.message})`);
    }

    let json: any;
    try { json = await res.json(); } catch { json = {}; }
    // console.log('[verifyPhoneOtpAndLogin] status:', res.status, json);
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
    if (!json.customToken) throw new Error('Phone login failed — no token received.');

    await signInWithCustomToken(auth, json.customToken);
    return { valid: true };
  };

    // ── Google Sign In ───────────────────────────────────────────────────────
    const signInWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        // console.log('[AuthContext] signInWithGoogle', googleUser);
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
          // console.log('[AuthContext] Google user profile created', googleUser.uid);
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
              // console.warn('[AuthContext] Failed to sync Google user to backend', err);
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
            // console.warn('[AuthContext] Failed to create shop/customer in Firestore for Google user', err);
          }
        }
      } catch (err) {
        // console.error('[AuthContext] Google sign-in error', err);
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
    // console.log('[AuthContext] signOut called');
  };

  // ── Update last login timestamp ──────────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        lastLoginAt: serverTimestamp(),
        updatedAt:   serverTimestamp(),
      }).catch(() => {}); // silently ignore if doc doesn't exist yet
      // console.log('[AuthContext] Updated lastLoginAt for', currentUser.uid);
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
      sendPhoneOtp,
      verifyPhoneOtp,
      verifyPhoneOtpAndLogin,
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
