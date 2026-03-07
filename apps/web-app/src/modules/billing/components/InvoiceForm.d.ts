/**
 * Invoice Form Component
 *
 * Handles GST-compliant billing with real-time gold rate fetching
 * and automatic price calculation
 */
import React from 'react';
interface CustomerDetails {
    id?: string;
    name: string;
    businessName?: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    trn?: string;
    loyaltyNumber?: string;
    loyaltyPoints?: number;
}
interface InvoiceFormData {
    customerId?: string;
    customerDetails?: CustomerDetails;
    items: TransactionItem[];
    discount: number;
    notes?: string;
}
interface InvoiceFormProps {
    onSubmit: (data: InvoiceFormData) => Promise<void>;
    onCancel: () => void;
    partyType?: 'customer' | 'wholesaler';
}
export declare const InvoiceForm: React.FC<InvoiceFormProps>;
export {};
//# sourceMappingURL=InvoiceForm.d.ts.map