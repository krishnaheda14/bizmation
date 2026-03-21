import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ShopRow, UserRow, PlatformOrderRow, TabType } from './types';
import { ShopsTab } from './ShopsTab';
import { UsersTab } from './UsersTab';
import { OrdersTab } from './OrdersTab';
import { PlatformTab } from './PlatformTab';

const TABS: TabType[] = [
  { key: 'shops', label: 'Shops' },
  { key: 'customers', label: 'Users' },
  { key: 'orders', label: 'Orders' },
  { key: 'stats', label: 'Platform' },
];

export function SuperAdmin() {
  const { currentUser, userProfile, signOut } = useAuth();
  const [tab, setTab] = useState<TabType['key']>('shops');
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orders, setOrders] = useState<PlatformOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (userProfile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3 p-8">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-bold text-stone-700">Access Denied</h2>
          <p className="text-stone-500 text-sm">This area is restricted to super administrators.</p>
          <button
            onClick={() => { window.location.hash = '#/'; }}
            className="mt-4 px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setLoadErr('');
    try {
      const [shopsSnap, usersSnap, ordersSnap] = await Promise.all([
        getDocs(query(collection(db, 'shops'), orderBy('name'))),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'goldOnlineOrders'), orderBy('createdAt', 'desc'))),
      ]);
      setShops(shopsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ShopRow)));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as UserRow)));
      setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PlatformOrderRow)));
    } catch (err: any) {
      // console.error('[SuperAdmin] loadData error:', err?.code, err?.message);
      setLoadErr(err?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  const handleActionMsg = (text: string, type: 'ok' | 'err') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 8000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50">
      {/* HEADER */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-amber-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-900">Super Admin Console</h1>
            <p className="text-xs text-amber-600 mt-0.5">Manage Users, Details, Approvals, and Platform Freezes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-stone-700">{userProfile?.name || 'Super Admin'}</span>
              <span className="text-[10px] text-stone-500">{userProfile?.email}</span>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-1.5 text-xs rounded-lg bg-amber-100/80 hover:bg-amber-200 text-amber-800 font-medium transition-colors border border-amber-200"
            >
              Refresh
            </button>
            <button
              onClick={signOut}
              className="px-4 py-1.5 text-xs rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors border border-stone-200"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        {/* TABS */}
        <div className="max-w-[1400px] mx-auto px-4 pb-0 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSearch('');
              }}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-[3px] flex items-center gap-2 whitespace-nowrap
                ${tab === t.key
                  ? 'text-amber-900 border-amber-500 bg-amber-500/10'
                  : 'text-stone-500 border-transparent hover:text-stone-700 hover:bg-stone-100/50'
              }`}
            >
              {t.label}
              {t.key === 'shops' && <span className="text-[10px] bg-white text-stone-600 border border-stone-200 rounded-full px-2 py-0.5">{shops.length}</span>}
              {t.key === 'customers' && <span className="text-[10px] bg-white text-stone-600 border border-stone-200 rounded-full px-2 py-0.5">{users.length}</span>}
              {t.key === 'orders' && <span className="text-[10px] bg-white text-stone-600 border border-stone-200 rounded-full px-2 py-0.5">{orders.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {actionMsg && (
          <div className={`mb-6 rounded-2xl px-5 py-4 text-sm border-l-4 shadow-sm flex items-start gap-3
            ${actionMsg.type === 'ok' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
            <span className="text-xl leading-none">{actionMsg.type === 'ok' ? '✅' : '⚠️'}</span>
            <p className="pt-0.5">{actionMsg.text}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-amber-800 font-medium">Loading platform data...</p>
          </div>
        ) : loadErr ? (
          <div className="rounded-2xl p-6 bg-red-50 border border-red-200 text-red-700 text-sm max-w-lg mx-auto mt-10 shadow-sm">
            <p className="font-bold text-base mb-2 flex items-center gap-2"><span>🚨</span> Failed to load data</p>
            <p className="font-mono text-xs bg-white/50 p-3 rounded-lg border border-red-100">{loadErr}</p>
            <button
              onClick={loadData}
              className="mt-4 px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="animate-fade-up-soft">
            {tab !== 'stats' && (
              <div className="mb-6 flex justify-between items-center bg-white p-2 rounded-2xl border border-amber-100 shadow-sm max-w-md">
                <span className="pl-3 text-amber-500">🔍</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${tab}...`}
                  className="w-full bg-transparent px-3 py-1.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none"
                />
              </div>
            )}

            {tab === 'shops' && (
              <ShopsTab 
                shops={shops} setShops={setShops} 
                users={users} setUsers={setUsers} 
                orders={orders} search={search} 
                currentUser={currentUser} userProfile={userProfile} 
                handleActionMsg={handleActionMsg} 
              />
            )}
            
            {tab === 'customers' && (
              <UsersTab 
                users={users} setUsers={setUsers} 
                orders={orders} search={search} 
                currentUser={currentUser} userProfile={userProfile} 
                handleActionMsg={handleActionMsg} 
              />
            )}
            
            {tab === 'orders' && (
              <OrdersTab 
                orders={orders} search={search} shops={shops} 
              />
            )}
            
            {tab === 'stats' && (
              <PlatformTab 
                shops={shops} users={users} orders={orders} 
                currentUser={currentUser} userProfile={userProfile}
                handleActionMsg={handleActionMsg} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
