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
    businessAddress: (userProfile as any)?.businessAddress ?? '',
    businessPincode: (userProfile as any)?.businessPincode ?? '',
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
        ...(isOwner
          ? {
            businessAddress: form.businessAddress.trim(),
            businessPincode: form.businessPincode.trim(),
          }
          : {
            city:        form.city.trim(),
            state:       form.state.trim(),
            country:     form.country.trim(),
            dateOfBirth: form.dateOfBirth,
          }),
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

          <h2 className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1">{isOwner ? 'Business Details' : 'Personal Details'}</h2>

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

          {isOwner ? (
            <>
              <DarkField label="Business Address" icon={<MapPin size={15} />}
                type="text" value={form.businessAddress} onChange={setF('businessAddress')} placeholder="Shop/office full address" />
              <DarkField label="Business Pincode" icon={<MapPin size={15} />}
                type="text" value={form.businessPincode} onChange={setF('businessPincode')} placeholder="6 digit pincode" />
            </>
          ) : (
            <>
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
            </>
          )}

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
            {isOwner && (
              <ReadField label="Owner Code" icon={<Shield size={15} />}
                value={(userProfile as any).ownerCode || 'â€”'} />
            )}
            {isOwner && (
              <ReadField label="Hallmark License" icon={<Shield size={15} />}
                value={(userProfile as any).hallmarkLicenseNumber || 'â€”'} />
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

