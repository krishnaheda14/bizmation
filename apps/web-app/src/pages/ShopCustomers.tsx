import React, { useState, useEffect } from 'react';
import { Users, Loader2, Search, User } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export const ShopCustomers: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentUser || !userProfile) return;
      if (userProfile.role !== 'OWNER' && userProfile.role !== 'STAFF') {
        setError('Not authorized');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const shopName = userProfile.shopName ?? '';
        if (!shopName) {
          setError('Your account does not have a shop name set.');
          setLoading(false);
          return;
        }
        const q = query(collection(db, 'users'), where('shopName', '==', shopName), where('role', '==', 'CUSTOMER'), orderBy('name'));
        const snap = await getDocs(q);
        const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setCustomers(arr);
      } catch (e: any) {
        setError('Failed to load customers.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [currentUser, userProfile]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black text-gray-900 dark:text-white">
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border-b border-amber-200 dark:border-yellow-900/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black text-amber-900 dark:text-white mb-1 flex items-center gap-3"><Users size={32} className="text-amber-500"/> Shop Customers</h1>
          <p className="text-amber-700/70 dark:text-gray-400 text-sm">Customers registered under <strong>{userProfile?.shopName}</strong></p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-amber-500"/></div>
        ) : (
          <div className="bg-white dark:bg-gray-950 border border-amber-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-amber-100 dark:border-gray-800 bg-amber-50/60 dark:bg-gray-900">
                    <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Name</th>
                    <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Email</th>
                    <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">Phone</th>
                    <th className="text-left py-3 px-4 text-amber-700 dark:text-gray-400 text-xs font-semibold uppercase">KYC</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id} className="border-b border-amber-50 dark:border-gray-800/60 hover:bg-amber-50/40 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="py-3.5 px-4">{c.name}</td>
                      <td className="py-3.5 px-4">{c.email}</td>
                      <td className="py-3.5 px-4">{c.phone}</td>
                      <td className="py-3.5 px-4">{c.kycStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
