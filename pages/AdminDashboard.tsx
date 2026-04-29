
import React, { useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getStore, useAppStore, formatCurrency } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Building, Users, AlertCircle, DollarSign, UserCheck, Activity, ArrowRight, ClipboardCheck } from 'lucide-react';
import { initializeCompanyWallet } from '../services/simulationEngine';

interface AdminDashboardProps {
  user: User;
  onNavigate: (view: string) => void;
}

const COLORS = ['#000000', '#52525b', '#71717a', '#a1a1aa'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onNavigate }) => {
  const [store] = useAppStore();

  useEffect(() => {
    initializeCompanyWallet().catch(console.error);
  }, []);

  const metrics = useMemo(() => {
    const totalProperties = store.properties.length;
    const totalAgents = store.users.filter(u => u.role === UserRole.AGENT).length;
    const totalTenants = store.users.filter(u => u.role === UserRole.TENANT).length;
    const totalRevenue = store.payments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
    const outstandingRent = store.payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
    const openTickets = store.tickets.filter(t => t.status !== 'RESOLVED').length;

    return { totalProperties, totalAgents, totalTenants, totalRevenue, outstandingRent, openTickets };
  }, [store]);

  const propertyStatusData = useMemo(() => {
    const counts: any = {};
    store.properties.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [store]);

  const companyWallet = useMemo(() => {
    return store.wallets?.find(w => w.user_id === 0 || w.user_id === 'COMPANY_WALLET_0') || { balance: 0 };
  }, [store.wallets]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col items-center text-center gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-12">
        <div>
          <h1 className="text-3xl sm:text-6xl font-black text-black dark:text-white tracking-[0.2em] sm:tracking-widest uppercase mb-3 break-words">Admin Hub</h1>
          <p className="text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px] break-words">Global overview of all property operations and financial health.</p>
        </div>
        <button 
          onClick={() => onNavigate('admin_applications')}
          className="bg-black dark:bg-white text-white dark:text-black px-10 py-5 rounded-full font-black flex items-center shadow-2xl hover:opacity-90 transition-all active:scale-95 text-[10px] uppercase tracking-[0.4em]"
        >
          <ClipboardCheck className="mr-3 w-5 h-5" /> View Applications
        </button>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Properties" value={metrics.totalProperties} icon={Building} color="indigo" />
        <MetricCard label="Agents" value={metrics.totalAgents} icon={UserCheck} color="emerald" />
        <MetricCard label="Company Yield" value={`₦${companyWallet.balance.toLocaleString()}`} icon={DollarSign} color="amber" />
        <MetricCard label="Tickets" value={metrics.openTickets} icon={AlertCircle} color="slate" />
        <MetricCard label="Revenue" value={`₦${metrics.totalRevenue.toLocaleString()}`} icon={DollarSign} color="emerald" />
        <MetricCard label="Pending" value={`₦${metrics.outstandingRent.toLocaleString()}`} icon={Activity} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Occupancy Distribution */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-6">Property Status Distribution</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {propertyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
            {propertyStatusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center text-[10px] min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm mr-2 shrink-0" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                <span className="text-zinc-600 dark:text-zinc-400 capitalize truncate" title={`${entry.name}: ${entry.value}`}>
                  {entry.name}: <span className="font-bold text-black dark:text-white">{entry.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Transactions Engine */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Financial Registry</h3>
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Real-time Ledger</span>
          </div>
          <div className="overflow-x-auto flex-1 h-[300px] overflow-y-auto custom-scrollbar">
            {store.transactions && store.transactions.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
                  <tr className="text-[9px] uppercase font-black text-zinc-500 dark:text-zinc-400 tracking-wider">
                    <th className="px-6 py-4">Ref</th>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[10px]">
                  {store.transactions.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50).map(tx => {
                    const txUser = store.users.find(u => u.id === tx.user_id);
                    const userName = txUser ? txUser.name : (tx.user_id === 0 || tx.user_id === '0' ? 'Reserve' : 'External');
                    return (
                      <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        <td className="px-6 py-3 font-medium text-zinc-500 uppercase tracking-tighter truncate max-w-[80px]">{tx.reference?.slice(0,8) || tx.id.slice(0,8)}</td>
                        <td className="px-6 py-3 text-black dark:text-white font-bold truncate max-w-[100px]">{userName}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest ${
                            (tx.type === 'credit' || tx.type === 'deposit') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-black text-black dark:text-white">{formatCurrency(tx.amount || 0, store.settings)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                <DollarSign size={40} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Registry Empty</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Wallets */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">User Wallet Balances</h3>
        </div>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          {store.users.filter(u => u.role === UserRole.AGENT).length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-black sticky top-0">
                <tr className="text-[10px] uppercase font-black text-zinc-500 dark:text-zinc-400 tracking-wider">
                  <th className="px-6 py-3">Agent</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Wallet ID</th>
                  <th className="px-6 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {store.users.filter(u => u.role === UserRole.AGENT).map(agent => {
                  const w = (store.wallets || []).find(ow => ow.user_id === agent.id);
                  const balance = w ? w.balance : 0;
                  return (
                    <tr key={agent.id} className="hover:bg-zinc-50 dark:hover:bg-black transition-colors">
                      <td className="px-6 py-3 text-sm font-bold text-black dark:text-white">{agent.name}</td>
                      <td className="px-6 py-3 text-xs text-zinc-600 dark:text-zinc-400">{agent.role}</td>
                      <td className="px-6 py-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-500">{w?.id || 'No Wallet Yet'}</td>
                      <td className="px-6 py-3 text-sm font-black text-black dark:text-white">₦{balance.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <Users size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">No Agents Registered</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-2">The system registry currently contains no agent profiles with assigned wallets.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    indigo: 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white',
    emerald: 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white',
    blue: 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white',
    amber: 'bg-black dark:bg-white text-white dark:text-black',
    rose: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100',
    slate: 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400',
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer">
      <div className={`p-2 w-fit rounded-lg mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest break-words">{label}</p>
      <p className="text-lg sm:text-xl font-black text-black dark:text-white break-all tracking-tighter">{value}</p>
    </div>
  );
};

export default AdminDashboard;
