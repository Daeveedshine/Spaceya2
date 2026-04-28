
import React, { useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getStore, useAppStore } from '../store';
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
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Command Center</h1>
          <p className="text-slate-500">Global overview of all property operations and financial health.</p>
        </div>
        <button 
          onClick={() => onNavigate('admin_applications')}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
        >
          <ClipboardCheck className="mr-2 w-5 h-5" /> View All Applications
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Property Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {propertyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {propertyStatusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center text-xs min-w-0">
                <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                <span className="text-slate-500 capitalize truncate" title={`${entry.name}: ${entry.value}`}>
                  {entry.name}: <span className="font-bold text-slate-800">{entry.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Transactions Engine */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Global Financial Transactions</h3>
          </div>
          <div className="overflow-x-auto flex-1 h-[300px] overflow-y-auto custom-scrollbar">
            {store.transactions && store.transactions.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="px-6 py-4">Ref</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {store.transactions.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50).map(tx => {
                    const txUser = store.users.find(u => u.id === tx.user_id);
                    const userName = txUser ? txUser.name : (tx.user_id === 0 || tx.user_id === '0' ? 'Company Wallet' : 'Unknown');
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">{tx.reference || tx.id}</td>
                        <td className="px-6 py-4 text-xs text-slate-800 font-bold">{userName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            (tx.type === 'credit' || tx.type === 'deposit') ? 'bg-zinc-100 text-black' : 'bg-black text-white'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-black">₦{tx.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{tx.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                <DollarSign size={48} className="mb-4 text-slate-200" />
                <p className="text-[10px] font-black uppercase tracking-widest">Financial Registry Empty</p>
                <p className="text-[11px] text-slate-500 mt-2">No transactions have been recorded in the global ledger yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Wallets */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">User Wallet Balances</h3>
        </div>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          {store.users.filter(u => u.role === UserRole.AGENT).length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-6 py-3">Agent</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Wallet ID</th>
                  <th className="px-6 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {store.users.filter(u => u.role === UserRole.AGENT).map(agent => {
                  const w = (store.wallets || []).find(ow => ow.user_id === agent.id);
                  const balance = w ? w.balance : 0;
                  return (
                    <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-bold text-slate-800">{agent.name}</td>
                      <td className="px-6 py-3 text-xs text-slate-500">{agent.role}</td>
                      <td className="px-6 py-3 text-[10px] font-mono text-slate-400">{w?.id || 'No Wallet Yet'}</td>
                      <td className="px-6 py-3 text-sm font-black text-black">₦{balance.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <Users size={48} className="mb-4 text-slate-200" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Agents Registered</p>
              <p className="text-[11px] text-slate-500 mt-2">The system registry currently contains no agent profiles with assigned wallets.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    indigo: 'bg-zinc-100 text-black',
    emerald: 'bg-zinc-100 text-black',
    blue: 'bg-zinc-100 text-black',
    amber: 'bg-black text-white',
    rose: 'bg-zinc-200 text-zinc-900',
    slate: 'bg-zinc-50 text-slate-600',
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <div className={`p-2 w-fit rounded-lg mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-words">{label}</p>
      <p className="text-lg sm:text-xl font-bold text-slate-800 break-all">{value}</p>
    </div>
  );
};

export default AdminDashboard;
