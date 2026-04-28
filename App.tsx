
import React, { useState, useEffect, Suspense } from 'react';
import { User, UserRole, TicketStatus, ApplicationStatus } from './types';
import { getStore, saveStore, initFirebaseSync } from './store';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Properties from './pages/Properties';
import Maintenance from './pages/Maintenance';
import Payments from './pages/Payments';
import Agreements from './pages/Agreements';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Applications from './pages/Applications';
import Screenings from './pages/Screenings';
import AdminApplications from './pages/AdminApplications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { 
  Home, Building2, Wrench, CreditCard, LogOut, Menu, X, Shield, 
  FileText, Bell, Table, Building, ClipboardCheck, UserPlus, 
  User as UserIcon, Moon, Sun, ChevronLeft, ChevronRight, Settings as SettingsIcon, Cloud
} from 'lucide-react';
import { isConfigured, configurationError } from './firebaseConfig';

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
      
      <p className="mt-8 text-[10px] text-zinc-400 font-bold uppercase tracking-[0.4em]">Development System • Status: Restricted</p>
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

const SplashScreen: React.FC = () => (
  <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white transition-opacity duration-1000 overflow-hidden">
    <video 
      autoPlay muted loop playsInline 
      className="absolute inset-0 w-full h-full object-cover scale-105 opacity-40"
    >
      <source src="https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-mansion-with-a-pool-and-garden-4286-large.mp4" type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
    <div className="relative z-10 animate-pulse-gentle flex flex-col items-center text-center px-6">
      <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl mb-8 transform hover:scale-105 transition-transform duration-500">
        <Logo size={64} className="text-white" />
      </div>
      <h1 className="text-6xl font-semibold tracking-tighter mb-2 drop-shadow-xl text-white">SPACEYA</h1>
      <p className="text-white opacity-60 font-playfair tracking-widest text-lg italic">Your Space, Handled</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [badges, setBadges] = useState({ notifications: 0, maintenance: 0, screenings: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [synced, setSynced] = useState(false);

  // Sync Settings Function
  const syncVisualSettings = () => {
    const store = getStore();
    const { appearance } = store.settings;
    
    document.documentElement.classList.toggle('disable-animations', !appearance.animations);
    document.documentElement.classList.toggle('ui-compact', appearance.density === 'compact');
    document.documentElement.classList.toggle('no-glass', !appearance.glassEffect);
  };

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
    const savedTheme = store.theme || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    
    // Check for Referral Link in URL
    const params = new URLSearchParams(window.location.search);
    const refAgentId = params.get('ref');
    if (refAgentId) {
      localStorage.setItem('referral_agent_id', refAgentId);
      // Clean URL without refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Initial sync
    syncVisualSettings();

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
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    const store = getStore();
    store.theme = newTheme;
    saveStore(store);
  };

  const handleLogin = (loggedUser: User) => {
    const store = getStore();
    store.currentUser = loggedUser;
    saveStore(store);
    setUser(loggedUser);
    
    // Check if there is a pending referral action
    const pendingReferralId = localStorage.getItem('referral_agent_id');
    
    if (pendingReferralId && loggedUser.role === UserRole.TENANT) {
      setView('applications');
    } else {
      setView(loggedUser.role === UserRole.ADMIN ? 'admin_dashboard' : 'dashboard');
    }
    
    refreshBadges();
    syncVisualSettings(); // Refresh visual state on login
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
    
    switch (view) {
      case 'admin_dashboard': return <AdminDashboard user={user} onNavigate={setView} />;
      case 'dashboard': return <Dashboard user={user} />;
      case 'properties': return <Properties user={user} />;
      case 'maintenance': return <Maintenance user={user} onUpdate={refreshBadges} />;
      case 'payments': return <Payments user={user} />;
      case 'agreements': return <Agreements user={user} />;
      case 'notifications': return <Notifications user={user} onRefreshCount={refreshBadges} onNavigate={setView} />;
      case 'reports': return <Reports user={user} />;
      case 'applications': return <Applications user={user} onNavigate={setView} onUpdate={refreshBadges} />;
      case 'screenings': return <Screenings user={user} onNavigate={setView} onUpdate={refreshBadges} />;
      case 'admin_applications': return <AdminApplications user={user} onBack={() => setView('admin_dashboard')} />;
      case 'profile': return <Profile user={user} onUserUpdate={setUser} />;
      case 'settings': return <Settings user={user} onThemeChange={setTheme} onSettingsUpdate={syncVisualSettings} />;
      default: return <Dashboard user={user} />;
    }
  };

  const navItems = [
    { id: 'admin_dashboard', label: 'Admin Panel', icon: Shield, roles: [UserRole.ADMIN] },
    { id: 'dashboard', label: 'Overview', icon: Home, roles: [UserRole.AGENT, UserRole.TENANT] },
    { id: 'applications', label: 'Apply Now', icon: UserPlus, roles: [UserRole.TENANT] },
    { id: 'properties', label: 'Properties', icon: Building2, roles: [UserRole.AGENT, UserRole.ADMIN, UserRole.TENANT] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN], badge: badges.maintenance },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN], badge: badges.notifications },
    { id: 'screenings', label: 'Screenings', icon: ClipboardCheck, roles: [UserRole.AGENT, UserRole.ADMIN], badge: badges.screenings },
    { id: 'reports', label: 'Global Registry', icon: Table, roles: [UserRole.AGENT, UserRole.ADMIN] },
    { id: 'agreements', label: 'Agreements (Soon)', icon: FileText, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN] },
    { id: 'payments', label: 'Rent & Payments', icon: CreditCard, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN] },
    { id: 'profile', label: 'My Profile', icon: UserIcon, roles: [UserRole.AGENT, UserRole.TENANT, UserRole.ADMIN] },
  ];

  if (!isConfigured && configurationError) {
    return <ConfigurationErrorScreen error={configurationError} />;
  }

  if (isLoading) return <SplashScreen />;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen text-zinc-900 dark:text-white transition-colors duration-300 overflow-hidden relative">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between glass-card p-4 shadow-sm shrink-0 z-[60] border-b border-black dark:border-white">
        <div className="flex items-center gap-2">
           <Logo size={24} className="text-black dark:text-white" />
           <h1 className="font-bold text-lg tracking-tighter">SPACEYA</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white active:scale-95 transition-transform"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
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
        fixed inset-y-0 left-0 z-[100] w-[85%] sm:w-72 md:w-auto glass-card text-zinc-900 dark:text-zinc-100 transition-all duration-300 ease-out 
        md:translate-x-0 md:static md:inset-auto print:hidden flex flex-col shrink-0
        border-none
        bg-zinc-50 dark:bg-black
        ${!isSidebarCollapsed ? 'md:w-80' : 'md:w-20'}
      `}>
        <div className={`p-10 md:p-12 h-full flex flex-col ${isSidebarCollapsed ? 'items-center' : ''}`}>
          <div className={`mb-16 ${isSidebarCollapsed ? 'text-center' : ''}`}>
            <div className={`inline-block transition-all ${isSidebarCollapsed ? '' : ''}`}>
               <Logo size={isSidebarCollapsed ? 32 : 44} className="text-zinc-900 dark:text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="mt-8">
                <h1 className="text-3xl font-black tracking-[-0.05em] text-zinc-900 dark:text-white uppercase">Spaceya</h1>
                <p className="text-[9px] text-zinc-400 uppercase tracking-[0.4em] font-black mt-2">Executive Access</p>
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
                  ${isSidebarCollapsed ? 'justify-center p-4 mb-2' : 'px-8 py-5 text-[10px] uppercase tracking-widest'}
                  ${view === item.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-2xl' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}
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

          <div className={`pt-6 border-t border-zinc-200 dark:border-white/10 mt-6 space-y-2 shrink-0 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
             <button 
               onClick={toggleTheme}
               title={isSidebarCollapsed ? "Toggle Theme" : ""}
               className={`w-full flex items-center font-bold text-zinc-500 dark:text-zinc-400 hover:bg-white/10 dark:hover:bg-black/30 rounded-2xl transition-all ${isSidebarCollapsed ? 'justify-center p-3.5' : 'px-5 py-3.5 text-xs'}`}
             >
               {theme === 'light' ? <Moon className={`${isSidebarCollapsed ? '' : 'mr-4'} h-5 w-5`} /> : <Sun className={`${isSidebarCollapsed ? '' : 'mr-4'} h-5 w-5`} />}
               {!isSidebarCollapsed && "Toggle Theme"}
             </button>
             
             <button 
               onClick={handleLogout} 
               title={isSidebarCollapsed ? "Sign Out" : ""}
               className={`w-full flex items-center font-bold text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded-2xl transition-colors ${isSidebarCollapsed ? 'justify-center p-3.5' : 'px-5 py-3.5 text-xs'}`}
             >
               <LogOut className={`${isSidebarCollapsed ? '' : 'mr-4'} h-5 w-5`} /> 
               {!isSidebarCollapsed && "Sign Out"}
             </button>

             {/* Desktop Collapse Toggle */}
             <button 
               onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
               className="hidden md:flex w-full items-center justify-center p-3.5 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-all"
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
      <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-10 print:p-0 transition-all duration-300 relative z-10 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto h-full">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex h-full w-full items-center justify-center pt-24 text-zinc-400">
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
    </div>
  );
};

export default App;
