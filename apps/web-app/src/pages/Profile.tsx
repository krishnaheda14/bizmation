/**
 * Profile Page
 * Allows the signed-in user to view and update their personal details.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  User, Phone, Mail, MapPin, Calendar, Building2,
  Save, CheckCircle, AlertCircle, Loader2, Shield, CreditCard, Fingerprint, Globe,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    name:        userProfile?.name        ?? '',
    phone:       userProfile?.phone       ?? '',
    city:        userProfile?.city        ?? '',
    state:       userProfile?.state       ?? '',
    country:     userProfile?.country     ?? 'India',
    dateOfBirth: userProfile?.dateOfBirth ?? '',
    shopName:    userProfile?.shopName    ?? '',
  });

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  const setF = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name:        form.name.trim(),
        phone:       form.phone.trim(),
        city:        form.city.trim(),
        state:       form.state.trim(),
        country:     form.country.trim(),
        dateOfBirth: form.dateOfBirth,
        shopName:    form.shopName.trim(),
        updatedAt:   serverTimestamp(),
      });
      await refreshProfile();
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-gray-900">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    );
  }

  const isOwner = userProfile.role === 'OWNER';

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* â”€â”€ Hero Header â”€â”€ */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
          style={{
            background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 60%, #d97706 100%)',
            boxShadow: '0 8px 32px rgba(245,158,11,0.3)',
          }}>
          {/* decorative circle */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-3xl font-black text-amber-900 select-none">
                {userProfile.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-amber-950">{userProfile.name || 'My Profile'}</h1>
              <p className="text-sm text-amber-800/80">{currentUser?.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/40 text-amber-950">
                  {isOwner ? 'ðŸª' : 'ðŸ‘¤'} {userProfile.role}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  userProfile.kycStatus === 'VERIFIED'
                    ? 'bg-green-500/20 text-green-900'
                    : 'bg-orange-300/40 text-amber-950'
                }`}>
                  {userProfile.kycStatus === 'VERIFIED'
                    ? <CheckCircle size={10} />
                    : <AlertCircle size={10} />}
                  KYC {userProfile.kycStatus}
                </span>
                {userProfile.shopName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/30 text-amber-950">
                    ðŸ·ï¸ {userProfile.shopName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Stats Row â”€â”€ */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Gold Held', value: `${(userProfile.totalGoldPurchasedGrams ?? 0).toFixed(3)}g`, icon: 'ðŸ¥‡', color: 'amber' },
            { label: 'Silver', value: `${(userProfile.totalSilverPurchasedGrams ?? 0).toFixed(3)}g`, icon: 'ðŸ¥ˆ', color: 'slate' },
            { label: 'Invested', value: `â‚¹${(userProfile.totalInvestedInr ?? 0).toLocaleString('en-IN')}`, icon: 'ðŸ’°', color: 'green' },
          ].map(s => (
            <div key={s.label}
              className="rounded-2xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-gray-800 p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-base font-black text-stone-800 dark:text-white leading-tight">{s.value}</p>
              <p className="text-xs text-stone-400 dark:text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* â”€â”€ Alerts â”€â”€ */}
        {success && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
            <CheckCircle size={16} />{success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            <AlertCircle size={16} />{error}
          </div>
        )}

        {/* â”€â”€ Edit Form â”€â”€ */}
        <form onSubmit={handleSave}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-800 p-6 sm:p-8 space-y-5">

          <h2 className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1">Personal Details</h2>

          <DarkField label="Full Name" icon={<User size={15} />}
            type="text" value={form.name} onChange={setF('name')} required placeholder="Your full name" />

          <DarkField label="Mobile Number" icon={<Phone size={15} />}
            type="tel" value={form.phone} onChange={setF('phone')} required placeholder="+91 98765 43210" />

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 tracking-wide">
              <Mail size={15} className="text-amber-500" /> Email Address
            </label>
            <p className="px-4 py-2.5 rounded-2xl text-sm text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 select-none">
              {currentUser?.email ?? 'â€”'}
              <span className="ml-2 text-xs text-amber-500">(contact support to change)</span>
            </p>
          </div>

          {(isOwner) && (
            <DarkField label="Shop / Business Name" icon={<Building2 size={15} />}
              type="text" value={form.shopName} onChange={setF('shopName')} placeholder="e.g. Lakshmi Gold Palace" />
          )}

          <div className="grid grid-cols-2 gap-4">
            <DarkField label="City" icon={<MapPin size={15} />}
              type="text" value={form.city} onChange={setF('city')} placeholder="Mumbai" />
            <DarkField label="State" icon={<MapPin size={15} />}
              type="text" value={form.state} onChange={setF('state')} placeholder="Maharashtra" />
          </div>

          <DarkField label="Country" icon={<Globe size={15} />}
            type="text" value={form.country} onChange={setF('country')} placeholder="India" />

          <DarkField label="Date of Birth" icon={<Calendar size={15} />}
            type="date" value={form.dateOfBirth} onChange={setF('dateOfBirth')} />

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(90deg, #fde68a 0%, #f59e0b 50%, #fbbf24 100%)',
              backgroundSize: '200% auto',
              color: '#451a03',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Savingâ€¦' : 'Save Changes'}
          </button>
        </form>

        {/* â”€â”€ KYC & Identity â”€â”€ */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-800 p-6 sm:p-8 space-y-4">
          <h2 className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">KYC & Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadField label="PAN Number" icon={<CreditCard size={15} />}
              value={userProfile.panNumber || 'â€”'} />
            <ReadField label="Aadhaar (last 4)" icon={<Fingerprint size={15} />}
              value={userProfile.aadhaarLast4 ? `â€¢â€¢â€¢â€¢ ${userProfile.aadhaarLast4}` : 'â€”'} />
            {isOwner && (
              <ReadField label="GST Number" icon={<Shield size={15} />}
                value={(userProfile as any).gstNumber || 'â€”'} />
            )}
          </div>
          <p className="text-xs text-stone-400 dark:text-gray-600 leading-relaxed">
            KYC fields cannot be changed here. Contact support to update identity documents.
          </p>
        </div>

      </div>
    </div>
  );
};

// â”€â”€â”€ Dark-aware Field Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DarkFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
}
const DarkField: React.FC<DarkFieldProps> = ({ label, icon, ...props }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 tracking-wide">
      <span className="text-amber-500 dark:text-amber-400">{icon}</span>{label}
    </label>
    <input
      {...props}
      className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 dark:text-white bg-amber-50/80 dark:bg-gray-800 border border-amber-200 dark:border-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50 dark:focus:ring-amber-500/40 focus:border-amber-400 dark:focus:border-amber-500"
    />
  </div>
);

// â”€â”€â”€ Read-only Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ReadField: React.FC<{ label: string; icon: React.ReactNode; value: string }> = ({ label, icon, value }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 tracking-wide">
      <span className="text-amber-500 dark:text-amber-400">{icon}</span>{label}
    </label>
    <p className="px-4 py-2.5 rounded-2xl text-sm text-stone-600 dark:text-gray-300 bg-stone-100 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 font-mono tracking-wider">
      {value}
    </p>
  </div>
);

