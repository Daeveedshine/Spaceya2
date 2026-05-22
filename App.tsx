
import React, { useState, useEffect, Suspense } from 'react';
import { Toaster, toast } from 'sonner';

const TopLoadingBar: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressInterval: number;
    let hideTimeout: number;

    const handleStart = () => {
      setLoading(true);
      setProgress(10);
      clearInterval(progressInterval);
      clearTimeout(hideTimeout);
      progressInterval = window.setInterval(() => {
        setProgress(p => (p < 85 ? p + Math.random() * 15 : p));
      }, 200);
    };

    const handleEnd = () => {
      clearInterval(progressInterval);
      setProgress(100);
      hideTimeout = window.setTimeout(() => {
        setLoading(false);
        setTimeout(() => setProgress(0), 200); // reset after hidden
      }, 300);
    };

    window.addEventListener('sync-start', handleStart);
    window.addEventListener('sync-end', handleEnd);

    return () => {
      window.removeEventListener('sync-start', handleStart);
      window.removeEventListener('sync-end', handleEnd);
      clearInterval(progressInterval);
      clearTimeout(hideTimeout);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[10000] overflow-hidden pointer-events-none">
      <div 
        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

import { User, UserRole, TicketStatus, ApplicationStatus } from './types';
import { getStore, saveStore, initFirebaseSync } from './store';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Properties from './pages/Properties';
import Maintenance from './pages/Maintenance';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Applications from './pages/Applications';
import Screenings from './pages/Screenings';
import AdminApplications from './pages/AdminApplications';
import Profile from './pages/Profile';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Building2, Wrench, CreditCard, LogOut, Menu, X, Shield, 
  FileText, Bell, Table, Building, ClipboardCheck, UserPlus, 
  User as UserIcon, ChevronLeft, ChevronRight, Cloud
} from 'lucide-react';
import { isConfigured, configurationError } from './firebaseConfig';
import { requestNotificationPermission } from './lib/notifications';

const ConfigurationErrorScreen: React.FC<{ error: string }> = ({ error }) => {
  const isVercel = window.location.hostname.includes('vercel.app');
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 md:p-16 shadow-2xl space-y-8">
        <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-12 h-12 text-black dark:text-white" />
        </div>
        
        <div>
          <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">Connection Required</h1>
          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
            This application requires a secure connection to Firebase which hasn't been configured yet.
          </p>
        </div>
        
        <div className="p-6 bg-zinc-100 dark:bg-black rounded-3xl text-left border border-zinc-200 dark:border-zinc-800">
           <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-words">
             {error}
           </p>
        </div>

        {isVercel && (
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">To fix this on Vercel:</p>
            <ol className="text-xs text-zinc-500 dark:text-zinc-400 space-y-3 list-decimal list-inside text-left leading-relaxed">
              <li>Open your project dashboard on Vercel</li>
              <li>Go to <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Settings &gt; Environment Variables</span></li>
              <li>Add all required <span className="font-mono text-brandblue">VITE_FIREBASE_*</span> variables</li>
              <li>
                <span className="font-bold text-rose-600 dark:text-rose-400">CRITICAL:</span> Go to the <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Deployments</span> tab and click <span className="font-bold">Redeploy</span> on your latest build.
                <p className="mt-1 ml-4 text-[10px] opacity-70 italic">Variables are injected at build-time; updating them requires a new build.</p>
              </li>
            </ol>
          </div>
        )}

        <div className="flex flex-col gap-4 pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            Reload to Check Connection
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-[0.4em]">Development System • Status: Restricted</p>
    </div>
  );
};

export const Logo: React.FC<{ size?: number, className?: string }> = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M50 30V70" 
      stroke="currentColor" 
      strokeWidth="8" 
      strokeLinecap="round"
    />
    <path 
      d="M50 30C50 18.9543 58.9543 10 70 10C81.0457 10 90 18.9543 90 30V50" 
      stroke="currentColor" 
      strokeWidth="8" 
      strokeLinecap="round"
    />
    <path 
      d="M50 70C50 81.0457 41.0457 90 30 90C18.9543 90 10 81.0457 10 70V50" 
      stroke="currentColor" 
      strokeWidth="8" 
      strokeLinecap="round"
    />
    <circle cx="70" cy="30" r="6" fill="currentColor" />
    <circle cx="30" cy="70" r="6" fill="currentColor" />
  </svg>
);

const SkeletonLoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white dark:bg-zinc-950 overflow-hidden z-[9999] relative">
      {/* Sidebar Skeleton */}
      <aside className="hidden md:flex flex-col w-72 bg-zinc-50 dark:bg-black border-r border-zinc-200 dark:border-zinc-900 p-8 h-full shrink-0">
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-3xl animate-pulse mb-4"></div>
          <div className="w-32 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
        </div>
        <div className="space-y-6 w-full">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-2">
              <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse shrink-0"></div>
              <div className="w-full text-left h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-6 md:p-10 flex flex-col h-full bg-white dark:bg-zinc-950">
        {/* Mobile Header Skeleton */}
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-zinc-100 dark:border-zinc-900">
           <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
           <div className="w-24 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
        </div>

        {/* Dashboard Header Skeleton */}
        <div className="mb-10 flex justify-between items-end">
          <div className="space-y-4 w-full max-w-md">
            <div className="w-24 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse"></div>
            <div className="w-2/3 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
          </div>
          <div className="hidden md:block w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse shrink-0"></div>
        </div>

        {/* Top Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 rounded-3xl p-6 h-36 flex flex-col justify-between">
               <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
               <div className="space-y-2">
                 <div className="w-1/3 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse"></div>
                 <div className="w-2/3 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
               </div>
            </div>
          ))}
        </div>

        {/* Main List Skeleton */}
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 flex flex-col">
           <div className="w-1/4 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md mb-8 animate-pulse"></div>
           <div className="space-y-4 flex-1">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="w-full h-20 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-pulse flex items-center p-4 gap-4">
                    <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl shrink-0"></div>
                    <div className="space-y-2 flex-1">
                      <div className="w-1/3 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md"></div>
                      <div className="w-1/4 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm"></div>
                    </div>
                 </div>
               ))}
           </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [badges, setBadges] = useState({ notifications: 0, maintenance: 0, screenings: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [synced, setSynced] = useState(false);

  const refreshBadges = () => {
    const store = getStore();
    if (!store.currentUser) return;
    const u = store.currentUser;

    const notifications = store.notifications.filter(n => n.userId === u.id && !n.isRead).length;

    let maintenance = 0;
    if (u.role === UserRole.AGENT) {
       const agentProps = store.properties.filter(p => p.agentId === u.id).map(p => p.id);
       maintenance = store.tickets.filter(t => t.status === TicketStatus.OPEN && agentProps.includes(t.propertyId)).length;
    } else if (u.role === UserRole.ADMIN) {
       maintenance = store.tickets.filter(t => t.status === TicketStatus.OPEN).length;
    }

    let screenings = 0;
    if (u.role === UserRole.AGENT) {
       screenings = store.applications.filter(a => a.status === ApplicationStatus.PENDING && a.agentId === u.id).length;
    } else if (u.role === UserRole.ADMIN) {
       screenings = store.applications.filter(a => a.status === ApplicationStatus.PENDING).length;
    }

    setBadges({ notifications, maintenance, screenings });
  };

  useEffect(() => {
    const store = getStore();
    document.documentElement.classList.add('dark');
    
    // Check for Referral Link in URL
    const params = new URLSearchParams(window.location.search);
    const refAgentId = params.get('ref');
    if (refAgentId) {
      localStorage.setItem('referral_agent_id', refAgentId);
      // Clean URL without refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    requestNotificationPermission();

    let unsubscribe: () => void = () => {};

    // Initialize Firebase Sync
    if (isConfigured) {
        unsubscribe = initFirebaseSync((newState) => {
            // Re-render UI on remote changes if current user is logged in
            if (newState.currentUser) {
                setUser(newState.currentUser);
                refreshBadges();
                setSynced(true);
            }
        });
    }

    const timer = setTimeout(() => {
      if (store.currentUser) {
        setUser(store.currentUser);
        if (store.currentUser.role === UserRole.ADMIN) setView('admin_dashboard');
        refreshBadges();
      }
      setIsLoading(false);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleLogin = (loggedUser: User) => {
    const store = getStore();
    store.currentUser = loggedUser;
    saveStore(store);
    setUser(loggedUser);
    requestNotificationPermission();
    
    // Check if there is a pending referral action
    const pendingReferralId = localStorage.getItem('referral_agent_id');
    
    if (pendingReferralId && loggedUser.role === UserRole.TENANT) {
      setView('applications');
    } else {
      setView(loggedUser.role === UserRole.ADMIN ? 'admin_dashboard' : 'dashboard');
    }
    
    refreshBadges();
  };

  const handleLogout = async () => {
    try {
      const { auth } = await import('./firebaseConfig');
      if (auth) {
        await auth.signOut();
      }
    } catch(e) {
      console.error(e);
    }
    const store = getStore();
    store.currentUser = null;
    saveStore(store);
    setUser(null);
  };

  const renderView = () => {
    if (!user) return null;
    
    let content: React.ReactNode;
    switch (view) {
      case 'admin_dashboard': content = <AdminDashboard user={user} onNavigate={setView} />; break;
      case 'dashboard': content = <Dashboard user={user} onNavigate={setView} />; break;
      case 'properties': content = <Properties user={user} />; break;
      case 'maintenance': content = <Maintenance user={user} onUpdate={refreshBadges} />; break;
      case 'payments': content = <Payments user={user} />; break;
      case 'notifications': content = <Notifications user={user} onRefreshCount={refreshBadges} onNavigate={setView} />; break;
      case 'reports': content = <Reports user={user} />; break;
      case 'applications': content = <Applications user={user} onNavigate={setView} onUpdate={refreshBadges} />; break;
      case 'screenings': content = <Screenings user={user} onNavigate={setView} onUpdate={refreshBadges} />; break;
      case 'admin_applications': content = <AdminApplications user={user} onBack={() => setView('admin_dashboard')} />; break;
      case 'profile': content = <Profile user={user} onUserUpdate={setUser} />; break;
      default: content = <Dashboard user={user} onNavigate={setView} />; break;
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full min-h-full"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

  const navItems = [
    { id: 'admin_dashboard', label: 'Admin Panel', icon: Shield, roles: [UserRole.ADMIN] },
    { id: 'dashboard', label: 'Overview', icon: Home, roles: [UserRole.AGENT, UserRole.TENANT] },
    { id: 'applications', label: 'Apply Now', icon: UserPlus, roles: [UserRole.TENANT] },
    { id: 'properties', label: 'Properties', icon: Building2, roles: [UserRole.AGENT, UserRole.ADMIN, UserRole.TENANT] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN], badge: badges.maintenance },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN], badge: badges.notifications },
    { id: 'screenings', label: 'Screenings', icon: ClipboardCheck, roles: [UserRole.AGENT, UserRole.ADMIN], badge: badges.screenings },
    { id: 'reports', label: 'Report', icon: Table, roles: [UserRole.AGENT, UserRole.ADMIN] },
    { id: 'payments', label: 'Wallet', icon: CreditCard, roles: [UserRole.AGENT, UserRole.ADMIN] },
    { id: 'profile', label: 'My Profile', icon: UserIcon, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN] },
  ];

  if (!isConfigured && configurationError) {
    return <ConfigurationErrorScreen error={configurationError} />;
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
           key="splash"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.5 }}
           className="fixed inset-0 z-[9999]"
        >
          <SkeletonLoadingScreen />
        </motion.div>
      ) : !user ? (
        <motion.div
           key="login"
           initial={{ opacity: 0, scale: 1.05 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           transition={{ duration: 0.5, ease: "easeOut" }}
           className="w-full h-full"
        >
          <Login onLogin={handleLogin} />
        </motion.div>
      ) : (
        <motion.div 
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row h-screen w-full text-zinc-900 dark:text-white transition-colors duration-300 relative overflow-hidden"
        >
          {/* Mobile Backdrop Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden transition-opacity duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between bg-white dark:bg-black p-4 shadow-sm shrink-0 z-[60] border-b border-black dark:border-white">
            <div className="flex items-center gap-2">
               <Logo size={24} className="text-black dark:text-white" />
               <h1 className="font-bold text-lg tracking-tighter">SPACEYA</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black active:scale-95 transition-transform"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className={`
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
            fixed inset-y-0 left-0 z-[100] w-[85%] sm:w-72 md:w-auto text-zinc-900 dark:text-zinc-100 transition-all duration-300 ease-out 
            md:translate-x-0 md:static md:inset-auto print:hidden flex flex-col shrink-0
            border-none
            bg-zinc-50 dark:bg-black
            ${!isSidebarCollapsed ? 'md:w-80' : 'md:w-20'}
            h-full overflow-y-auto custom-scrollbar
          `}>
            <div className={`p-6 md:p-8 min-h-full flex flex-col ${isSidebarCollapsed ? 'items-center' : ''}`}>
              <div className="mb-8 text-center flex flex-col items-center">
                <div className="inline-block transition-all">
                   <Logo size={isSidebarCollapsed ? 32 : 44} className="text-black dark:text-white" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="mt-4 flex flex-col items-center">
                    <h1 className="text-3xl font-black tracking-[-0.05em] text-black dark:text-white uppercase">SPACEYA</h1>
                    <div className="mt-2.5">
                      {user?.role === UserRole.AGENT && (
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-md text-[9px] font-black uppercase tracking-[0.2em]">Agent</span>
                      )}
                      {user?.role === UserRole.TENANT && (
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md text-[9px] font-black uppercase tracking-[0.2em]">Tenant</span>
                      )}
                      {user?.role === UserRole.ADMIN && (
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-[9px] font-black uppercase tracking-[0.2em]">Admin</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {navItems.filter(item => item.roles.includes(user?.role || UserRole.TENANT)).map(item => (
                  <button
                    key={item.id}
                    title={isSidebarCollapsed ? item.label : ''}
                    onClick={() => { setView(item.id); setIsMobileMenuOpen(false); }}
                    className={`
                      w-full flex items-center font-black rounded-full transition-all relative group
                      ${isSidebarCollapsed ? 'justify-center p-3 mb-1.5' : 'px-6 py-3.5 text-[10px] uppercase tracking-widest'}
                      ${view === item.id ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl' : 'text-black/60 hover:text-black dark:text-zinc-400 dark:hover:text-white'}
                    `}
                  >
                    <item.icon className={`${isSidebarCollapsed ? '' : 'mr-6'} h-4 w-4 shrink-0`} /> 
                    {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    
                    {item.badge && item.badge > 0 ? (
                      !isSidebarCollapsed ? (
                        <span className="ml-auto bg-black dark:bg-white text-white dark:text-black text-[9px] px-2 py-0.5 rounded-full font-black border border-zinc-200 dark:border-zinc-800">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-black dark:bg-white rounded-full border border-white dark:border-zinc-900"></span>
                      )
                    ) : null}
                  </button>
                ))}
              </nav>

              <div className={`pt-4 border-t border-zinc-200 dark:border-white/10 mt-4 space-y-1.5 shrink-0 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                 <button 
                   onClick={handleLogout} 
                   title={isSidebarCollapsed ? "Sign Out" : ""}
                   className={`w-full flex items-center font-bold text-black dark:text-zinc-400 hover:text-rose-500 rounded-2xl transition-colors ${isSidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3 text-xs'}`}
                 >
                   <LogOut className={`${isSidebarCollapsed ? '' : 'mr-4'} h-5 w-5`} /> 
                   {!isSidebarCollapsed && "Sign Out"}
                 </button>

                 {/* Desktop Collapse Toggle */}
                 <button 
                   onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                   className="hidden md:flex w-full items-center justify-center p-3 text-black/60 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-all"
                 >
                   {isSidebarCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /><span className="text-[10px] uppercase font-black tracking-widest">Collapse Menu</span></div>}
                 </button>
                 
                 {!isSidebarCollapsed && isConfigured && (
                    <div className="flex items-center justify-center gap-2 pt-2 text-[9px] font-black text-black dark:text-white uppercase tracking-widest opacity-60">
                        <Cloud size={10} /> Cloud Sync Active
                    </div>
                 )}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-6 print:p-0 transition-all duration-300 relative z-10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <div className="max-w-7xl mx-auto min-h-full flex flex-col">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex h-full w-full items-center justify-center pt-24 text-zinc-500 dark:text-zinc-400">
                     <div className="flex flex-col items-center gap-4 animate-pulse">
                       <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
                       <p className="tracking-widest font-bold uppercase text-xs">Loading Interface...</p>
                     </div>
                  </div>
                }>
                  {renderView()}
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;
