import React, { useState, useMemo } from 'react';
import { PlatformOrderRow, ShopRow } from './types';
import { fmtInr, fmtDate, displayValue, normalize } from './utils';
import { CardStat, DetailGrid } from './Shared';

interface Props {
  orders: PlatformOrderRow[];
  search: string;
  shops: ShopRow[];
}

export function OrdersTab({ orders, search, shops }: Props) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const totalCommission = useMemo(() => orders.reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0), [orders]);
  const pendingCommission = useMemo(() => orders.reduce((s, o) => ((o.bullionPayoutStatus ?? 'UNSETTLED').toUpperCase() !== 'SETTLED' && o.type === 'BUY') ? s + (Number(o.shopCommissionInr) || 0) : s, 0), [orders]);
  const settledCommission = useMemo(() => orders.reduce((s, o) => ((o.bullionPayoutStatus ?? '').toUpperCase() === 'SETTLED' && o.type === 'BUY') ? s + (Number(o.shopCommissionInr) || 0) : s, 0), [orders]);

  const commissionByMetal = useMemo(() => {
    const gold = orders.filter((o) => (o.metal ?? '').toUpperCase() === 'GOLD').reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0);
    const silver = orders.filter((o) => (o.metal ?? '').toUpperCase() === 'SILVER').reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0);
    return { gold, silver };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.customerName ?? '').toLowerCase().includes(q)
      || (o.customerEmail ?? '').toLowerCase().includes(q)
      || (o.shopName ?? '').toLowerCase().includes(q)
      || (o.shopId ?? '').toLowerCase().includes(q)
      || (o.metal ?? '').toLowerCase().includes(q)
      || (o.type ?? '').toLowerCase().includes(q)
      || (o.status ?? '').toLowerCase().includes(q)
      || (o.userId ?? '').toLowerCase().includes(q)
      || (o.customerUid ?? '').toLowerCase().includes(q)
      || (o.razorpayPaymentId ?? '').toLowerCase().includes(q)
      || (o.id ?? '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const computeBps = (commPerGram: number | undefined, marketRate: number | undefined) => {
    if (!commPerGram || !marketRate) return 0;
    return ((commPerGram / marketRate) * 10000).toFixed(0);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <CardStat label="Platform Orders" value={String(orders.length)} />
        <CardStat label="Total Commission" value={fmtInr(totalCommission)} valueClass="text-amber-700" />
        <CardStat label="Pending Com." value={fmtInr(pendingCommission)} valueClass="text-red-600" />
        <CardStat label="Settled Com." value={fmtInr(settledCommission)} valueClass="text-green-600" />
        <CardStat label="Gold/Silver Com." value={`${fmtInr(commissionByMetal.gold)} / ${fmtInr(commissionByMetal.silver)}`} valueClass="text-stone-700 !text-lg !mt-3" />
      </div>

      <div className="rounded-3xl shadow-sm border border-amber-100 bg-white/90 backdrop-blur pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="bg-gradient-to-r from-amber-50 to-orange-50/30 border-b border-amber-200/60">
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[150px]">Date/ID</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[200px]">Customer</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[200px]">Shop</th>
                <th className="text-left px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[120px]">Asset</th>
                <th className="text-right px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[100px]">Qty (g)</th>
                <th className="text-right px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[130px]">Commission</th>
                <th className="text-right px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[130px]">Total Paid</th>
                <th className="text-center px-5 py-4 text-[11px] font-bold text-amber-900/60 uppercase tracking-widest min-w-[120px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16 text-stone-400 font-medium">No orders found matching "{search}"</td></tr>
              )}
              {filteredOrders.map((o, i) => {
                const isExpanded = expandedOrderId === o.id;
                const shopData = shops.find(s => s.id === o.shopId || normalize(s.name) === normalize(o.shopName));
                
                return (
                  <React.Fragment key={o.id}>
                    <tr 
                      onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                      className={`border-b border-stone-100 hover:bg-amber-50/50 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/30'}`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-bold text-stone-800 text-[13px]">{fmtDate(o.createdAt)}</p>
                        <p className="font-mono text-[9px] text-stone-400 mt-1">{o.id}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-bold text-stone-700 text-sm">{o.customerName || 'No Name'}</p>
                        <p className="text-[11px] text-stone-500">{o.customerEmail || o.customerPhone || '-'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-amber-800 text-sm">{o.shopName || '-'} {shopData?.ownerCode ? <span className="text-[10px] text-amber-600 bg-amber-100 px-1 py-0.5 rounded">[{shopData.ownerCode}]</span> : ''}</p>
                        <p className="font-mono text-[9px] text-stone-400 mt-1">{o.shopId || '-'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${o.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{o.type}</span>
                          <span className="font-bold text-stone-700">{o.metal} <span className="text-xs text-stone-400 font-normal">{o.purity ? `(${o.purity})` : ''}</span></span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-black text-stone-800 text-base">{Number(o.grams || 0).toFixed(4)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-black text-amber-600 text-base">{fmtInr(Number(o.shopCommissionInr || 0))}</p>
                        <p className="text-[10px] text-stone-400 font-medium">({fmtInr(Number(o.commissionPerGram || 0), false)}/g)</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-bold text-stone-800 text-base">{fmtInr(Number(o.totalAmountInr || 0))}</p>
                        <p className="text-[10px] text-stone-400 font-medium">@ {fmtInr(Number(o.ratePerGram || 0), false)}/g</p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${o.status === 'SUCCESS' || o.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : o.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>{o.status || '-'}</span>
                          {o.bullionPayoutStatus && <span className={`text-[9px] uppercase font-bold ${o.bullionPayoutStatus === 'SETTLED' ? 'text-green-600' : 'text-stone-400'}`}>{o.bullionPayoutStatus}</span>}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-stone-50/50 shadow-inner">
                        <td colSpan={8} className="px-5 py-6 border-b-2 border-amber-200">
                          
                          {/* INVOICE EXPANSION */}
                          <div className="bg-white rounded-2xl border border-stone-200 shadow-md p-6 relative overflow-hidden">
                            {/* Decorative background logo/icon */}
                            <div className="absolute -right-10 -bottom-10 opacity-[0.03] text-[200px] pointer-events-none select-none">🧾</div>
                            
                            <div className="flex justify-between items-start mb-6 border-b border-stone-100 pb-4">
                              <div>
                                <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                                  Transaction Details
                                  <span className={`text-[10px] font-black px-2 py-1 rounded bg-stone-100 text-stone-600 border border-stone-200`}>ID: {o.id}</span>
                                </h3>
                                <p className="text-sm text-stone-500 mt-1">Processed on {fmtDate(o.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Order Value</p>
                                <p className="text-3xl font-black text-amber-600 tracking-tighter">{fmtInr(Number(o.totalAmountInr || 0))}</p>
                                <p className="text-xs text-stone-500 font-medium mt-1 uppercase tracking-wide">Status: <span className={o.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>{o.status}</span></p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <DetailGrid
                                title="Customer & Shop"
                                rows={[
                                  { label: 'Customer Name', value: o.customerName || '-' },
                                  { label: 'Customer UID / ID', value: `${o.customerUid || '-'} / ${o.userId || '-'}` },
                                  { label: 'Customer Email', value: o.customerEmail || '-' },
                                  { label: 'Customer Phone', value: o.customerPhone || '-' },
                                  { label: 'Shop Name', value: o.shopName || '-' },
                                  { label: 'Shop ID', value: o.shopId || '-' },
                                  { label: 'Shop Owner Code', value: shopData?.ownerCode || '-' },
                                  { label: 'Payment Gateway ID', value: o.razorpayPaymentId || '-' },
                                ]}
                              />

                              <DetailGrid
                                title="Trade Particulars"
                                rows={[
                                  { label: 'Trade Action', value: o.type || '-' },
                                  { label: 'Asset Class', value: o.metal || '-' },
                                  { label: 'Purity Level', value: String(o.purity || '-') },
                                  { label: 'Total Weight', value: `${Number(o.grams || 0).toFixed(4)} grams` },
                                  { label: 'Market Base Rate', value: `${fmtInr(Number(o.marketRatePerGram || 0), false)} / g` },
                                  { label: 'Execution Rate', value: `${fmtInr(Number(o.ratePerGram || 0), false)} / g` },
                                  { label: 'Commission Delta', value: `${fmtInr(Number(o.commissionPerGram || 0), false)} / g` },
                                  { label: 'Commission Yield', value: `${computeBps(o.commissionPerGram, o.marketRatePerGram)} bps` },
                                ]}
                              />

                              <DetailGrid
                                title="Financial Settlement"
                                rows={[
                                  { label: 'Gross Value', value: fmtInr(Number(o.totalAmountInr || 0)) },
                                  { label: 'Platform Base Amount', value: fmtInr(Number(o.bullionBaseAmountInr || 0)) },
                                  { label: 'Shop Net Commission', value: fmtInr(Number(o.shopCommissionInr || 0)) },
                                  { label: 'Bullion Settlement Amount', value: fmtInr(Number(o.bullionSettlementAmountInr || 0)) },
                                  { label: 'Payout Processing Status', value: o.bullionPayoutStatus || 'UNSETTLED' },
                                  { label: 'Order Timestamp', value: displayValue(o.createdAt) },
                                  { label: 'Last Updated', value: displayValue(o.updatedAt) },
                                ]}
                              />
                            </div>
                            
                            {/* JSON RAW TRACEVIEW FOR SUPER ADMIN DEBUGS */}
                            <div className="mt-6 pt-4 border-t border-stone-100">
                              <details className="group">
                                <summary className="text-[11px] font-bold text-stone-400 uppercase tracking-widest cursor-pointer select-none hover:text-stone-600 transition-colors">
                                  Show Raw Document Trace
                                </summary>
                                <div className="mt-3 bg-stone-900 rounded-xl p-4 overflow-auto max-h-[250px] custom-scrollbar">
                                  <pre className="text-[10px] text-green-400 font-mono leading-relaxed">
                                    {JSON.stringify(o, null, 2)}
                                  </pre>
                                </div>
                              </details>
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
