/**
 * Referral Page – Customer
 *
 * • Shows customer's unique referral code / link
 * • Copy-to-clipboard button
 * • Shows count and list of referred friends
 * • "Surprise gift" incentive message
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Gift, Copy, CheckCheck, Users, Star, ExternalLink } from 'lucide-react';

interface ReferredUser {
  uid: string;
  name: string;
  email: string;
  createdAt?: any;
}

export const Referral: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = `${baseUrl}/#/?ref=${referralCode}`;

  useEffect(() => {
    if (!currentUser) return;

    // Generate / retrieve referral code (first 8 chars of UID, upper-cased)
    const code = currentUser.uid.slice(0, 8).toUpperCase();
    setReferralCode(code);

    // Persist code to Firestore user doc if not already set
    const userRef = doc(db, 'users', currentUser.uid);
    getDoc(userRef).then(snap => {
      if (snap.exists() && !snap.data()?.referralCode) {
        updateDoc(userRef, { referralCode: code }).catch(() => { });
      }
    });

    // Fetch users who used this referral code
    const q = query(collection(db, 'users'), where('referredBy', '==', code));
    getDocs(q)
      .then(snap => {
        setReferredUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as ReferredUser)));
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    }
  };

  const tierMessage = (count: number): string => {
    if (count >= 10) return '🏆 Gold Referrer! You have earned a special reward - contact your shop owner.';
    if (count >= 5) return '🎁 Silver Referrer! 5+ friends - your surprise gift is on the way!';
    if (count >= 1) return '🌟 Great start! Keep inviting to unlock your surprise gift!';
    return '🎉 Invite your first friend to start earning!';
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-black text-amber-900 dark:text-white flex items-center gap-3">
            <Gift className="text-amber-500" size={28} />
            Refer &amp; Earn
          </h1>
          <p className="text-amber-700/70 dark:text-gray-400 text-sm mt-1">
            Invite friends to invest in digital gold and earn surprise rewards!
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-8 space-y-6">

        {/* Hero banner */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fef9ee 0%, #fde68a 50%, #f59e0b 100%)' }}>
          <div className="p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-8xl select-none">🎁</div>
            <div>
              <h2 className="text-2xl font-black text-amber-950">Invite. Earn. Win.</h2>
              <p className="text-amber-800 text-sm mt-2 leading-relaxed max-w-xs">
                Share your unique code with friends. When they join and invest in digital gold,
                you receive a <strong>surprise gift</strong> from the shop owner!
              </p>
              <div className="flex gap-2 mt-3 text-xs font-bold text-amber-800">
                <span className="bg-amber-200 rounded-full px-3 py-1">🌟 1+ referrals: Surprise Gift</span>
                <span className="bg-amber-300 rounded-full px-3 py-1">🏆 10+: Gold Reward</span>
              </div>
            </div>
          </div>
        </div>

        {/* Your referral code */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-700/50 p-6 shadow-sm">
          <h3 className="text-base font-black text-amber-900 dark:text-white mb-4">Your Referral Code</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center justify-center rounded-2xl py-4 font-mono text-3xl font-black text-amber-900 dark:text-yellow-300 tracking-widest select-all"
              style={{ background: 'linear-gradient(135deg, #fef9ee, #fde68a)', boxShadow: '0 2px 16px rgba(245,158,11,0.2)' }}>
              {referralCode || '•••••••'}
            </div>
            <button onClick={() => handleCopy(referralCode)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
              {copied ? <CheckCheck size={20} className="text-amber-900" /> : <Copy size={20} className="text-amber-900" />}
            </button>
          </div>

          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(253,243,212,0.6)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <ExternalLink size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 break-all flex-1">{referralLink}</p>
            <button onClick={() => handleCopy(referralLink)}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0">
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Share via WhatsApp */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Join me on Bizmation Gold and invest in digital gold! Use my referral code *${referralCode}* when signing up: ${referralLink}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm"
          style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
          Share via WhatsApp
        </a>

        {/* Status card */}
        <div className="rounded-2xl px-6 py-4 text-center"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid rgba(251,191,36,0.4)' }}>
          <Star size={24} className="text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-amber-900">{tierMessage(referredUsers.length)}</p>
        </div>

        {/* Referred users list */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-amber-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-amber-500" />
              <h3 className="font-black text-amber-900 dark:text-white">Friends Referred</h3>
            </div>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{referredUsers.length}</span>
          </div>
          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : referredUsers.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-stone-400 text-sm">No referrals yet. Share your code and start earning!</p>
            </div>
          ) : (
            <div className="divide-y divide-amber-50 dark:divide-gray-800">
              {referredUsers.map(u => {
                const ts = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : null;
                return (
                  <div key={u.uid} className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                      {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800 dark:text-white text-sm truncate">{u.name || 'User'}</p>
                      <p className="text-xs text-stone-400 truncate">{u.email}</p>
                    </div>
                    {ts && <p className="text-xs text-stone-400">{ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
