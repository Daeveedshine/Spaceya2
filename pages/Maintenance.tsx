
import React, { useState, useRef, useMemo } from 'react';
import { User, UserRole, MaintenanceTicket, TicketStatus, TicketPriority, NotificationType } from '../types';
import { getStore, saveStore, useAppStore } from '../store';
import { Plus, CheckCircle2, Clock, AlertCircle, Wrench, X, ChevronDown, Camera, Image as ImageIcon, Sparkles, Loader2, Maximize2, Building } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';

interface MaintenanceProps {
  user: User;
  onUpdate?: () => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ user, onUpdate }) => {
  const [store, setStore] = useAppStore();
  const tickets = user.role === UserRole.AGENT || user.role === UserRole.ADMIN
      ? store.tickets 
      : store.tickets.filter(t => t.tenantId === user.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIssue, setNewIssue] = useState('');
  const myProperties = useMemo(() => {
    return store.properties.filter(p => user.assignedPropertyIds?.includes(p.id) || p.tenantId === user.id);
  }, [store.properties, user]);

  const [newPropertyId, setNewPropertyId] = useState(myProperties[0]?.id || user.assignedPropertyIds?.[0] || '');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
        try {
            const compressed = await compressImage(file, 0.6, 800, 800);
            setNewImage(compressed);
        } catch (err) {
             console.error(err);
        }
    }
  };

  const handleSubmit = async () => {
    if (!newIssue || !newPropertyId) {
      alert("Please select a property and describe the issue.");
      return;
    }
    setIsSubmitting(true);
    
    // Standard Triage (Defaulting to Medium without AI)
    const priority = TicketPriority.MEDIUM;

    try {
      const property = store.properties.find(p => p.id === newPropertyId);
      if (!property) {
        throw new Error("Property context not found. Please refresh and try again.");
      }
      
      const freshTicket: MaintenanceTicket = {
        id: `t${Date.now()}`,
        propertyId: newPropertyId,
        tenantId: user.id,
        agentId: property.agentId,
        issue: newIssue,
        status: TicketStatus.OPEN,
        priority: priority,
        createdAt: new Date().toISOString(),
        imageUrl: newImage || undefined,
        aiAssessment: undefined
      };

      const newState = { 
          ...store, 
          tickets: [freshTicket, ...store.tickets],
          notifications: [{
            id: `n_t_${Date.now()}`,
            userId: freshTicket.agentId, 
            title: 'Maintenance Request Logged',
            message: `A new repair request has been filed for ${property?.name || freshTicket.propertyId}. Evidence attached.`,
            type: NotificationType.INFO,
            timestamp: new Date().toISOString(),
            isRead: false,
            linkTo: 'maintenance'
          }, ...store.notifications]
      };
      
      await saveStore(newState);
      setStore(newState);
      
      setNewIssue('');
      setNewImage(null);
      setIsSubmitting(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to log maintenance:", error);
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = (ticketId: string, newStatus: TicketStatus) => {
    const updatedTickets = store.tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t);
    const ticket = store.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const newState = { 
        ...store, 
        tickets: updatedTickets,
        notifications: [{
            id: `n_ts_${Date.now()}`,
            userId: ticket.tenantId,
            title: 'Maintenance Status Updated',
            message: `Your request #${ticket.id} is now ${newStatus.replace('_', ' ')}.`,
            type: NotificationType.INFO,
            timestamp: new Date().toISOString(),
            isRead: false,
            linkTo: 'maintenance'
        }, ...store.notifications]
    };
    saveStore(newState);
    setStore(newState);
    if (onUpdate) onUpdate();
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-24">
      <header className="flex flex-col items-center text-center gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-12 px-1">
        <div>
          <h1 className="text-5xl sm:text-7xl font-black text-black dark:text-white tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-3">Systems</h1>
          <p className="text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px]">Infrastructure Triage & Resolution Protocol</p>
        </div>
        {user.role === UserRole.TENANT && (
          <button 
            onClick={() => setIsSubmitting(true)} 
            className="w-full sm:w-auto bg-zinc-900 dark:bg-white text-white dark:text-black px-10 py-5 rounded-full font-black uppercase tracking-[0.4em] text-[10px] flex items-center justify-center shadow-2xl active:scale-95 transition-all"
          >
            Log Deficiency
          </button>
        )}
      </header>

      {isSubmitting && (
        <div className="bg-white dark:bg-zinc-950 p-12 md:p-16 rounded-[4rem] border border-zinc-200 dark:border-zinc-800 shadow-[0_48px_128px_-12px_rgba(0,0,0,0.2)] animate-in zoom-in-95">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="font-black text-4xl text-black dark:text-white uppercase tracking-tighter">Manifest Deficiency</h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-widest text-[9px] mt-2">Maintenance Logging Protocol</p>
            </div>
            <button onClick={() => setIsSubmitting(false)} className="text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white transition-colors p-2">
              <X size={32} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
             <div className="space-y-10">
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Unit ID</p>
                   <div className="relative">
                      <select 
                        className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900 border-none rounded-[2rem] px-8 py-6 text-xs font-black uppercase tracking-widest text-black dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5"
                        value={newPropertyId}
                        onChange={e => setNewPropertyId(e.target.value)}
                      >
                         <option value="">Select Asset...</option>
                         {myProperties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                         ))}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                   </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Descriptive Summary</p>
                  <textarea 
                    className="w-full p-10 bg-zinc-50 dark:bg-zinc-900 border-none rounded-[3rem] h-64 outline-none focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5 text-lg font-bold text-black dark:text-white resize-none" 
                    placeholder="Enter Deficiency Details..." 
                    value={newIssue} 
                    onChange={e => setNewIssue(e.target.value)} 
                  />
                </div>
             </div>
             
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Visual Evidence</p>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-full min-h-[350px] rounded-[3rem] bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  {newImage ? (
                    <img src={newImage} className="w-full h-full object-cover" alt="Evidence" />
                  ) : (
                    <div className="text-center group-hover:scale-110 transition-transform">
                      <Camera size={64} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-6" />
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-600">Initiate Imaging</p>
                    </div>
                  )}
                </div>
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 mt-16 pt-12 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              onClick={handleSubmit} 
              disabled={!newIssue} 
              className="flex-[2] bg-zinc-900 dark:bg-white text-white dark:text-black px-12 py-7 rounded-full font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
               Commit Log
            </button>
            <button onClick={() => setIsSubmitting(false)} className="flex-1 text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-[0.4em] text-[10px] px-8 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 transition-colors">Discard</button>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {tickets.map(ticket => {
          const property = store.properties.find(p => p.id === ticket.propertyId);
          return (
            <div key={ticket.id} className="group flex flex-col lg:flex-row gap-12 border-b border-zinc-100 dark:border-zinc-900 py-12 transition-all duration-700">
              {ticket.imageUrl && (
                <div 
                  className="w-full lg:w-64 h-64 bg-zinc-50 dark:bg-zinc-950 overflow-hidden shrink-0 relative cursor-pointer group/img"
                  onClick={() => setExpandedImage(ticket.imageUrl || null)}
                >
                   <img src={ticket.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110 grayscale group-hover/img:grayscale-0" alt="Ticket Evidence" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white" size={32} />
                   </div>
                </div>
              )}
              
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-[0.4em]">Ref: {ticket.id.slice(-8)}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                      ticket.priority === 'EMERGENCY' ? 'text-black dark:text-white' : 
                      ticket.priority === 'HIGH' ? 'text-zinc-600 dark:text-zinc-400' :
                      'text-zinc-500'
                    }`}>{ticket.priority}</span>
                  </div>
                  
                  <h4 className="text-4xl font-black text-black dark:text-white leading-tight tracking-tighter uppercase">{ticket.issue}</h4>
                  
                  <div className="flex items-center gap-6 mt-4">
                     <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-3">
                       <Building size={14} className="text-zinc-400 dark:text-zinc-600" /> {property?.name || 'Unit Unknown'}
                     </p>
                     <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-3">
                       <Clock size={14} className="text-zinc-400 dark:text-zinc-600" /> {new Date(ticket.createdAt).toLocaleDateString()}
                     </p>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-4">
                   <span className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full text-[9px] font-black uppercase tracking-[0.3em]">{ticket.status.replace('_', ' ')}</span>
                   {(user.role === UserRole.AGENT || user.role === UserRole.ADMIN) && (
                      <div className="relative">
                         <select 
                           className="appearance-none bg-none border-none text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-2 pr-6 py-2 text-[9px] font-black uppercase tracking-widest outline-none transition-colors cursor-pointer" 
                           value={ticket.status} 
                           onChange={e => handleUpdateStatus(ticket.id, e.target.value as TicketStatus)}
                         >
                           <option value={TicketStatus.OPEN}>Update Stage: OPEN</option>
                           <option value={TicketStatus.IN_PROGRESS}>Update Stage: ACTIVE</option>
                           <option value={TicketStatus.RESOLVED}>Update Stage: ARCHIVED</option>
                         </select>
                         <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-300 pointer-events-none" />
                      </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div className="text-center py-32 bg-white dark:bg-zinc-950 rounded-[4rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-1000">
            <div className="relative w-fit mx-auto mb-8">
              <div className="absolute inset-0 bg-black blur-[60px] opacity-10 animate-pulse"></div>
              <Wrench className="w-16 h-16 text-zinc-300 dark:text-zinc-700 relative z-10" />
            </div>
            <h3 className="text-2xl font-black text-black dark:text-white tracking-widest uppercase mb-3">Protocol Optimized</h3>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.4em] max-w-xs mx-auto leading-relaxed">
              Every system is currently performing within optimal parameters. No active deficiencies reported.
            </p>
          </div>
        )}
      </div>

      {expandedImage && (
        <div 
          className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-10 animate-in fade-in zoom-in-95 duration-500"
          onClick={() => setExpandedImage(null)}
        >
           <button className="absolute top-10 right-10 p-5 glass-card rounded-full text-white" onClick={() => setExpandedImage(null)}>
              <X size={32} />
           </button>
           <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]" alt="Full Evidence" />
        </div>
      )}
    </div>
  );
};

export default Maintenance;
