/**
 * Nominee Page (Customer)
 * Optional nominee details linked to the logged-in user profile.
 */

import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Save, User, Phone, Shield, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const NomineePage: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const initial = useMemo(() => ({
    name: (userProfile as any)?.nominee?.name ?? '',
    relation: (userProfile as any)?.nominee?.relation ?? '',
    phone: (userProfile as any)?.nominee?.phone ?? '',
    aadhaarNumber: (userProfile as any)?.nominee?.aadhaarNumber ?? '',
    panNumber: (userProfile as any)?.nominee?.panNumber ?? '',
    address: (userProfile as any)?.nominee?.address ?? '',
    city: (userProfile as any)?.nominee?.city ?? '',
    state: (userProfile as any)?.nominee?.state ?? '',
    pincode: (userProfile as any)?.nominee?.pincode ?? '',
    country: (userProfile as any)?.nominee?.country ?? 'India',
  }), [userProfile]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setOk('');
    setErr('');

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        nominee: {
          name: form.name.trim(),
          relation: form.relation.trim(),
          phone: form.phone.trim(),
          aadhaarNumber: form.aadhaarNumber.replace(/\D/g, ''),
          panNumber: form.panNumber.trim().toUpperCase(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          country: form.country.trim() || 'India',
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      setOk('Nominee details saved successfully.');
      setTimeout(() => setOk(''), 3500);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save nominee details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 border border-amber-200 dark:border-yellow-900/30 rounded-2xl px-6 py-5">
          <h1 className="text-2xl font-black text-amber-900 dark:text-white">Nominee Details</h1>
          <p className="text-xs text-amber-700/80 dark:text-gray-400 mt-1">Optional. Add nominee details for account continuity and claim support.</p>
        </div>

        {ok && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
            <CheckCircle size={16} />{ok}
          </div>
        )}
        {err && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            <AlertCircle size={16} />{err}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-800 p-6 sm:p-8 space-y-4">
          <Field label="Nominee Name" icon={<User size={15} />} value={form.name} onChange={setF('name')} placeholder="Full name" />
          <Field label="Relationship" icon={<Shield size={15} />} value={form.relation} onChange={setF('relation')} placeholder="e.g. Spouse, Son, Daughter" />
          <Field label="Nominee Mobile" icon={<Phone size={15} />} value={form.phone} onChange={setF('phone')} placeholder="+91 98765 43210" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Aadhaar Number" icon={<Shield size={15} />} value={form.aadhaarNumber} onChange={setF('aadhaarNumber')} placeholder="12 digits" maxLength={12} />
            <Field label="PAN Number" icon={<Shield size={15} />} value={form.panNumber} onChange={setF('panNumber')} placeholder="ABCDE1234F" maxLength={10} />
          </div>

          <Field label="Address" icon={<MapPin size={15} />} value={form.address} onChange={setF('address')} placeholder="House / street / locality" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="City" icon={<MapPin size={15} />} value={form.city} onChange={setF('city')} placeholder="City" />
            <Field label="State" icon={<MapPin size={15} />} value={form.state} onChange={setF('state')} placeholder="State" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Pincode" icon={<MapPin size={15} />} value={form.pincode} onChange={setF('pincode')} placeholder="6 digits" maxLength={6} />
            <Field label="Country" icon={<MapPin size={15} />} value={form.country} onChange={setF('country')} placeholder="India" />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]"
            style={{ background: 'linear-gradient(90deg, #fde68a 0%, #f59e0b 50%, #fbbf24 100%)', backgroundSize: '200% auto', color: '#451a03', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving…' : 'Save Nominee'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, icon, ...props }) => (
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
