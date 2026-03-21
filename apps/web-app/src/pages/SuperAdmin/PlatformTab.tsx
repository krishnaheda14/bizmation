import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShopRow, UserRow, PlatformOrderRow } from './types';
import { fmtInr, getShopVerificationStatus } from './utils';
import { CardStat } from './Shared';

interface Props {
  shops: ShopRow[];
  users: UserRow[];
  orders: PlatformOrderRow[];
  currentUser: any;
  userProfile: any;
  handleActionMsg: (msg: string, type: 'ok'|'err') => void;
}

export function PlatformTab({ shops, users, orders, currentUser, userProfile, handleActionMsg }: Props) {
  const [platformFrozen, setPlatformFrozen] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(true);

  const pendingShops = shops.filter((s) => getShopVerificationStatus(s) === 'PENDING').length;
  const blockedUsers = users.filter((u) => u.blocked).length;
  const frozenShops = shops.filter((s) => s.transactionsFrozen).length;
  const totalCommission = orders.reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0);
  
  const commissionByMetal = {
    gold: orders.filter((o) => (o.metal ?? '').toUpperCase() === 'GOLD').reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0),
    silver: orders.filter((o) => (o.metal ?? '').toUpperCase() === 'SILVER').reduce((s, o) => s + (Number(o.shopCommissionInr) || 0), 0)
  };

  const totalVolume = orders.reduce((s, o) => s + (Number(o.totalAmountInr) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalVolume / orders.length : 0;
  
  const totalGoldGrams = orders.filter((o) => (o.metal ?? '').toUpperCase() === 'GOLD').reduce((s, o) => s + (Number(o.grams) || 0), 0);
  const totalSilverGrams = orders.filter((o) => (o.metal ?? '').toUpperCase() === 'SILVER').reduce((s, o) => s + (Number(o.grams) || 0), 0);
  
  const approvedShops = shops.filter(s => getShopVerificationStatus(s) === 'APPROVED').length;
  const shopAdoptionRate = shops.length > 0 ? ((approvedShops / shops.length) * 100).toFixed(1) : '0';

  useEffect(() => {
    let mounted = true;
    getDoc(doc(db, 'config', 'platform')).then(snapshot => {
      if (mounted) {
        if (snapshot.exists() && snapshot.data().platformFrozen === true) {
          setPlatformFrozen(true);
        }
        setFreezeLoading(false);
      }
    }).catch(err => {
      // console.error('Failed to get platform config', err);
      if (mounted) setFreezeLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleGlobalFreeze = async () => {
    const isFreezing = !platformFrozen;
    if (isFreezing) {
      const confirmText = prompt('🚨 EMERGENCY FREEZE: This will KILL all transactions across the platform immediately. Type "FREEZE" to confirm.');
      if (confirmText !== 'FREEZE') {
        handleActionMsg('Freeze cancelled.', 'err');
        return;
      }
    } else {
      if (!confirm('Unlock platform and allow transactions to resume?')) return;
    }

    setFreezeLoading(true);
    try {
      await setDoc(doc(db, 'config', 'platform'), {
        platformFrozen: isFreezing,
        lastFrozenAt: isFreezing ? serverTimestamp() : null,
        frozenBy: isFreezing ? (userProfile?.email || currentUser?.uid) : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setPlatformFrozen(isFreezing);
      handleActionMsg(`Platform successfully ${isFreezing ? 'FROZEN' : 'UNFROZEN'}!`, 'ok');
    } catch (err: any) {
      handleActionMsg('Emergency action failed: ' + err.message, 'err');
    } finally {
      setFreezeLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      
      <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-stone-800">Global Settings & Emergency Controls</h2>
          <p className="text-sm text-stone-500 mt-1 max-w-xl">
            Control platform-wide configurations. Using the kill switch will instantly prevent any user or shop from making new transactions. Existing settled transactions are not affected.
          </p>
        </div>
        
        <div className={`p-5 rounded-2xl flex-shrink-0 flex items-center justify-between gap-6 min-w-[320px] transition-colors border shadow-inner ${platformFrozen ? 'bg-red-50 border-red-200' : 'bg-green-50/50 border-green-200'}`}>
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-widest ${platformFrozen ? 'text-red-600' : 'text-green-600'}`}>Kill Switch Status</p>
            <p className={`text-xl font-black ${platformFrozen ? 'text-red-700' : 'text-green-700'}`}>{platformFrozen ? 'PLATFORM FROZEN' : 'OPERATIONAL'}</p>
          </div>
          <button 
            disabled={freezeLoading}
            onClick={handleGlobalFreeze}
            className={`px-5 py-3 rounded-xl font-black text-white text-sm shadow-md transition-all uppercase tracking-wide
              ${platformFrozen ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} 
              ${freezeLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
          >
            {freezeLoading ? 'WAIT...' : platformFrozen ? 'UNFREEZE PLATFORM' : 'ACTIVATE FREEZE'}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-6 border border-amber-200/50 shadow-sm">
        <h3 className="text-[13px] font-bold text-amber-900/60 tracking-widest uppercase mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Financial Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1">Total Trade Vol.</p>
            <p className="text-2xl font-black text-stone-800 tracking-tight">{fmtInr(totalVolume)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1">Avg Order Value</p>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{fmtInr(avgOrderValue)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1">Platform Commission</p>
            <p className="text-2xl font-black text-green-600 tracking-tight">{fmtInr(totalCommission)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1">Shop Adoption</p>
            <p className="text-2xl font-black text-blue-600 tracking-tight">{shopAdoptionRate}%</p>
          </div>
        </div>

        <h3 className="text-[13px] font-bold text-stone-400 tracking-widest uppercase mb-4 px-2">Operational Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <CardStat label="Total Orders" value={String(orders.length)} />
          <CardStat label="Gold Transacted" value={`${totalGoldGrams.toFixed(4)}g`} valueClass="text-amber-600" />
          <CardStat label="Silver Transacted" value={`${totalSilverGrams.toFixed(4)}g`} valueClass="text-slate-600" />
          
          <CardStat label="Total Shops" value={String(shops.length)} />
          <CardStat label="Total Users" value={String(users.length)} />
          
          <CardStat label="Pending Shop KYC" value={String(pendingShops)} valueClass={pendingShops > 0 ? "text-amber-600" : "text-stone-700"} />
          <CardStat label="Frozen Shops" value={String(frozenShops)} valueClass={frozenShops > 0 ? "text-red-600" : "text-stone-700"} />
          <CardStat label="Blocked Users" value={String(blockedUsers)} valueClass={blockedUsers > 0 ? "text-red-600" : "text-stone-700"} />
        </div>
      </div>

    </div>
  );
}
