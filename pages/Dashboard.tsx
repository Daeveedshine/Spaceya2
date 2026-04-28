
import React, { useMemo } from 'react';
import { User, UserRole, PropertyStatus, TicketStatus, NotificationType, ApplicationStatus } from '../types';
import { getStore, formatCurrency, formatDate, useAppStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building, Users, AlertTriangle, TrendingUp, Clock, FileText, Wrench, Bell, UserPlus } from 'lucide-react';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [store] = useAppStore();
  const isDark = store.theme === 'dark';
  const { settings } = store;

  const stats = useMemo(() => {
      if (user.role === UserRole.AGENT) {
      const myPropertyIds = store.properties.filter(p => p.agentId === user.id).map(p => p.id);
      const revenue = store.payments
        .filter(p => p.status === 'paid' && myPropertyIds.includes(p.propertyId))
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const userWallet = store.wallets?.find(w => w.user_id === user.id || w.userId === user.id);
      
      const pendingApps = store.applications.filter(a => a.agentId === user.id && a.status === ApplicationStatus.PENDING).length;
      const openTickets = store.tickets.filter(t => t.status !== TicketStatus.RESOLVED && myPropertyIds.includes(t.propertyId)).length;

      return {
        totalProperties: store.properties.filter(p => p.agentId === user.id).length,
        occupiedProperties: store.properties.filter(p => p.agentId === user.id && p.status === PropertyStatus.OCCUPIED).length,
        pendingTickets: openTickets, 
        monthlyRevenue: formatCurrency(revenue, settings),
        pipelineCount: pendingApps + openTickets,
        walletBalance: formatCurrency(userWallet?.balance || 0, settings)
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
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col sm:flex-row justify-between items-end gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div>
          <h1 className="text-3xl sm:text-6xl font-black text-zinc-900 dark:text-white tracking-[0.2em] sm:tracking-widest uppercase mb-2 break-words">Workspace</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] break-words">Monitoring Lifecycle for {user.name}</p>
        </div>
        {user.profilePictureUrl && (
          <div className="w-16 h-16 rounded-[2rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 cursor-pointer border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl">
             <img src={user.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
      </header>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${user.role === UserRole.AGENT ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-1`}>
        {user.role === UserRole.AGENT ? (
          <>
            <StatCard label="Portfolio" value={stats.totalProperties} icon={Building} color="zinc" />
            <StatCard label="Wallet" value={stats.walletBalance} icon={TrendingUp} color="zinc" />
            <StatCard label="Revenue" value={stats.monthlyRevenue} icon={TrendingUp} color="zinc" />
          </>
        ) : (
          <>
            <StatCard label="Asset" value={stats.propertyName} icon={Building} color="zinc" />
            <StatCard label="Cycle" value={stats.rentStatus} icon={Clock} color="zinc" />
            <StatCard label="Tickets" value={stats.activeTickets} icon={Wrench} color="zinc" />
            <StatCard label="Expiry" value={stats.leaseExpiry} icon={FileText} color="zinc" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
        <div className="lg:col-span-2 glass-card p-12 rounded-[4rem] border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Yield Analytics</h3>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-full">Currency: {settings.localization.currency}</div>
          </div>
          <div className="h-80 w-full" style={{ minHeight: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#444' : '#999', fontSize: 9, fontWeight: '900'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#444' : '#999', fontSize: 9, fontWeight: '900'}} />
                <Tooltip 
                  cursor={{fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}}
                  contentStyle={{backgroundColor: isDark ? '#000' : '#FFF', border: '1px solid #333', borderRadius: '20px', padding: '15px'}}
                />
                <Bar dataKey="amount" fill={isDark ? "#FFF" : "#000"} radius={[4, 4, 4, 4]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-12 rounded-[4rem] border-zinc-200 dark:border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Events</h3>
            <Bell className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="space-y-6 flex-1">
            {recentNotifications.length > 0 ? recentNotifications.map(notification => (
                <AlertItem 
                    key={notification.id}
                    title={notification.title} 
                    desc={notification.message} 
                    time={new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                />
            )) : (
                <div className="flex flex-col items-center justify-center h-full py-16 opacity-20">
                    <Bell className="w-10 h-10 mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-center italic">Archive is Clear</p>
                </div>
            )}
          </div>
          <button className="w-full mt-10 py-5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[2rem] text-[9px] font-black uppercase tracking-[0.4em] hover:opacity-80 transition-all">
              Archival Center
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => {
  return (
    <div className="glass-card p-10 rounded-[3.5rem] border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-500 cursor-pointer group shadow-none border-0">
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 opacity-100 break-words">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none break-all">{value}</p>
        <Icon className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
      </div>
    </div>
  );
};

const AlertItem = ({ title, desc, time }: any) => {
  return (
    <div className="group border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-2">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-[10px] font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-widest">{title}</h4>
        <span className="text-[9px] text-zinc-400 font-bold">{time}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500 font-medium opacity-80">{desc}</p>
    </div>
  );
};

export default Dashboard;
