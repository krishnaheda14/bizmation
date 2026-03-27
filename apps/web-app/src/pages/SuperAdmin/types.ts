export interface ShopRow {
  id: string;
  name?: string;
  ownerUid?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  ownerCode?: string;
  bizShopId?: string;
  city?: string;
  state?: string;
  country?: string;
  businessAddress?: string;
  businessPincode?: string;
  panNumber?: string;
  gstNumber?: string;
  hallmarkLicenseNumber?: string;
  aadhaarNumber?: string;
  aadhaarLast4?: string;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationRequestedAt?: any;
  verificationReviewedAt?: any;
  verificationReviewedBy?: string;
  verificationNote?: string;
  shopVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  shopVerificationNote?: string;
  verified?: boolean;
  blocked?: boolean;               // NEW for freezing/blocking
  transactionsFrozen?: boolean;    // NEW for freezing transactions
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

export interface UserRow {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  shopName?: string;
  shopId?: string;
  ownerCode?: string;
  bizCustomerId?: string;
  bizShopId?: string;
  city?: string;
  state?: string;
  country?: string;
  kycStatus?: string;
  totalGoldPurchasedGrams?: number;
  totalSilverPurchasedGrams?: number;
  totalInvestedInr?: number;
  phoneVerified?: boolean;
  shopVerificationStatus?: string;
  shopVerificationNote?: string;
  shopVerified?: boolean;
  manualEmailVerified?: boolean;  // NEW
  blocked?: boolean;               // NEW
  transactionsFrozen?: boolean;    // NEW
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

export interface PlatformOrderRow {
  id: string;
  type?: 'BUY' | 'SELL';
  status?: string;
  metal?: string;
  purity?: number;
  grams?: number;
  ratePerGram?: number;
  marketRatePerGram?: number;
  commissionPerGram?: number;
  shopCommissionInr?: number;
  totalAmountInr?: number;
  bullionBaseAmountInr?: number;
  bullionSettlementAmountInr?: number;
  bullionPayoutStatus?: string;
  customerUid?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  razorpayPaymentId?: string;
  shopId?: string;
  shopName?: string;
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

export interface CoinPurchaseRequestRow {
  id: string;
  status?: 'ACCEPTED' | 'APPROVED' | 'PREPARING' | 'READY_TO_DISPATCH' | 'DEPARTED' | 'REJECTED';
  source?: string;
  metal?: 'GOLD' | 'SILVER';
  weightGrams?: number;
  quantity?: number;
  estimatedRatePerGram?: number;
  makingChargesPerUnitInr?: number;
  makingChargesTotalInr?: number;
  totalAmountInr?: number;
  paymentStatus?: 'PAID' | 'FAILED' | 'PENDING';
  razorpayPaymentId?: string;
  paymentLockId?: string;
  orderStatusTimeline?: Array<{ status: string; at: string; by: string }>;
  customerUid?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryCity?: string;
  customerNote?: string;
  adminNote?: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  reviewedAt?: any;
  shopId?: string;
  shopName?: string;
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

export interface RedemptionRequestRow {
  id: string;
  requestType?: 'REDEEM' | 'SELL_TO_JEWELLER';
  status?: 'PENDING' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'CANCELLED';
  linkedOrderId?: string | null;
  customerUid?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shopId?: string;
  shopName?: string;
  metal?: 'GOLD' | 'SILVER' | string;
  purity?: number | string;
  grams?: number;
  marketRatePerGram?: number;
  redeemRatePerGram?: number;
  estimatedInr?: number;
  customerRequestedInr?: number;
  adminNote?: string;
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

export interface TabType {
  key: 'shops' | 'customers' | 'orders' | 'coin-requests' | 'redemptions' | 'stats';
  label: string;
}
