import React from 'react';
import { UserRow, PlatformOrderRow } from './types';
interface Props {
    users: UserRow[];
    setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
    orders: PlatformOrderRow[];
    search: string;
    currentUser: any;
    userProfile: any;
    handleActionMsg: (msg: string, type: 'ok' | 'err') => void;
}
export declare function UsersTab({ users, setUsers, orders, search, currentUser, userProfile, handleActionMsg }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=UsersTab.d.ts.map