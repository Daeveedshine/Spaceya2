
import React, { useState, useMemo } from 'react';
import { User, Notification, NotificationType } from '../types';
import { getStore, saveStore, useAppStore } from '../store';
import { Bell, Check, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle2, MoreVertical, Search, Download, ArrowRight } from 'lucide-react';

interface NotificationsProps {
  user: User;
  onRefreshCount: () => void;
  onNavigate: (view: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ user, onRefreshCount, onNavigate }) => {
  const [store, setStore] = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  const notifications = useMemo(() => {
    return store.notifications
      .filter(n => n.userId === user.id)
      .filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [store.notifications, user.id, searchTerm]);

  const handleMarkAsRead = (id: string) => {
    const updated = store.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    const newState = { ...store, notifications: updated };
    saveStore(newState);
    setStore(newState);
    onRefreshCount();
  };

  const handleMarkAllRead = () => {
    const updated = store.notifications.map(n => 
      n.userId === user.id ? { ...n, isRead: true } : n
    );
    const newState = { ...store, notifications: updated };
    saveStore(newState);
    setStore(newState);
    onRefreshCount();
  };

  const handleDelete = (id: string) => {
    const updated = store.notifications.filter(n => n.id !== id);
    const newState = { ...store, notifications: updated };
    saveStore(newState);
    setStore(newState);
    onRefreshCount();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS: return <CheckCircle2 className="text-black dark:text-white" />;
      case NotificationType.WARNING: return <AlertTriangle className="text-black dark:text-white" />;
      case NotificationType.ERROR: return <AlertCircle className="text-black dark:text-white" />;
      default: return <Info className="text-black dark:text-white" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter leading-none mb-2">Notification Center</h1>
          <p className="text-zinc-600 dark:text-zinc-300 font-medium text-sm">Stay updated with your property events.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={handleMarkAllRead}
                className="text-xs font-black text-white dark:text-black flex items-center bg-black dark:bg-white px-5 py-3 rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg"
            >
                <Check className="w-3.5 h-3.5 mr-1.5" /> Mark All as Read
            </button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search notifications..."
          className="w-full pl-14 pr-6 py-6 bg-white dark:bg-black border-2 border-zinc-100 dark:border-zinc-800 rounded-[2rem] focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 outline-none transition-all shadow-sm font-bold placeholder:text-zinc-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? notifications.map(notification => (
            <div 
            key={notification.id} 
            className={`group p-8 rounded-[2.5rem] border-2 transition-all flex items-start gap-6 ${notification.isRead ? 'bg-zinc-50/50 dark:bg-white/5 border-zinc-100 dark:border-zinc-800 opacity-60' : 'bg-white dark:bg-zinc-900 border-black dark:border-white shadow-2xl shadow-black/5'}`}
          >
            <div className={`p-4 rounded-2xl shrink-0 ${notification.isRead ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-black dark:bg-white'}`}>
              {notification.type === NotificationType.SUCCESS ? <CheckCircle2 className={notification.isRead ? 'text-zinc-400 dark:text-zinc-600' : 'text-white dark:text-black'} /> :
               notification.type === NotificationType.WARNING ? <AlertTriangle className={notification.isRead ? 'text-zinc-400 dark:text-zinc-600' : 'text-white dark:text-black'} /> :
               notification.type === NotificationType.ERROR ? <AlertCircle className={notification.isRead ? 'text-zinc-400 dark:text-zinc-600' : 'text-white dark:text-black'} /> :
               <Info className={notification.isRead ? 'text-zinc-400 dark:text-zinc-600' : 'text-white dark:text-black'} />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`text-lg font-black tracking-tight truncate ${notification.isRead ? 'text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
                    {notification.title}
                    {!notification.isRead && <span className="ml-3 w-2.5 h-2.5 rounded-full bg-black dark:bg-white inline-block animate-pulse"></span>}
                </h4>
                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 whitespace-nowrap ml-2 uppercase tracking-widest">
                    {getTimeAgo(notification.timestamp)}
                </span>
              </div>
              <p className={`text-sm leading-relaxed mb-6 whitespace-pre-wrap break-words font-bold ${notification.isRead ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-600 dark:text-zinc-300'}`}>
                {notification.message}
              </p>
              
              <div className="flex flex-wrap items-center gap-6">
                {notification.linkTo && (
                  <button 
                    onClick={() => onNavigate(notification.linkTo!)}
                    className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] hover:underline flex items-center gap-2 group/btn"
                  >
                    View Record <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                )}
                {notification.attachmentUrl && (
                  <a href={notification.attachmentUrl} download className="text-[10px] font-black text-black dark:text-white flex items-center gap-2 hover:underline uppercase tracking-[0.2em]">
                    <Download size={14} /> Download Attachment
                  </a>
                )}
                {!notification.isRead && (
                  <button 
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-black dark:hover:text-white transition-colors"
                  >
                    Mark as Archive
                  </button>
                )}
              </div>
            </div>

            <button 
                onClick={() => handleDelete(notification.id)}
                className="opacity-0 group-hover:opacity-100 p-4 text-zinc-300 hover:text-black dark:hover:text-white transition-all rounded-2xl bg-zinc-50 dark:bg-black/50"
            >
                <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )) : (
          <div className="text-center py-32 bg-white/5 rounded-[4rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800 space-y-8">
            <div className="relative w-fit mx-auto">
               <div className="absolute inset-0 bg-black blur-[80px] opacity-10 animate-pulse"></div>
               <div className="relative w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-black dark:border-white shadow-xl">
                  <Bell size={40} className="text-zinc-200 dark:text-zinc-800" />
               </div>
            </div>
            <div className="space-y-2">
               <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Dossier Balanced</h3>
               <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">No unread notifications on your registry.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
