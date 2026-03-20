import React, { useState, useMemo } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShopRow, UserRow, PlatformOrderRow } from './types';
import { getShopVerificationStatus, normalize, fmtInr, fmtDate, maskedValue } from './utils';
import { CardStat, DetailGrid } from './Shared';

interface Props {
  shops: ShopRow[];
  setShops: React.Dispatch<React.SetStateAction<ShopRow[]>>;
  users: UserRow[];
  setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
  orders: PlatformOrderRow[];
  search: string;
  currentUser: any;
  userProfile: any;
  handleActionMsg: (msg: string, type: 'ok'|'err') => void;
}

export function ShopsTab({ shops, setShops, users, setUsers, orders, search, currentUser, userProfile, handleActionMsg }: Props) {
  const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
  const [editShopId, setEditShopId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ShopRow>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const pendingShops = useMemo(() => shops.filter((s) => getShopVerificationStatus(s) === 'PENDING'), [shops]);

  const filteredShops = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return shops;
    return shops.filter((s) =>
      (s.name ?? '').toLowerCase().includes(q)
      || (s.bizShopId ?? '').toLowerCase().includes(q)
      || (s.ownerCode ?? '').toLowerCase().includes(q)
      || (s.ownerName ?? '').toLowerCase().includes(q)
      || (s.email ?? '').toLowerCase().includes(q)
      || (s.phone ?? '').toLowerCase().includes(q),
    );
  }, [shops, search]);

  const ordersForShop = (shop: ShopRow) => orders.filter((o) =>
    (o.shopId && shop.id && o.shopId === shop.id)
    || (normalize(o.shopName) && normalize(shop.name) && normalize(o.shopName) === normalize(shop.name))
  );

  const startEdit = (shop: ShopRow) => {
    setEditShopId(shop.id);
    setEditForm({ ...shop });
  };

  const saveEdit = async (shopId: string) => {
    setActionLoading((p) => ({ ...p, [shopId]: true }));
    try {
      await updateDoc(doc(db, 'shops', shopId), {
        ...editForm,
        updatedAt: serverTimestamp(),
      });
      setShops((prev) => prev.map((s) => s.id === shopId ? { ...s, ...editForm } : s));
      handleActionMsg('Shop updated successfully', 'ok');
      setEditShopId(null);
    } catch (err: any) {
      handleActionMsg(err.message ?? 'Update failed', 'err');
    } finally {
      setActionLoading((p) => ({ ...p, [shopId]: false }));
    }
  };

  const toggleFlag = async (shop: ShopRow, field: 'blocked' | 'transactionsFrozen') => {
    const newVal = !shop[field];
    setActionLoading((p) => ({ ...p, [shop.id]: true }));
    try {
      await updateDoc(doc(db, 'shops', shop.id), {
        [field]: newVal,
        updatedAt: serverTimestamp(),
      });
      setShops((prev) => prev.map((s) => s.id === shop.id ? { ...s, [field]: newVal } : s));
      handleActionMsg(`Shop ${newVal ? 'frozen/blocked' : 'unfrozen/unblocked'} successfully`, 'ok');
    } catch (err: any) {
      handleActionMsg(err.message ?? 'Update failed', 'err');
    } finally {
      setActionLoading((p) => ({ ...p, [shop.id]: false }));
    }
  };

  const verificationBadge = (s?: string) => {
    const v = s ?? 'PENDING';
    if (v === 'APPROVED') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100/80 border border-green-200 text-green-700">Approved</span>;
    if (v === 'REJECTED') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100/80 border border-red-200 text-red-700">Rejected</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100/80 border border-amber-200 text-amber-700">Pending</span>;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CardStat label="Total Shops" value={String(shops.length)} />
        <CardStat label="Pending Verification" value={String(pendingShops.length)} valueClass="text-red-600" />
        <CardStat label="Approved Shops" value={String(shops.filter((s) => getShopVerificationStatus(s) === 'APPROVED').length)} valueClass="text-green-600" />
        <CardStat label="Shops With Orders" value={String(shops.filter((s) => ordersForShop(s).length > 0).length)} valueClass="text-blue-600" />
      </div>

      <div className="rounded-3xl shadow-sm border border-amber-100 bg-white/90 backdrop-blur pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="bg-gradient-to-r from-amber-50 to-orange-50/30 border-b border-amber-200/60">
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Shop & Contact</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Owner UID/Code</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Status</th>
                <th className="text-right px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Orders</th>
                <th className="text-right px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Commission</th>
                <th className="text-center px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShops.length === 0 && (
                <tr><td colSpan={6} className="text-center py-16 text-stone-400 font-medium">No shops found matching "{search}"</td></tr>
              )}
              {filteredShops.map((s, i) => {
                const sOrders = ordersForShop(s);
                const sCommission = sOrders.reduce((sum, o) => sum + (Number(o.shopCommissionInr) || 0), 0);
                const isExpanded = expandedShopId === s.id;
                const isLoading = !!actionLoading[s.id];
                
                return (
                  <React.Fragment key={s.id}>
                    <tr className={`border-b border-stone-100 hover:bg-amber-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'} ${s.blocked ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-800 text-[15px]">{s.name || 'Unnamed Shop'}</span>
                          <span className="text-stone-500 font-medium">{s.ownerName || 'Unknown Owner'}</span>
                          <span className="text-[11px] text-stone-400 mt-1">{s.email || '-'} • {s.phone || '-'}</span>
                          {(s.blocked || s.transactionsFrozen) && (
                            <div className="flex gap-1 mt-1.5">
                              {s.blocked && <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Blocked</span>}
                              {s.transactionsFrozen && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Frozen</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded inline-block mb-1">{s.ownerUid || 'No UID'}</div>
                        <div className="text-xs font-medium text-amber-700 mt-1">Code: {s.ownerCode || '-'}</div>
                      </td>
                      <td className="px-5 py-4">{verificationBadge(getShopVerificationStatus(s))}</td>
                      <td className="px-5 py-4 text-right font-bold text-stone-700 text-base">{sOrders.length}</td>
                      <td className="px-5 py-4 text-right font-black text-amber-600 text-base">{fmtInr(sCommission)}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setExpandedShopId(isExpanded ? null : s.id)}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors"
                        >
                          {isExpanded ? 'Hide Details' : 'View & Edit'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-stone-50/50 shadow-inner">
                        <td colSpan={6} className="px-5 py-6 border-b-2 border-amber-200">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* DETAILS PANEL */}
                            <div className="flex flex-col gap-4">
                              {editShopId === s.id ? (
                                <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-sm relative">
                                  <h4 className="font-bold text-amber-900 mb-4 border-b pb-2">Edit Shop Details</h4>
                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                    {['name', 'ownerName', 'email', 'phone', 'city', 'state', 'businessAddress', 'gstNumber', 'panNumber', 'hallmarkLicenseNumber'].map(field => (
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
                                      <label className="text-[10px] font-bold text-stone-500 uppercase">Verification Status</label>
                                      <select 
                                        value={editForm.verificationStatus || 'PENDING'} 
                                        onChange={e => setEditForm(prev => ({...prev, verificationStatus: e.target.value as any, shopVerificationStatus: e.target.value as any}))}
                                        className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 mt-1 focus:border-amber-400 outline-none"
                                      >
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => setEditShopId(null)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl text-xs hover:bg-stone-200">Cancel</button>
                                    <button onClick={() => saveEdit(s.id)} disabled={isLoading} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs hover:bg-amber-600">Save Changes</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <DetailGrid
                                    title="Shop Information"
                                    rows={[
                                      { label: 'Shop Name', value: maskedValue('name', s.name) },
                                      { label: 'Shop ID / UID', value: `${s.id} / ${s.ownerUid}` },
                                      { label: 'Owner', value: `${s.ownerName} (${s.ownerCode})` },
                                      { label: 'Contact', value: `${s.email} | ${s.phone}` },
                                      { label: 'Address', value: `${s.businessAddress || '-'}, ${s.city || '-'}, ${s.state || '-'}` },
                                      { label: 'KYC / Tax', value: `PAN: ${s.panNumber || '-'} | GST: ${s.gstNumber || '-'}` },
                                      { label: 'Hallmark License', value: s.hallmarkLicenseNumber || '-' },
                                      { label: 'Verification', value: getShopVerificationStatus(s) },
                                    ]}
                                  />
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <button onClick={() => startEdit(s)} className="px-4 py-2 bg-amber-100 text-amber-800 font-bold border border-amber-200 rounded-xl text-xs flex-1 min-w-[120px] hover:bg-amber-200 transition-colors">✏️ Edit Details</button>
                                    <button onClick={() => toggleFlag(s, 'transactionsFrozen')} disabled={isLoading} className={`px-4 py-2 font-bold border rounded-xl text-xs flex-1 min-w-[120px] transition-colors ${s.transactionsFrozen ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'}`}>
                                      {s.transactionsFrozen ? '❄️ Unfreeze Txs' : '❄️ Freeze Txs'}
                                    </button>
                                    <button onClick={() => { if(confirm(`Are you sure you want to ${s.blocked ? 'unblock' : 'block'} this shop?`)) toggleFlag(s, 'blocked'); }} disabled={isLoading} className={`px-4 py-2 font-bold border rounded-xl text-xs flex-1 min-w-[120px] transition-colors ${s.blocked ? 'bg-red-100 text-red-800 border-red-200' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}>
                                      {s.blocked ? '🛑 Unblock Shop' : '🛑 Block Shop'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* ORDERS MINI-TABLE */}
                            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col">
                              <p className="text-[11px] font-bold text-stone-500 uppercase mb-3 px-1">Recent Shop Orders ({sOrders.length})</p>
                              {sOrders.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">No orders yet</div>
                              ) : (
                                <div className="overflow-auto flex-1 max-h-[350px] pr-2 custom-scrollbar">
                                  <div className="space-y-2">
                                    {sOrders.slice(0, 50).map((o) => (
                                      <div key={o.id} className="bg-stone-50 border border-stone-100 p-3 rounded-xl flex justify-between items-center hover:bg-amber-50/50 transition-colors">
                                        <div>
                                          <p className="font-bold text-stone-800 text-[13px]">{o.type} {o.metal} <span className="text-stone-400 font-normal text-[11px]">{fmtDate(o.createdAt)}</span></p>
                                          <p className="text-[11px] text-stone-500 mt-0.5">{o.customerName || o.customerEmail || 'Unknown Customer'}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-black text-amber-700 text-sm">{fmtInr(Number(o.totalAmountInr || 0))}</p>
                                          <p className="text-[10px] text-stone-500 mt-0.5 font-mono">{Number(o.grams||0).toFixed(4)}g</p>
                                        </div>
                                      </div>
                                    ))}
                                    {sOrders.length > 50 && <p className="text-center text-[10px] text-stone-400 mt-2 italic">+ {sOrders.length - 50} more orders</p>}
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
