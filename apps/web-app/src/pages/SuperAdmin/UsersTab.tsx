import React, { useState, useMemo } from 'react';
import { doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserRow, PlatformOrderRow } from './types';
import { normalize, fmtInr, fmtDate, maskedValue, UNASSIGNED_SHOP_ID, UNASSIGNED_SHOP_NAME } from './utils';
import { CardStat, DetailGrid } from './Shared';

interface Props {
  users: UserRow[];
  setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
  orders: PlatformOrderRow[];
  search: string;
  currentUser: any;
  userProfile: any;
  handleActionMsg: (msg: string, type: 'ok'|'err') => void;
}

export function UsersTab({ users, setUsers, orders, search, currentUser, userProfile, handleActionMsg }: Props) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRow>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  
  // New UI Filters
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [shopFilter, setShopFilter] = useState<string>('ALL');

  const unassignedCustomers = useMemo(() => users.filter((u) => 
    (u.role ?? '').toUpperCase() === 'CUSTOMER' && 
    (normalize(u.shopId) === normalize(UNASSIGNED_SHOP_ID) || normalize(u.shopName) === normalize(UNASSIGNED_SHOP_NAME) || (!u.shopId && !u.shopName))
  ), [users]);

  // Unique shops for filter
  const uniqueShops = useMemo(() => {
    const shops = new Set<string>();
    users.forEach(u => {
      if (u.shopName && u.shopName.trim() !== '') shops.add(u.shopName);
    });
    return Array.from(shops).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      // Role Filter
      if (roleFilter !== 'ALL' && roleFilter !== 'UNASSIGNED') {
        if ((u.role || 'CUSTOMER').toUpperCase() !== roleFilter) return false;
      }
      if (roleFilter === 'UNASSIGNED') {
        const isUnassigned = (u.role ?? '').toUpperCase() === 'CUSTOMER' && (normalize(u.shopId) === normalize(UNASSIGNED_SHOP_ID) || normalize(u.shopName) === normalize(UNASSIGNED_SHOP_NAME) || (!u.shopId && !u.shopName));
        if (!isUnassigned) return false;
      }
      // Shop Filter
      if (shopFilter !== 'ALL' && u.shopName !== shopFilter) return false;

      // Text Search
      if (!q) return true;
      return (u.name ?? '').toLowerCase().includes(q)
        || (u.email ?? '').toLowerCase().includes(q)
        || (u.phone ?? '').toLowerCase().includes(q)
        || (u.role ?? '').toLowerCase().includes(q)
        || (u.shopName ?? '').toLowerCase().includes(q)
        || (u.shopId ?? '').toLowerCase().includes(q)
        || (u.bizCustomerId ?? '').toLowerCase().includes(q)
        || (u.bizShopId ?? '').toLowerCase().includes(q);
    });
  }, [users, search, roleFilter, shopFilter]);

  const ordersForUser = (user: UserRow) => orders.filter((o) =>
    (o.userId && o.userId === user.id)
    || (o.customerUid && o.customerUid === user.id)
    || (!!user.email && !!o.customerEmail && normalize(user.email) === normalize(o.customerEmail))
  );

  const startEdit = (user: UserRow) => {
    setEditUserId(user.id);
    setEditForm({ ...user });
  };

  const saveEdit = async (userId: string) => {
    setActionLoading((p) => ({ ...p, [userId]: true }));
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...editForm,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...editForm } : u));
      handleActionMsg('User profile updated successfully', 'ok');
      setEditUserId(null);
    } catch (err: any) {
      handleActionMsg(err.message ?? 'Update failed', 'err');
    } finally {
      setActionLoading((p) => ({ ...p, [userId]: false }));
    }
  };

  const toggleFlag = async (user: UserRow, field: 'blocked' | 'transactionsFrozen') => {
    const newVal = !user[field];
    setActionLoading((p) => ({ ...p, [user.id]: true }));
    try {
      await updateDoc(doc(db, 'users', user.id), {
        [field]: newVal,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, [field]: newVal } : u));
      handleActionMsg(`User ${newVal ? 'frozen/blocked' : 'unfrozen/unblocked'} successfully`, 'ok');
    } catch (err: any) {
      handleActionMsg(err.message ?? 'Update failed', 'err');
    } finally {
      setActionLoading((p) => ({ ...p, [user.id]: false }));
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete user ${user.name || user.email}? This cannot be undone.`)) return;
    setActionLoading((p) => ({ ...p, [user.id]: true }));
    try {
      await deleteDoc(doc(db, 'users', user.id));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      handleActionMsg('User deleted successfully', 'ok');
    } catch (err: any) {
      handleActionMsg(err.message ?? 'Delete failed', 'err');
    } finally {
      setActionLoading((p) => ({ ...p, [user.id]: false }));
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <CardStat label="Total Users" value={String(users.length)} />
        <CardStat label="Customers" value={String(users.filter((u) => u.role === 'CUSTOMER').length)} valueClass="text-stone-600" />
        <CardStat label="Owners" value={String(users.filter((u) => u.role === 'OWNER').length)} valueClass="text-amber-700" />
        <CardStat label="Staff" value={String(users.filter((u) => u.role === 'STAFF').length)} valueClass="text-blue-700" />
        <CardStat label="Unassigned" value={String(unassignedCustomers.length)} valueClass="text-red-600" />
      </div>

      <div className="flex flex-wrap gap-4 mb-4 bg-white/50 p-3 rounded-2xl border border-amber-100/50">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-amber-200 rounded-xl px-4 py-2 text-sm bg-white text-stone-700 shadow-sm focus:outline-none focus:border-amber-400 min-w-[180px]">
          <option value="ALL">All Roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="OWNER">Shop Owners</option>
          <option value="STAFF">Staff</option>
          <option value="UNASSIGNED">Unassigned Customers</option>
        </select>
        <select value={shopFilter} onChange={e => setShopFilter(e.target.value)} className="border border-amber-200 rounded-xl px-4 py-2 text-sm bg-white text-stone-700 shadow-sm focus:outline-none focus:border-amber-400 min-w-[180px] max-w-xs">
          <option value="ALL">All Linked Shops</option>
          {uniqueShops.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-3xl shadow-sm border border-amber-100 bg-white/90 backdrop-blur pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="bg-gradient-to-r from-amber-50 to-orange-50/30 border-b border-amber-200/60">
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">User Profile</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Shop Link</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Stats</th>
                <th className="text-center px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan={4} className="text-center py-16 text-stone-400 font-medium">No users found matching "{search}"</td></tr>
              )}
              {filteredUsers.map((u, i) => {
                const uOrders = ordersForUser(u);
                const isExpanded = expandedUserId === u.id;
                const isLoading = !!actionLoading[u.id];
                
                return (
                  <React.Fragment key={u.id}>
                    <tr className={`border-b border-stone-100 hover:bg-amber-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'} ${u.blocked ? 'opacity-60 bg-red-50/20' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${u.role === 'OWNER' ? 'bg-amber-500' : u.role === 'STAFF' ? 'bg-blue-500' : 'bg-stone-400'}`}>
                            {u.name ? u.name[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-stone-800 text-[14px] flex items-center gap-2">
                              {u.name || 'Unnamed'} 
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-600 uppercase tracking-wide">{u.role || 'USER'}</span>
                            </p>
                            <p className="text-[11px] text-stone-500 font-medium mt-0.5">{u.email || '-'} • {u.phone || '-'}</p>
                            {(u.blocked || u.transactionsFrozen) && (
                              <div className="flex gap-1 mt-1">
                                {u.blocked && <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Blocked</span>}
                                {u.transactionsFrozen && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Frozen Tx</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-stone-700">{u.shopName || 'No Shop'}</p>
                        <p className="text-[10px] text-stone-400 font-mono mt-0.5">{u.shopId || '-'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-bold text-stone-600 text-sm">{uOrders.length} Orders</p>
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">Inv: {fmtInr(Number(u.totalInvestedInr || 0))}</p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors"
                        >
                          {isExpanded ? 'Hide Details' : 'View & Edit'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-stone-50/50 shadow-inner">
                        <td colSpan={4} className="px-5 py-6 border-b-2 border-amber-200">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* USER FULL DETAILS */}
                            <div className="flex flex-col gap-4">
                              {editUserId === u.id ? (
                                <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-sm relative">
                                  <h4 className="font-bold text-amber-900 mb-4 border-b pb-2 flex items-center justify-between">
                                    Edit User Profile 
                                    <span className="text-[9px] text-amber-600 font-normal bg-amber-100 px-2 py-0.5 rounded-full">Login credentials cannot be modified here</span>
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                    {['name', 'email', 'phone', 'city', 'state', 'shopName', 'shopId', 'ownerCode'].map(field => (
                                      <div key={field}>
                                        <label className="text-[10px] font-bold text-stone-500 uppercase">{field}</label>
                                        <input 
                                          value={editForm[field] || ''} 
                                          onChange={e => setEditForm(prev => ({...prev, [field]: e.target.value}))}
                                          className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 mt-1 focus:border-amber-400 outline-none"
                                        />
                                      </div>
                                    ))}
                                    <div>
                                      <label className="text-[10px] font-bold text-stone-500 uppercase">Role</label>
                                      <select 
                                        value={editForm.role || 'CUSTOMER'} 
                                        onChange={e => setEditForm(prev => ({...prev, role: e.target.value}))}
                                        className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 mt-1 focus:border-amber-400 outline-none"
                                      >
                                        <option value="CUSTOMER">CUSTOMER</option>
                                        <option value="OWNER">OWNER</option>
                                        <option value="STAFF">STAFF</option>
                                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-stone-500 uppercase">KYC Status</label>
                                      <select 
                                        value={editForm.kycStatus || 'PENDING'} 
                                        onChange={e => setEditForm(prev => ({...prev, kycStatus: e.target.value}))}
                                        className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 mt-1 focus:border-amber-400 outline-none"
                                      >
                                        <option value="PENDING">Pending</option>
                                        <option value="VERIFIED">Verified</option>
                                        <option value="REJECTED">Rejected</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end mt-4">
                                    <button onClick={() => setEditUserId(null)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl text-xs hover:bg-stone-200">Cancel</button>
                                    <button onClick={() => saveEdit(u.id)} disabled={isLoading} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs hover:bg-amber-600">Save Profile</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <DetailGrid
                                    title="User Profile & Identity"
                                    rows={[
                                      { label: 'Name / Role', value: `${u.name || '-'} (${u.role || '-'})` },
                                      { label: 'Firestore Doc ID', value: u.id },
                                      { label: 'Auth UID', value: u.uid || '-' },
                                      { label: 'Email', value: u.email || '-' },
                                      { label: 'Phone', value: `${u.phone || '-'} ${u.phoneVerified ? '(Verified)' : ''}` },
                                      { label: 'Shop Link', value: `${u.shopName || '-'} (${u.shopId || '-'})` },
                                      { label: 'Location', value: `${u.city || '-'}, ${u.state || '-'}` },
                                      { label: 'KYC Status', value: u.kycStatus || 'PENDING' },
                                    ]}
                                  />
                                  <div className="grid grid-cols-2 gap-3 mt-1">
                                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm text-center">
                                      <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Total Gold Bought</p>
                                      <p className="text-xl font-black text-amber-600">{Number(u.totalGoldPurchasedGrams || 0).toFixed(4)}<span className="text-xs ml-0.5 text-stone-400">g</span></p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm text-center">
                                      <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Total Silver Bought</p>
                                      <p className="text-xl font-black text-slate-600">{Number(u.totalSilverPurchasedGrams || 0).toFixed(4)}<span className="text-xs ml-0.5 text-stone-400">g</span></p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <button onClick={() => startEdit(u)} className="px-4 py-2 bg-amber-100 text-amber-800 font-bold border border-amber-200 rounded-xl text-xs flex-1 min-w-[120px] hover:bg-amber-200 transition-colors">✏️ Edit Profile</button>
                                    <button onClick={() => toggleFlag(u, 'transactionsFrozen')} disabled={isLoading} className={`px-4 py-2 font-bold border rounded-xl text-xs flex-1 min-w-[120px] transition-colors ${u.transactionsFrozen ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'}`}>
                                      {u.transactionsFrozen ? '❄️ Unfreeze Txs' : '❄️ Freeze Txs'}
                                    </button>
                                    <button onClick={() => { if(confirm(`Are you sure you want to ${u.blocked ? 'unblock' : 'block'} this user?`)) toggleFlag(u, 'blocked'); }} disabled={isLoading} className={`px-4 py-2 font-bold border rounded-xl text-xs flex-1 min-w-[120px] transition-colors ${u.blocked ? 'bg-red-100 text-red-800 border-red-200' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}>
                                      {u.blocked ? '🛑 Unblock User' : '🛑 Block Platform Access'}
                                    </button>
                                    <button onClick={() => handleDelete(u)} disabled={isLoading} className="px-4 py-2 bg-stone-800 text-white font-bold rounded-xl text-xs flex-1 min-w-[120px] hover:bg-stone-900 transition-colors">
                                      🗑️ Delete User
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* USER ORDERS MINI-INVOICE LIST */}
                            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col">
                              <p className="text-[11px] font-bold text-stone-500 uppercase mb-3 px-1 flex items-center justify-between">
                                Customer Orders ({uOrders.length})
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px]">Total Inv: {fmtInr(Number(u.totalInvestedInr || 0))}</span>
                              </p>
                              {uOrders.length === 0 ? (
                                <div className="flex items-center justify-center text-stone-400 text-sm py-16">No transaction history</div>
                              ) : (
                                <div className="overflow-auto max-h-[600px] pr-2 custom-scrollbar">
                                  <div className="space-y-3">
                                    {uOrders.slice(0, 50).map((o) => (
                                      <div key={o.id} className="bg-gradient-to-br from-white to-stone-50 border border-stone-200 p-3 rounded-xl hover:shadow-[0_4px_12px_rgba(251,191,36,0.1)] transition-all">
                                        <div className="flex justify-between items-start mb-2 border-b border-stone-100 pb-2">
                                          <div>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded mr-1 ${o.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{o.type}</span>
                                            <span className="font-bold text-stone-800 text-[13px]">{o.metal} {o.purity ? `(${o.purity})` : ''}</span>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-black text-stone-800 text-sm">{fmtInr(Number(o.totalAmountInr || 0))}</p>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px]">
                                          <p className="text-stone-500 tracking-wide uppercase">Date: <span className="text-stone-700 font-medium normal-case">{fmtDate(o.createdAt)}</span></p>
                                          <p className="text-stone-500 tracking-wide uppercase text-right">Qty: <span className="text-amber-700 font-black normal-case">{Number(o.grams||0).toFixed(4)}g</span></p>
                                          <p className="text-stone-500 tracking-wide uppercase">Rate: <span className="text-stone-700 font-medium normal-case">{fmtInr(Number(o.ratePerGram || 0), false)}/g</span></p>
                                          <p className="text-stone-500 tracking-wide uppercase text-right">Status: <span className={`${o.status === 'SUCCESS' ? 'text-green-600' : 'text-stone-700'} font-bold normal-case`}>{o.status}</span></p>
                                          <p className="text-stone-500 tracking-wide uppercase col-span-2 border-t border-dashed mt-1 pt-1">Pay ID: <span className="text-stone-700 font-mono text-[9px] normal-case">{o.razorpayPaymentId || '-'}</span></p>
                                        </div>
                                      </div>
                                    ))}
                                    {uOrders.length > 50 && <p className="text-center text-[10px] text-stone-400 mt-2 italic">+ {uOrders.length - 50} more orders</p>}
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
