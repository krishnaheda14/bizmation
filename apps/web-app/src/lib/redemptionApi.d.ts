export type RedemptionTelegramEvent = 'CREATED' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'CANCELLED';
export interface RedemptionTelegramPayload {
    event: RedemptionTelegramEvent;
    requestId: string;
    status: string;
    customerName?: string;
    customerPhone?: string;
    shopName?: string;
    metal?: string;
    purity?: number | string;
    grams?: number;
    redeemRatePerGram?: number;
    estimatedInr?: number;
    note?: string;
    actorName?: string;
}
export declare function notifyRedemptionTelegram(payload: RedemptionTelegramPayload): Promise<boolean>;
//# sourceMappingURL=redemptionApi.d.ts.map