import React from 'react';
import { CoinPurchaseRequestRow } from './types';
interface Props {
    requests: CoinPurchaseRequestRow[];
    setRequests: React.Dispatch<React.SetStateAction<CoinPurchaseRequestRow[]>>;
    search: string;
    currentUser: any;
    userProfile: any;
    handleActionMsg: (text: string, type: 'ok' | 'err') => void;
}
export declare function CoinRequestsTab({ requests, setRequests, search, currentUser, userProfile, handleActionMsg }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=CoinRequestsTab.d.ts.map