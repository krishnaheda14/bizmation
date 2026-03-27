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
import React from 'react';
import { User } from 'firebase/auth';
export interface UserProfile {
    uid: string;
    bizCustomerId?: string;
    bizShopId?: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    country: string;
    dateOfBirth: string;
    panNumber: string;
    aadhaarLast4: string;
    kycStatus: 'PENDING' | 'VERIFIED';
    role: 'CUSTOMER' | 'STAFF' | 'OWNER' | 'SUPER_ADMIN';
    shopName?: string;
    shopId?: string;
    ownerCode?: string;
    gstNumber?: string;
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
    gstNumber?: string;
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
    verifyOtp: () => Promise<{
        success: boolean;
        email: string | null;
    }>;
    sendPhoneOtp: (phone: string) => Promise<void>;
    verifyPhoneOtp: (phone: string, code: string) => Promise<{
        valid: boolean;
    }>;
    verifyPhoneOtpAndLogin: (phone: string, code: string) => Promise<{
        valid: boolean;
    }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
}
export declare const AuthProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useAuth: () => AuthContextType;
export {};
//# sourceMappingURL=AuthContext.d.ts.map