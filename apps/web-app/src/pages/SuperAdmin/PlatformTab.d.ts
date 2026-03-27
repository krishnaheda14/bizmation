import React from 'react';
import { ShopRow, UserRow, PlatformOrderRow } from './types';
interface Props {
    shops: ShopRow[];
    users: UserRow[];
    orders: PlatformOrderRow[];
    currentUser: any;
    userProfile: any;
    handleActionMsg: (msg: string, type: 'ok' | 'err') => void;
}
export declare function PlatformTab({ shops, users, orders, currentUser, userProfile, handleActionMsg }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=PlatformTab.d.ts.map