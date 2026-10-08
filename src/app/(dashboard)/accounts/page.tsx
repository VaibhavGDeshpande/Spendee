'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';
import AddAccountModal from '@/components/accounts/AddAccountModal';
import { Account, Profile } from '@/types';
import { getUserAccounts, getUserProfile, claimMonthlyAllowance, updateProfileAllowance, updateAccountBalance, deleteAccount } from '@/lib/accounts';
import { getAccountIconComponent } from '@/lib/utils/accountIcons';
import { Landmark, CheckCircle2, AlertCircle, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Allowance editing
  const [allowanceInput, setAllowanceInput] = useState('992');
  const [isEditingAllowance, setIsEditingAllowance] = useState(false);
  
  // Account balance editing
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingBalanceInput, setEditingBalanceInput] = useState<string>('');
  
  const [claimStatus, setClaimStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  useEffect(() => {
    loadAccountsData();
  }, []);

  const loadAccountsData = async () => {
    setLoading(true);
    const [accs, prof] = await Promise.all([getUserAccounts(), getUserProfile()]);
    setAccounts(accs);
    setProfile(prof);
    if (prof) {
      setAllowanceInput(prof.blocked_allowance_eur.toString());
    }
    setLoading(false);
  };

  const handleSaveAllowance = async () => {
    const num = parseFloat(allowanceInput);
    if (!num || num <= 0) return;
    const success = await updateProfileAllowance(num);
    if (success) {
      setIsEditingAllowance(false);
      loadAccountsData();
    }
  };

  const handleSaveAccountBalance = async (accId: string) => {
    const num = parseFloat(editingBalanceInput);
    if (isNaN(num)) return;

    await updateAccountBalance(accId, num);
    setEditingAccountId(null);
    loadAccountsData();
  };

  const handleDeleteCustomAccount = async (accId: string, accName: string) => {
    if (!confirm(`Are you sure you want to remove the source "${accName}"?`)) {
      return;
    }
    const res = await deleteAccount(accId);
    if (res.success) {
      loadAccountsData();
    } else {
      alert(res.error || 'Could not delete account');
    }
  };

  const handleClaimAllowance = async () => {
    setClaiming(true);
    setClaimStatus(null);
    const res = await claimMonthlyAllowance();
    setClaiming(false);

    if (res.success) {
      setClaimStatus({ type: 'success', message: res.message });
      loadAccountsData();
    } else {
      setClaimStatus({ type: 'error', message: res.message });
    }
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-8">
      <Sidebar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        showConverter={showConverter}
        onToggleConverter={() => setShowConverter(!showConverter)}
      />

      <div className="md:hidden">
        <Header />
      </div>

      <main className="md:pl-64 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Accounts & Sources
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your Forex, Cash, Blocked Account, and custom income sources
            </p>
          </div>

          <button
            onClick={() => setIsAddSourceModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 touch-target self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Source</span>
          </button>
        </div>

        {/* Total Combined Balance Header Card */}
        <div className="p-6 rounded-3xl bg-linear-to-br from-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-600/20 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
              Total Combined Net Balance
            </p>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-white font-semibold">
              {accounts.length} Active Sources
            </span>
          </div>
          <p className="text-3xl sm:text-5xl font-black tracking-tight">
            €{totalBalance.toFixed(2)}
          </p>
        </div>

        {/* Accounts Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Accounts ({accounts.length})
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Click edit button to update balance
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const Icon = getAccountIconComponent(acc);
                const isEditing = editingAccountId === acc.id;

                return (
                  <div
                    key={acc.id}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs space-y-4 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Icon className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                              {acc.name}
                            </h3>
                            {!acc.is_system && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{acc.currency}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingAccountId(null);
                            } else {
                              setEditingAccountId(acc.id);
                              setEditingBalanceInput(acc.balance.toString());
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg touch-target"
                          title="Update Balance"
                        >
                          {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        </button>

                        {!acc.is_system && (
                          <button
                            onClick={() => handleDeleteCustomAccount(acc.id, acc.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg touch-target"
                            title="Remove Source"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      {isEditing ? (
                        <div className="space-y-2">
                          <label className="block text-[11px] text-slate-400 uppercase font-semibold">
                            Enter New Balance ({acc.currency})
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingBalanceInput}
                              onChange={(e) => {
                                const val = e.target.value.replace(/,/g, '.');
                                if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                  setEditingBalanceInput(val);
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border rounded-xl font-bold text-slate-900 dark:text-white text-base"
                            />
                            <button
                              onClick={() => handleSaveAccountBalance(acc.id)}
                              className="px-3 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 shrink-0"
                            >
                              <Check className="w-4 h-4" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                            Current Balance
                          </span>
                          <p className="font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-0.5">
                            {acc.currency === 'EUR' ? '€' : acc.currency === 'INR' ? '₹' : acc.currency === 'USD' ? '$' : '£'}
                            {acc.balance.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Blocked Account Monthly Allowance Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  Blocked Account Allowance
                </h3>
                <p className="text-xs text-slate-400">Monthly allowance claim manager</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingAllowance(!isEditingAllowance)}
              className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl touch-target"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <p className="text-xs text-slate-400 font-medium">Configured Allowance Amount</p>
              {isEditingAllowance ? (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={allowanceInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '.');
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setAllowanceInput(val);
                      }
                    }}
                    className="w-28 px-3 py-1 bg-white dark:bg-slate-900 border rounded-lg font-bold text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleSaveAllowance}
                    className="p-2 bg-indigo-600 text-white rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                  €{profile?.blocked_allowance_eur.toFixed(2) || '992.00'} / month
                </p>
              )}
            </div>

            <button
              onClick={handleClaimAllowance}
              disabled={claiming}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 touch-target"
            >
              {claiming ? 'Processing...' : "Mark Received"}
            </button>
          </div>

          {claimStatus && (
            <div
              className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center space-x-2 ${
                claimStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
              }`}
            >
              {claimStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{claimStatus.message}</span>
            </div>
          )}
        </div>
      </main>

      <div className="md:hidden">
        <BottomNav onOpenAddModal={() => setIsAddModalOpen(true)} />
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadAccountsData}
      />

      <AddAccountModal
        isOpen={isAddSourceModalOpen}
        onClose={() => setIsAddSourceModalOpen(false)}
        onSuccess={loadAccountsData}
      />
    </div>
  );
}

