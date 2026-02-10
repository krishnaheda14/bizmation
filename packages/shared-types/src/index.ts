/**
 * Shared TypeScript types for Jewelry Retail Platform
 * Used across web app, mobile app, and backend
 */

// ==================== ENUMS ====================

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  SALESPERSON = 'SALESPERSON',
  ACCOUNTANT = 'ACCOUNTANT',
}

export enum MetalType {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export enum ProductCategory {
  NECKLACE = 'NECKLACE',
  RING = 'RING',
  EARRING = 'EARRING',
  BRACELET = 'BRACELET',
  BANGLE = 'BANGLE',
  PENDANT = 'PENDANT',
  CHAIN = 'CHAIN',
  NOSERING = 'NOSERING',
  ANKLET = 'ANKLET',
  OTHER = 'OTHER',
}

export enum TransactionType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  EXCHANGE = 'EXCHANGE',
  REPAIR = 'REPAIR',
  CUSTOM_ORDER = 'CUSTOM_ORDER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  NET_BANKING = 'NET_BANKING',
  CHEQUE = 'CHEQUE',
  EMI = 'EMI',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  CANCELLED = 'CANCELLED',
}

// ==================== BASE TYPES ====================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface SyncEntity extends BaseEntity {
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  version: number;
  localId?: string; // For offline-first tracking
}

// ==================== USER & AUTH ====================

export interface User extends BaseEntity {
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  shopId: string;
  isActive: boolean;
  passwordHash?: string; // Not sent to frontend
  lastLoginAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
  shop: Shop;
}

// ==================== SHOP ====================

export interface Shop extends BaseEntity {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  gstNumber: string;
  address: Address;
  logo?: string;
  isActive: boolean;
  subscriptionTier: 'FREE' | 'BASIC' | 'PREMIUM';
  subscriptionExpiresAt?: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

// ==================== METAL LOT ====================

export interface MetalLot extends SyncEntity {
  shopId: string;
  metalType: MetalType;
  purity: number; // e.g., 22, 18, 24 for gold
  weightGrams: number;
  purchaseDate: Date;
  purchaseRate: number; // Per gram
  totalCost: number;
  supplier: string;
  invoiceNumber?: string;
  remainingWeightGrams: number; // Updated as products are made
  notes?: string;
}

// ==================== PRODUCT ====================

export interface Product extends SyncEntity {
  shopId: string;
  metalLotId?: string; // Link to metal lot
  sku: string; // Barcode/RFID
  name: string;
  category: ProductCategory;
  metalType: MetalType;
  purity: number;
  grossWeightGrams: number;
  netWeightGrams: number; // After deducting stones
  stoneWeightCarats?: number;
  makingCharges: number;
  wastagePercentage: number;
  customDesign: boolean;
  hsnCode: string; // For GST
  isHallmarked: boolean;
  hallmarkNumber?: string;
  images: string[]; // URLs to images
  tags: string[]; // AI-generated tags
  description?: string; // AI-generated
  costPrice: number; // Auto-calculated
  sellingPrice: number;
  isAvailable: boolean;
  location?: string; // Shelf/box number
}

export interface ProductValuation {
  metalValue: number;
  makingCharges: number;
  stoneValue: number;
  gstAmount: number;
  totalValue: number;
  currentGoldRate: number;
}

// ==================== CUSTOMER ====================

export interface Customer extends SyncEntity {
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  address?: Address;
  gstNumber?: string; // For B2B customers
  panNumber?: string;
  dateOfBirth?: Date;
  anniversary?: Date;
  notes?: string;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  loyaltyPoints: number;
}

// ==================== TRANSACTION ====================

export interface Transaction extends SyncEntity {
  shopId: string;
  invoiceId: string;
  customerId?: string;
  type: TransactionType;
  items: TransactionItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  discount: number;
  roundOff: number;
  grandTotal: number;
  payments: Payment[];
  amountPaid: number;
  balanceAmount: number;
  createdBy: string; // userId
  notes?: string;
}

export interface TransactionItem {
  productId?: string;
  product?: Product; // For display
  description: string;
  quantity: number;
  weightGrams?: number;
  rate: number;
  makingCharges: number;
  amount: number;
  gstRate: number;
  gstAmount: number;
  hsnCode: string;
}

export interface Payment {
  method: PaymentMethod;
  amount: number;
  reference?: string; // UPI ID, Card last 4 digits, Cheque number
  timestamp: Date;
}

// ==================== INVOICE ====================

export interface Invoice extends SyncEntity {
  shopId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerId?: string;
  customer?: Customer;
  transactionId: string;
  status: InvoiceStatus;
  billToAddress?: Address;
  shipToAddress?: Address;
  items: TransactionItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  discount: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  balanceAmount: number;
  dueDate?: Date;
  eInvoiceNumber?: string; // e-Invoice IRN
  qrCode?: string; // For e-Invoice
  notes?: string;
  termsAndConditions?: string;
}

// ==================== GOLD RATE ====================

export interface GoldRate extends BaseEntity {
  metalType: MetalType;
  purity: number;
  ratePerGram: number;
  source: string; // API name or 'MANUAL'
  effectiveDate: Date;
  isActive: boolean;
}

export interface GoldRateUpdate {
  metalType: MetalType;
  purity: number;
  ratePerGram: number;
}

// ==================== REPORTS ====================

export interface DailySalesReport {
  date: Date;
  totalSales: number;
  totalPurchases: number;
  totalTransactions: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  categoryBreakdown: Record<ProductCategory, number>;
  metalBreakdown: Record<MetalType, number>;
}

export interface StockReport {
  totalProducts: number;
  availableProducts: number;
  soldProducts: number;
  totalStockValue: number;
  metalWiseValue: Record<MetalType, number>;
  categoryWiseCount: Record<ProductCategory, number>;
  deadStock: Product[]; // Products not sold in 6+ months
}

export interface CustomerReport {
  totalCustomers: number;
  newCustomersThisMonth: number;
  topCustomers: Array<{
    customer: Customer;
    totalSpent: number;
    lastPurchase: Date;
  }>;
}

// ==================== SYNC ====================

export interface SyncOperation {
  id: string;
  entity: 'PRODUCT' | 'TRANSACTION' | 'CUSTOMER' | 'INVOICE' | 'METAL_LOT';
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: Date;
  status: SyncStatus;
  retryCount: number;
  error?: string;
}

export interface SyncConflict {
  id: string;
  entity: string;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  timestamp: Date;
  resolved: boolean;
}

export interface SyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: SyncConflict[];
  lastSyncTimestamp: Date;
}

