interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: {
        expirationTtl?: number;
    }): Promise<void>;
}
export interface Env {
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
    PAYMENTS_KV: KVNamespace;
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_CLIENT_EMAIL?: string;
    FIREBASE_PRIVATE_KEY?: string;
}
declare const _default: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map