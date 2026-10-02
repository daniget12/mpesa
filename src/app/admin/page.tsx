'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Ban, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string;
  account_type: string;
  role: string;
  is_banned: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to view this page.");
        setLoading(false);
        return;
      }

      // Check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profileError || profile?.role !== 'admin') {
        setError("Access Denied. You do not have administrator privileges.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const toggleBanStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentStatus })
      .eq('id', userId);

    if (error) {
      alert("Failed to update user status: " + error.message);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));
    }
  };

  const promoteToAdmin = async (userId: string) => {
    const confirmPromote = confirm("Are you sure you want to make this user an admin?");
    if (!confirmPromote) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (error) {
      alert("Failed to promote user: " + error.message);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: 'admin' } : u));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-xl animate-pulse">Loading Admin Panel...</p></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6 text-center">{error}</p>
        <Link href="/" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">
          Return to Homepage
        </Link>
      </div>
    );
  }

  const buyers = users.filter(u => u.account_type === 'buyer');
  const sellers = users.filter(u => u.account_type === 'seller');
  const admins = users.filter(u => u.role === 'admin');
  const banned = users.filter(u => u.is_banned);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-gray-900 text-white py-6 shadow-md">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold">AddisDeals Admin Control</h1>
          </div>
          <Link href="/" className="text-gray-300 hover:text-white transition-colors">
            Exit to Site
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-4xl font-bold text-gray-900 mb-2">{users.length}</span>
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Users</span>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-4xl font-bold text-green-600 mb-2">{sellers.length}</span>
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Merchants</span>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-4xl font-bold text-blue-600 mb-2">{buyers.length}</span>
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Buyers</span>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-4xl font-bold text-red-600 mb-2">{banned.length}</span>
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Banned</span>
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" /> User Management
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.full_name || 'No Name'}</div>
                      <div className="text-xs text-gray-400 mt-1">ID: {user.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{user.phone_number || 'No Phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.account_type === 'seller' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : (user.account_type === 'seller' ? 'Merchant' : 'Buyer')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_banned ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                          <Ban className="w-4 h-4" /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.role !== 'admin' && (
                          <>
                            <button 
                              onClick={() => toggleBanStatus(user.id, user.is_banned)}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                user.is_banned 
                                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                              }`}
                            >
                              {user.is_banned ? 'Unban' : 'Ban User'}
                            </button>
                            <button 
                              onClick={() => promoteToAdmin(user.id)}
                              className="px-3 py-1.5 rounded-md text-sm font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            >
                              Make Admin
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