// ==================== AI FEATURES ====================

export interface ImageProcessingRequest {
  imageUrl: string;
  operations: Array<'REMOVE_BACKGROUND' | 'AUTO_TAG' | 'DESCRIBE'>;
}

export interface ImageProcessingResponse {
  processedImageUrl?: string;
  tags?: string[];
  description?: string;
  confidence: number;
}

export interface ARTryOnRequest {
  productId: string;
  userImageUrl: string;
  category: ProductCategory;
}

export interface ARTryOnResponse {
  overlayImageUrl: string;
  positions: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

export interface PredictiveInsight {
  type: 'DEAD_STOCK' | 'REORDER_ALERT' | 'SALES_FORECAST' | 'PRICE_SUGGESTION';
  title: string;
  description: string;
  data: any;
  confidence: number;
  createdAt: Date;
}

// ==================== NOTIFICATIONS ====================

export interface Notification extends BaseEntity {
  userId: string;
  shopId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isRead: boolean;
  actionUrl?: string;
  data?: any;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== SETTINGS ====================

export interface ShopSettings extends BaseEntity {
  shopId: string;
  goldRateSource: string;
  autoUpdateGoldRate: boolean;
  defaultGstRate: number;
  defaultMakingCharges: number;
  defaultWastagePercentage: number;
  invoicePrefix: string;
  invoiceStartNumber: number;
  termsAndConditions: string;
  enableOfflineMode: boolean;
  syncInterval: number; // minutes
  lowStockThreshold: number;
  currency: string;
  dateFormat: string;
  timeFormat: string;
}

// ==================== AUDIT LOG ====================

export interface AuditLog extends BaseEntity {
  shopId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}
