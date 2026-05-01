import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { getStore, saveStore, UserSettings } from '../store';
import { 
  Bell, Smartphone, Layout, 
  Globe, Shield, Eye, Save, CheckCircle2, 
  ToggleLeft, ToggleRight, Type, CreditCard,
  Wrench, Activity, ChevronRight, Info
} from 'lucide-react';

interface SettingsProps {
  user: User;
  onSettingsUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onSettingsUpdate }) => {
  const store = getStore();
  const [settings, setSettings] = useState<UserSettings>(store.settings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleToggleNotification = (key: keyof UserSettings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleUpdateAppearance = (key: keyof UserSettings['appearance'], value: any) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      const currentStore = getStore();
      const newState = { 
        ...currentStore, 
        settings 
      };
      saveStore(newState);
      onSettingsUpdate(); // Trigger global class synchronization
      setIsSaving(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-black dark:text-white tracking-tighter">Application Hub</h1>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium mt-1">Personalize your SPACEYA lifecycle experience.</p>
        </div>
        <div className="flex items-center gap-3">
           {showSaved && (
             <div className="flex items-center text-black dark:text-white text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-right-4">
                <CheckCircle2 size={16} className="mr-2" /> Synced to Vault
             </div>
           )}
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
           >
             {isSaving ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
             Commit Changes
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Appearance & Interface */}
        <section className="space-y-6">
           <div className="flex items-center gap-3 text-zinc-400">
              <Eye size={20} className="text-black dark:text-white" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">Appearance & Vision</h3>
           </div>
           
           <div className="glass-card p-8 rounded-[2.5rem] space-y-8 border border-white/20 dark:border-white/5">
              <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-sm font-bold text-black dark:text-white">Display Density</p>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">Adjust workspace whitespace.</p>
                 </div>
                 <select 
                   className="bg-zinc-100 dark:bg-black text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 outline-none text-zinc-900 dark:text-white"
                   value={settings.appearance.density}
                   onChange={e => handleUpdateAppearance('density', e.target.value)}
                 >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                 </select>
              </div>

              <ToggleItem 
                icon={Smartphone} 
                label="Kinetic Motion" 
                desc="Enable icon animations & transitions." 
                active={settings.appearance.animations} 
                onClick={() => handleUpdateAppearance('animations', !settings.appearance.animations)} 
              />

              <ToggleItem 
                icon={Globe} 
                label="Glassmorphism" 
                desc="Enable high-end depth effects." 
                active={settings.appearance.glassEffect} 
                onClick={() => handleUpdateAppearance('glassEffect', !settings.appearance.glassEffect)} 
              />
           </div>
        </section>

        {/* Intelligence Alerts */}
        <section className="space-y-6">
           <div className="flex items-center gap-3 text-zinc-400">
              <Bell size={20} className="text-black dark:text-white" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">Intelligence Alerts</h3>
           </div>
           
           <div className="glass-card p-8 rounded-[2.5rem] space-y-8 border border-white/20 dark:border-white/5">
              <ToggleItem 
                icon={Bell} 
                label="Direct Push" 
                desc="Real-time browser notifications." 
                active={settings.notifications.push} 
                onClick={() => handleToggleNotification('push')} 
              />
              <ToggleItem 
                icon={Globe} 
                label="Email Digest" 
                desc="Weekly lifecycle summary." 
                active={settings.notifications.email} 
                onClick={() => handleToggleNotification('email')} 
              />
              <ToggleItem 
                icon={Wrench} 
                label="Maintenance Alerts" 
                desc="Notify on fault status updates." 
                active={settings.notifications.maintenance} 
                onClick={() => handleToggleNotification('maintenance')} 
              />
              <ToggleItem 
                icon={CreditCard} 
                label="Payment Reminders" 
                desc="Notify on rent cycle approach." 
                active={settings.notifications.payments} 
                onClick={() => handleToggleNotification('payments')} 
              />
           </div>
        </section>

        {/* Regional & Localization */}
        <section className="space-y-6">
           <div className="flex items-center gap-3 text-zinc-400">
              <Globe size={20} className="text-black dark:text-white" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">Regional Protocols</h3>
           </div>
           
           <div className="glass-card p-8 rounded-[2.5rem] space-y-8 border border-white/20 dark:border-white/5">
              <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-sm font-bold text-black dark:text-white">Active Currency</p>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">Primary financial display unit.</p>
                 </div>
                 <select 
                   className="bg-zinc-100 dark:bg-black text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 outline-none text-zinc-900 dark:text-white"
                   value={settings.localization.currency}
                   onChange={e => setSettings(prev => ({ ...prev, localization: { ...prev.localization, currency: e.target.value as any } }))}
                 >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                 </select>
              </div>

              <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-sm font-bold text-black dark:text-white">Timestamp Format</p>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">Standardized calendar display.</p>
                 </div>
                 <select 
                   className="bg-zinc-100 dark:bg-black text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 outline-none text-zinc-900 dark:text-white"
                   value={settings.localization.dateFormat}
                   onChange={e => setSettings(prev => ({ ...prev, localization: { ...prev.localization, dateFormat: e.target.value as any } }))}
                 >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                 </select>
              </div>
           </div>
        </section>

        {/* Security & Access */}
        <section className="space-y-6">
           <div className="flex items-center gap-3 text-zinc-400">
              <Shield size={20} className="text-black dark:text-white" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">Vault Security</h3>
           </div>
           
           <div className="glass-card p-8 rounded-[2.5rem] border border-white/20 dark:border-white/5 h-full flex flex-col justify-center">
              <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border border-zinc-200 dark:border-zinc-700 text-center space-y-4">
                 <Shield size={32} className="text-black dark:text-white mx-auto" />
                 <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                   Your session is currently bridge-encrypted via SPACEYA Secure Protocol.
                 </p>
                 <button className="w-full py-3 bg-white dark:bg-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors shadow-sm">
                    Review Access Logs
                 </button>
              </div>
           </div>
        </section>
      </div>

      <footer className="mt-12 p-8 bg-zinc-950 rounded-[3rem] border border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-white">
               <Info size={24} />
            </div>
            <div>
               <p className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Global Config v4.2.0</p>
               <p className="text-[10px] text-zinc-500 font-medium">Changes here affect your entire lifecycle suite.</p>
            </div>
         </div>
         <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.4em]">© 2024 SPACEYA GLOBAL OPS</p>
      </footer>
    </div>
  );
};

const ToggleItem = ({ icon: Icon, label, desc, active, onClick }: any) => (
  <div className="flex items-center justify-between group">
     <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl transition-all ${active ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-black text-zinc-400'}`}>
           <Icon size={18} />
        </div>
        <div className="space-y-0.5">
           <p className="text-sm font-bold text-black dark:text-white leading-none">{label}</p>
           <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">{desc}</p>
        </div>
     </div>
     <button onClick={onClick} className="text-black dark:text-white transition-transform active:scale-90">
        {active ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-300 dark:text-zinc-800" />}
     </button>
  </div>
);

export default Settings;