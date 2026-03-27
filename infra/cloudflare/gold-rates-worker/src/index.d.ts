interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: {
        expirationTtl?: number;
    }): Promise<void>;
}
interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
}
interface ScheduledEvent {
    cron: string;
    scheduledTime: number;
}
export interface Env {
    GOLD_RATES_KV: KVNamespace;
}
declare const _default: {
    fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response>;
    scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map