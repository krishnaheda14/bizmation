export interface GiftLookupResult {
    found: boolean;
    name?: string;
    uid?: string;
    phone?: string;
}
interface GiftTransferRequest {
    senderUid: string;
    receiverUid: string;
    metal: 'GOLD' | 'SILVER';
    mode: 'GRAMS' | 'INR';
    value: number;
    currentRate: number;
}
interface GiftTransferResponse {
    grams: number;
    amount: number;
}
export declare function lookupGiftReceiver(phone: string): Promise<GiftLookupResult>;
export declare function transferGift(request: GiftTransferRequest): Promise<GiftTransferResponse>;
export {};
//# sourceMappingURL=gift.d.ts.map