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
  Save, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    name:         userProfile?.name         ?? '',
    phone:        userProfile?.phone        ?? '',
    city:         userProfile?.city         ?? '',
    state:        userProfile?.state        ?? '',
    country:      userProfile?.country      ?? 'India',
    dateOfBirth:  userProfile?.dateOfBirth  ?? '',
    shopName:     userProfile?.shopName     ?? '',
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

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
            <User size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-amber-900 dark:text-white">My Profile</h1>
            <p className="text-sm text-amber-600 dark:text-gray-400">{currentUser?.email}</p>
          </div>
        </div>

        {/* KYC badge */}
        <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold w-fit"
          style={userProfile.kycStatus === 'VERIFIED'
            ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }
            : { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
          {userProfile.kycStatus === 'VERIFIED' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          KYC: {userProfile.kycStatus} &nbsp;·&nbsp; Role: {userProfile.role}
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border"
            style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <CheckCircle size={16} />{success}
          </div>
        )}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border"
            style={{ background: '#fff5f5', borderColor: '#fecaca', color: '#b91c1c' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-md border border-amber-100 dark:border-gray-700 p-7 space-y-5">

          <ProfileField label="Full Name" icon={<User size={16} />}
            type="text" value={form.name} onChange={setF('name')} required placeholder="Your full name" />

          <ProfileField label="Mobile Number" icon={<Phone size={16} />}
            type="tel" value={form.phone} onChange={setF('phone')} required placeholder="+91 98765 43210" />

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5 tracking-wide">
              <Mail size={16} className="text-amber-500" /> Email Address
            </label>
            <p className="px-4 py-2.5 rounded-2xl text-sm text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 select-none">
              {currentUser?.email ?? '—'}
              <span className="ml-2 text-xs text-amber-500">(contact support to change)</span>
            </p>
          </div>

          <ProfileField label="Shop / Business Name" icon={<Building2 size={16} />}
            type="text" value={form.shopName} onChange={setF('shopName')} placeholder="e.g. Lakshmi Gold Palace" />

          <div className="grid grid-cols-2 gap-4">
            <ProfileField label="City" icon={<MapPin size={16} />}
              type="text" value={form.city} onChange={setF('city')} placeholder="Mumbai" />
            <ProfileField label="State" icon={<MapPin size={16} />}
              type="text" value={form.state} onChange={setF('state')} placeholder="Maharashtra" />
          </div>

          <ProfileField label="Country" icon={<MapPin size={16} />}
            type="text" value={form.country} onChange={setF('country')} placeholder="India" />

          <ProfileField label="Date of Birth" icon={<Calendar size={16} />}
            type="date" value={form.dateOfBirth} onChange={setF('dateOfBirth')} />

          {/* Read-only KYC fields */}
          {(userProfile.panNumber || userProfile.aadhaarLast4) && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              {userProfile.panNumber && (
                <div>
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5 tracking-wide">PAN Number</label>
                  <p className="px-4 py-2.5 rounded-2xl text-sm text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600">
                    {userProfile.panNumber}
                  </p>
                </div>
              )}
              {userProfile.aadhaarLast4 && (
                <div>
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5 tracking-wide">Aadhaar (last 4)</label>
                  <p className="px-4 py-2.5 rounded-2xl text-sm text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600">
                    ••••&nbsp;{userProfile.aadhaarLast4}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Gold (g)', value: userProfile.totalGoldPurchasedGrams?.toFixed(3) ?? '0' },
              { label: 'Silver (g)', value: userProfile.totalSilverPurchasedGrams?.toFixed(3) ?? '0' },
              { label: 'Invested ₹', value: `₹${(userProfile.totalInvestedInr ?? 0).toLocaleString('en-IN')}` },
            ].map(s => (
              <div key={s.label}
                className="rounded-xl bg-amber-50 dark:bg-gray-700 border border-amber-100 dark:border-gray-600 p-3 text-center">
                <p className="text-lg font-black text-amber-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-amber-600 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(90deg, #fde68a 0%, #f59e0b 50%, #fbbf24 100%)',
              backgroundSize: '200% auto',
              color: '#451a03',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Field Component ──────────────────────────────────────────────────────────
interface ProfileFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
}
const ProfileField: React.FC<ProfileFieldProps> = ({ label, icon, ...props }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5 tracking-wide">
      <span className="text-amber-500">{icon}</span> {label}
    </label>
    <input
      {...props}
      className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 dark:text-white dark:bg-gray-700 transition-all focus:outline-none"
      style={{
        background: 'rgba(255,251,240,0.9)',
        border: '1.5px solid rgba(251,191,36,0.35)',
        boxShadow: 'inset 0 1px 3px rgba(180,120,0,0.06)',
      }}
      onFocus={e => {
        e.currentTarget.style.border = '1.5px solid rgba(245,158,11,0.7)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.15)';
      }}
      onBlur={e => {
        e.currentTarget.style.border = '1.5px solid rgba(251,191,36,0.35)';
        e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(180,120,0,0.06)';
      }}
    />
  </div>
);
