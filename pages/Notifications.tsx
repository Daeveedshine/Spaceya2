
import React, { useState, useMemo } from 'react';
import { User, Notification, NotificationType } from '../types';
import { getStore, saveStore, useAppStore } from '../store';
import { Bell, Check, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle2, MoreVertical, Search, Download } from 'lucide-react';

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
      case NotificationType.SUCCESS: return <CheckCircle2 className="text-emerald-500" />;
      case NotificationType.WARNING: return <AlertTriangle className="text-amber-500" />;
      case NotificationType.ERROR: return <AlertCircle className="text-rose-500" />;
      default: return <Info className="text-blue-500" />;
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
          <h1 className="text-2xl font-bold text-slate-800">Notification Center</h1>
          <p className="text-slate-500">Stay updated with your property events.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-3 py-2 rounded-lg"
            >
                <Check className="w-3.5 h-3.5 mr-1.5" /> Mark All as Read
            </button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search notifications..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`group bg-white p-4 rounded-2xl border transition-all hover:shadow-md flex items-start gap-4 ${notification.isRead ? 'border-slate-100 opacity-80' : 'border-indigo-100 bg-indigo-50/20 shadow-sm'}`}
          >
            <div className={`p-2 rounded-xl mt-1 ${notification.isRead ? 'bg-slate-50' : 'bg-white shadow-sm'}`}>
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`text-sm font-bold truncate ${notification.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                    {notification.title}
                    {!notification.isRead && <span className="ml-2 w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>}
                </h4>
                <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap ml-2">
                    {getTimeAgo(notification.timestamp)}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">
                {notification.message}
              </p>
              
              <div className="flex items-center gap-4">
                {notification.linkTo && (
                  <button 
                    onClick={() => onNavigate(notification.linkTo!)}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:underline"
                  >
                    View Details
                  </button>
                )}
                {notification.attachmentUrl && (
                  <a href={notification.attachmentUrl} download className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:underline uppercase tracking-wider">
                    <Download size={12} /> Download Attachment
                  </a>
                )}
                {!notification.isRead && (
                  <button 
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-indigo-600"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>

            <button 
                onClick={() => handleDelete(notification.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 transition-all rounded-lg"
            >
                <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-400">All caught up!</h3>
            <p className="text-slate-400 text-sm">No notifications found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
