
import React, { useMemo, useState } from 'react';
import { User, UserRole, Transaction } from '../types';
import { getStore, saveStore, formatCurrency, useAppStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Sparkles, ShieldCheck, Wallet, Receipt, TrendingUp, TrendingDown, Clock, ArrowUpRight, Plus, X, Loader2 } from 'lucide-react';

interface PaymentsProps {
  user: User;
}

const Payments: React.FC<PaymentsProps> = ({ user }) => {
  const [store, setStore] = useAppStore();
  const { settings } = store;
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('5000');
  const [isProcessing, setIsProcessing] = useState(false);
  const isAgent = user.role === UserRole.AGENT;
  
  const currentUser = useMemo(() => {
    return store.users.find(u => u.id === user.id) || user;
  }, [store.users, user.id]);

  const transactions = useMemo(() => {
    return store.transactions
      .filter(t => t.userId === user.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [store.transactions, user.id]);

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsProcessing(true);
    
    setTimeout(() => {
        const updatedUsers = store.users.map(u => 
            u.id === user.id ? { ...u, walletBalance: (u.walletBalance || 0) + amount } : u
        );

        const newTransaction: Transaction = {
            id: `tr_dep_${Date.now()}`,
            userId: user.id,
            amount: amount,
            type: 'credit',
            purpose: 'Wallet Deposit (Simulated)',
            timestamp: new Date().toISOString(),
            status: 'completed'
        };

        const updatedStore = {
            ...store,
            users: updatedUsers,
            transactions: [newTransaction, ...store.transactions]
        };

        const finalUpdate = { ...updatedStore, currentUser: updatedUsers.find(u => u.id === user.id) || null };
        saveStore(finalUpdate);
        setStore(finalUpdate);
        setIsProcessing(false);
        setShowDepositModal(false);
        setDepositAmount('5000');
    }, 1500);
  };

  if (isAgent) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-12">
        <header>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">Financial Center</h1>
          <p className="text-zinc-500 font-medium tracking-tight mt-1">Manage your wallet and assignment settlements.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Wallet Balance Card */}
            <div className="lg:col-span-1 relative group">
                <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="relative glass-card p-10 rounded-[3.5rem] border-white/20 h-full flex flex-col justify-between overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl" />
                    
                    <div>
                        <div className="flex items-center gap-3 text-zinc-400 mb-6">
                            <Wallet size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Available Balance</span>
                        </div>
                        <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mb-2">
                            {formatCurrency(currentUser.walletBalance || 0, settings)}
                        </h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                            <ShieldCheck size={10} /> Verified Wallet
                        </div>
                    </div>

                    <div className="mt-12 space-y-4">
                        <button 
                            onClick={() => setShowDepositModal(true)}
                            className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-600/20"
                        >
                            Deposit Funds
                        </button>
                        <button className="w-full py-5 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all">
                            Request Withdrawal
                        </button>
                        <p className="text-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest pt-2">Withdrawals processed in 24h</p>
                    </div>
                </div>
            </div>

            {/* Deposit Modal */}
            <AnimatePresence>
                {showDepositModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden"
                        >
                            <button 
                                onClick={() => setShowDepositModal(false)}
                                className="absolute top-8 right-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="flex justify-center mb-10">
                                <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-600">
                                    <TrendingUp size={40} />
                                </div>
                            </div>

                            <div className="text-center space-y-4 mb-10">
                                <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Add Funds</h3>
                                <p className="text-zinc-500 font-medium text-sm leading-relaxed">
                                    Enter the amount you wish to deposit into your secure management wallet.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Amount (₦)</label>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 font-black">₦</div>
                                        <input 
                                            type="number"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-black uppercase font-black text-xl tracking-tighter p-6 pl-12 rounded-3xl border border-zinc-100 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-zinc-900 dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {['1000', '5000', '10000'].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setDepositAmount(val)}
                                            className={`py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                                depositAmount === val 
                                                ? 'bg-blue-600 border-blue-600 text-white' 
                                                : 'bg-zinc-50 dark:bg-black/40 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:border-blue-600/30'
                                            }`}
                                        >
                                            ₦{parseInt(val).toLocaleString()}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={handleDeposit}
                                    disabled={isProcessing}
                                    className="w-full py-6 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm Deposit'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transaction History */}
            <div className="lg:col-span-2 glass-card p-10 rounded-[3.5rem] border-white/20">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-white">Recent Settlements</h3>
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All Leads</button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {transactions.length > 0 ? transactions.map(t => (
                        <div key={t.id} className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === 'debit' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {t.type === 'debit' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                </div>
                                <div>
                                    <p className="font-black text-zinc-900 dark:text-white tracking-tight">{t.purpose}</p>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                                        <Clock size={12} /> {new Date(t.timestamp).toLocaleDateString()} at {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-black tracking-tighter ${t.type === 'debit' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {t.type === 'debit' ? '-' : '+'}{formatCurrency(t.amount, settings)}
                                </p>
                                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{t.status}</span>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <Receipt size={64} className="mb-4 text-zinc-300" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Transactions Found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeaturePreview icon={ShieldCheck} label="Instant Reconciliation" description="Every assignment fee is instantly settled against your portfolio yield accounts." />
            <FeaturePreview icon={Receipt} label="Smart Invoicing" description="Auto-generate professional rent receipts and legal notices for your tenants." />
            <FeaturePreview icon={Sparkles} label="AI Tax Assistant" description="Automatically categorize deductible maintenance expenses for annual filings." />
        </div>
      </div>
    );
  }

  // Tenant / Standard View
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-700 pb-20">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-600 blur-[100px] opacity-20 animate-pulse-gentle"></div>
        <div className="relative bg-white dark:bg-zinc-900 p-10 md:p-14 rounded-[4rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl">
          <div className="bg-blue-600/10 p-6 rounded-[2.5rem] w-fit mx-auto mb-10 border border-blue-600/20">
            <CreditCard size={64} className="text-blue-600" />
          </div>
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/20 mb-4">
              <Sparkles size={12} /> Feature Development
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">Financial Suite Coming Soon</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-md mx-auto leading-relaxed">
              We are finalizing the security protocols for our integrated payment gateway. Soon, you'll be able to manage rent, track invoices, and automate settlements directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <FeaturePreview icon={Wallet} label="Secure Wallet" />
            <FeaturePreview icon={ShieldCheck} label="Auto-Settlement" />
            <FeaturePreview icon={Receipt} label="Instant Invoicing" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Proprietary Technology v2.0</p>
      </div>
    </div>
  );
};

const FeaturePreview = ({ icon: Icon, label, description }: { icon: any, label: string, description?: string }) => (
  <div className="p-8 bg-offwhite dark:bg-black/40 rounded-[2.5rem] border border-zinc-50 dark:border-zinc-800 flex flex-col gap-4 group transition-all hover:border-blue-600/30">
    <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl text-zinc-400 group-hover:text-blue-600 transition-colors shadow-sm w-fit">
      <Icon size={24} />
    </div>
    <div>
        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">{label}</span>
        {description && <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed font-medium">{description}</p>}
    </div>
  </div>
);

export default Payments;
