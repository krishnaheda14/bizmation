/**
 * Shared TypeScript types for Jewelry Retail Platform
 * Used across web app, mobile app, and backend
 */
// ==================== ENUMS ====================
export var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["SALESPERSON"] = "SALESPERSON";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
})(UserRole || (UserRole = {}));
export var MetalType;
(function (MetalType) {
    MetalType["GOLD"] = "GOLD";
    MetalType["SILVER"] = "SILVER";
    MetalType["PLATINUM"] = "PLATINUM";
    MetalType["DIAMOND"] = "DIAMOND";
})(MetalType || (MetalType = {}));
export var ProductCategory;
(function (ProductCategory) {
    ProductCategory["NECKLACE"] = "NECKLACE";
    ProductCategory["RING"] = "RING";
    ProductCategory["EARRING"] = "EARRING";
    ProductCategory["BRACELET"] = "BRACELET";
    ProductCategory["BANGLE"] = "BANGLE";
    ProductCategory["PENDANT"] = "PENDANT";
    ProductCategory["CHAIN"] = "CHAIN";
    ProductCategory["NOSERING"] = "NOSERING";
    ProductCategory["ANKLET"] = "ANKLET";
    ProductCategory["OTHER"] = "OTHER";
})(ProductCategory || (ProductCategory = {}));
export var TransactionType;
(function (TransactionType) {
    TransactionType["SALE"] = "SALE";
    TransactionType["PURCHASE"] = "PURCHASE";
    TransactionType["EXCHANGE"] = "EXCHANGE";
    TransactionType["REPAIR"] = "REPAIR";
    TransactionType["CUSTOM_ORDER"] = "CUSTOM_ORDER";
})(TransactionType || (TransactionType = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["NET_BANKING"] = "NET_BANKING";
    PaymentMethod["CHEQUE"] = "CHEQUE";
    PaymentMethod["EMI"] = "EMI";
})(PaymentMethod || (PaymentMethod = {}));
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["PENDING"] = "PENDING";
    SyncStatus["SYNCING"] = "SYNCING";
    SyncStatus["SYNCED"] = "SYNCED";
    SyncStatus["FAILED"] = "FAILED";
    SyncStatus["CONFLICT"] = "CONFLICT";
})(SyncStatus || (SyncStatus = {}));
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["ISSUED"] = "ISSUED";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
})(InvoiceStatus || (InvoiceStatus = {}));
//# sourceMappingURL=index.js.map