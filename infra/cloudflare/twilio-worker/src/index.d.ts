export interface Env {
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_VERIFY_SERVICE_SID: string;
    FIREBASE_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
    FIREBASE_PRIVATE_KEY: string;
}
declare const _default: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map