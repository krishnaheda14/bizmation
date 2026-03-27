export interface CustomerOrderQueryParams {
    uid: string;
    email?: string;
    phone?: string;
}
export interface BasicOrder {
    id: string;
    userId?: string;
    customerUid?: string;
    customerEmail?: string;
    customerPhone?: string;
    type?: string;
    metal?: string;
    purity?: number;
    grams?: number;
    status?: string;
    createdAt?: any;
    [key: string]: any;
}
export interface CustomerOrderFetchStep {
    label: string;
    ok: boolean;
    count: number;
    errorCode?: string;
    errorMessage?: string;
}
export interface CustomerOrderFetchDebug {
    uid: string;
    email: string;
    phone: string;
    totalUnique: number;
    steps: CustomerOrderFetchStep[];
}
export interface CustomerOrderFetchResult {
    orders: BasicOrder[];
    debug: CustomerOrderFetchDebug;
}
export declare const normalizeGoldPurity: (purity: number) => number;
export declare function fetchCustomerOrdersWithDebug(params: CustomerOrderQueryParams): Promise<CustomerOrderFetchResult>;
export declare function fetchCustomerOrders(params: CustomerOrderQueryParams): Promise<BasicOrder[]>;
//# sourceMappingURL=customerOrders.d.ts.map