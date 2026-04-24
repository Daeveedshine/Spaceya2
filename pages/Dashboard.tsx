
import React, { useMemo } from 'react';
import { User, UserRole, PropertyStatus, TicketStatus, NotificationType, ApplicationStatus } from '../types';
import { getStore, formatCurrency, formatDate } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building, Users, AlertTriangle, TrendingUp, Clock, FileText, Wrench, Bell, UserPlus } from 'lucide-react';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const store = getStore();
  const isDark = store.theme === 'dark';
  const { settings } = store;

  const stats = useMemo(() => {
      if (user.role === UserRole.AGENT) {
      const myPropertyIds = store.properties.filter(p => p.agentId === user.id).map(p => p.id);
      const revenue = store.payments
        .filter(p => p.status === 'paid' && myPropertyIds.includes(p.propertyId))
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const currentUser = store.users.find(u => u.id === user.id);
      
      const pendingApps = store.applications.filter(a => a.agentId === user.id && a.status === ApplicationStatus.PENDING).length;
      const openTickets = store.tickets.filter(t => t.status !== TicketStatus.RESOLVED && myPropertyIds.includes(t.propertyId)).length;

      return {
        totalProperties: store.properties.filter(p => p.agentId === user.id).length,
        occupiedProperties: store.properties.filter(p => p.agentId === user.id && p.status === PropertyStatus.OCCUPIED).length,
        pendingTickets: openTickets, 
        monthlyRevenue: formatCurrency(revenue, settings),
        pipelineCount: pendingApps + openTickets,
        walletBalance: formatCurrency(currentUser?.walletBalance || 0, settings)
      };
    } else {
      const myProperties = store.properties.filter(p => user.assignedPropertyIds?.includes(p.id));
      const myTickets = store.tickets.filter(t => t.tenantId === user.id);
      const myPayments = store.payments.filter(p => p.tenantId === user.id);
      const myAgreements = store.agreements.filter(a => a.tenantId === user.id);
      const latestAgreement = [...myAgreements].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
      
      return {
        propertyName: myProperties.length > 1 ? `${myProperties.length} Assets` : (myProperties[0]?.name || 'N/A'),
        rentStatus: myPayments.find(p => p.status === 'pending') ? 'Pending' : 'Paid',
        activeTickets: myTickets.filter(t => t.status !== TicketStatus.RESOLVED).length,
        leaseExpiry: latestAgreement ? formatDate(latestAgreement.endDate, settings) : 'N/A'
      };
    }
  }, [user, store, settings]);

  const recentNotifications = useMemo(() => {
    return store.notifications
      .filter(n => n.userId === user.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
  }, [store.notifications, user.id]);

  const paymentData = useMemo(() => {
    // Scaling graph data based on currency setting
    const scale = settings.localization.currency === 'NGN' ? 1 : (settings.localization.currency === 'USD' ? 0.00065 : 0.0006);
    
    // Initialize months for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const data = months.map(m => ({ name: m, amount: 0 }));

    store.payments.forEach(p => {
        if (p.status === 'paid') {
            const date = new Date(p.date);
            if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
                const monthIndex = date.getMonth();
                data[monthIndex].amount += p.amount;
            }
        }
    });

    // Apply currency scale
    return data.map(d => ({ ...d, amount: d.amount * scale }));
  }, [store.payments, settings.localization.currency]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">Overview</h1>
          <p className="text-zinc-500 font-medium tracking-tight mt-1">Lifecycle monitoring for {user.name}.</p>
        </div>
        {user.profilePictureUrl && (
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl">
             <img src={user.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
      </header>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${user.role === UserRole.AGENT ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        {user.role === UserRole.AGENT ? (
          <>
            <StatCard label="Portfolio" value={stats.totalProperties} icon={Building} color="blue" />
            <StatCard label="Wallet" value={stats.walletBalance} icon={TrendingUp} color="emerald" />
            <StatCard label="Agent Revenue" value={stats.monthlyRevenue} icon={TrendingUp} color="orange" />
          </>
        ) : (
          <>
            <StatCard label="Property" value={stats.propertyName} icon={Building} color="blue" />
            <StatCard label="Rent Status" value={stats.rentStatus} icon={Clock} color="purple" />
            <StatCard label="Maintenance" value={stats.activeTickets} icon={Wrench} color="orange" />
            <StatCard label="Expiry" value={stats.leaseExpiry} icon={FileText} color="emerald" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 rounded-[3rem] shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-white">Revenue Lifecycle</h3>
            <div className="bg-blue-600/10 dark:bg-blue-400/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 border border-blue-600/20">Monthly Yield ({settings.localization.currency})</div>
          </div>
          <div className="h-72 w-full min-w-0" style={{ minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#666' : '#9CA3AF', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#666' : '#9CA3AF', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  cursor={{fill: 'rgba(37, 99, 235, 0.1)'}}
                  contentStyle={{backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                  itemStyle={{color: '#2563EB', fontWeight: 'bold'}}
                />
                <Bar dataKey="amount" fill="#2563EB" radius={[12, 12, 12, 12]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[3rem] shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-white">Alert Registry</h3>
            <Bell className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div className="space-y-4 flex-1">
            {recentNotifications.length > 0 ? recentNotifications.map(notification => (
                <AlertItem 
                    key={notification.id}
                    title={notification.title} 
                    desc={notification.message} 
                    time={new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                />
            )) : (
                <div className="flex flex-col items-center justify-center h-full py-16 opacity-40">
                    <Bell className="w-12 h-12 mb-4 text-zinc-300" />
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Quiet Hub</p>
                </div>
            )}
          </div>
          <button className="w-full mt-8 py-4 glass-input rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 hover:scale-[1.02] transition-all">
              Access Full Archive
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-600/10 border-blue-600/20',
    purple: 'text-purple-600 bg-purple-600/10 border-purple-600/20',
    orange: 'text-orange-600 bg-orange-600/10 border-orange-600/20',
    emerald: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20',
  };

  return (
    <div className="glass-card p-8 rounded-[2.8rem] border-white/20 hover:scale-[1.02] active:scale-95 transition-all duration-500 cursor-pointer group shadow-sm hover:shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
        <div className={`p-3 rounded-2xl border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{value}</p>
    </div>
  );
};

const AlertItem = ({ title, desc, time }: any) => {
  return (
    <div className="p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-[10px] font-black uppercase text-zinc-900 dark:text-white tracking-tight">{title}</h4>
        <span className="text-[9px] text-zinc-500 font-bold">{time}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-2 font-medium">{desc}</p>
    </div>
  );
};

export default Dashboard;
