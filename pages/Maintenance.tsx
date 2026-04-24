
import React, { useState, useRef } from 'react';
import { User, UserRole, MaintenanceTicket, TicketStatus, TicketPriority, NotificationType } from '../types';
import { getStore, saveStore, useAppStore } from '../store';
import { Plus, CheckCircle2, Clock, AlertCircle, Wrench, X, ChevronDown, Camera, Image as ImageIcon, Sparkles, Loader2, Maximize2, Building } from 'lucide-react';

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
  const [newPropertyId, setNewPropertyId] = useState(user.assignedPropertyIds?.[0] || '');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!newIssue) return;
    setIsSubmitting(true);
    
    // Standard Triage (Defaulting to Medium without AI)
    const priority = TicketPriority.MEDIUM;

    setTimeout(() => {
      const freshTicket: MaintenanceTicket = {
        id: `t${Date.now()}`,
        propertyId: newPropertyId || 'p1',
        tenantId: user.id,
        issue: newIssue,
        status: TicketStatus.OPEN,
        priority: priority,
        createdAt: new Date().toISOString(),
        imageUrl: newImage || undefined,
        aiAssessment: undefined
      };

      const property = store.properties.find(p => p.id === freshTicket.propertyId);
      const newState = { 
          ...store, 
          tickets: [freshTicket, ...store.tickets],
          notifications: [{
            id: `n_t_${Date.now()}`,
            userId: property?.agentId || 'u1', 
            title: 'Maintenance Request Logged',
            message: `A new repair request has been filed for ${property?.name || freshTicket.propertyId}. Evidence attached.`,
            type: NotificationType.INFO,
            timestamp: new Date().toISOString(),
            isRead: false,
            linkTo: 'maintenance'
          }, ...store.notifications]
      };
      saveStore(newState);
      setStore(newState);
      setNewIssue('');
      setNewImage(null);
      setIsSubmitting(false);
      if (onUpdate) onUpdate();
    }, 1000);
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
            isRead: false
        }, ...store.notifications]
    };
    saveStore(newState);
    setStore(newState);
    if (onUpdate) onUpdate();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Maintenance Requests</h1>
          <p className="text-zinc-400 font-medium">Infrastructure repair tracking and resolution portal.</p>
        </div>
        {user.role === UserRole.TENANT && (
          <button 
            onClick={() => setIsSubmitting(true)} 
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center shadow-lg shadow-blue-600/20 active:scale-95 transition-all group"
          >
            <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform" /> Log Repair
          </button>
        )}
      </header>

      {isSubmitting && (
        <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[3.5rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-2xl text-zinc-900 dark:text-white">New Maintenance Log</h3>
            <button onClick={() => setIsSubmitting(false)} className="text-zinc-400 hover:text-rose-500 p-2">
              <X size={24} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div className="space-y-6">
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Property</p>
                   <div className="relative">
                      <select 
                        className="w-full appearance-none bg-offwhite dark:bg-black border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl px-6 py-4 pr-10 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-600/10"
                        value={newPropertyId}
                        onChange={e => setNewPropertyId(e.target.value)}
                      >
                         {user.assignedPropertyIds?.map(pid => {
                            const p = store.properties.find(prop => prop.id === pid);
                            return <option key={pid} value={pid}>{p?.name || pid}</option>;
                         })}
                         {(!user.assignedPropertyIds || user.assignedPropertyIds.length === 0) && (
                            <option value="p1">Default Property</option>
                         )}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                   </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Describe the fault</p>
                <textarea 
                  className="w-full p-8 bg-offwhite dark:bg-black border-2 border-zinc-50 dark:border-zinc-800 rounded-[2.5rem] h-44 outline-none focus:ring-4 focus:ring-blue-600/10 text-lg font-bold text-zinc-900 dark:text-white resize-none" 
                  placeholder="What needs fixing?" 
                  value={newIssue} 
                  onChange={e => setNewIssue(e.target.value)} 
                />
             </div>
             
             <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Evidence / Picture</p>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-64 rounded-[2.5rem] bg-offwhite dark:bg-black border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-blue-600/40 transition-all"
                >
                  {newImage ? (
                    <img src={newImage} className="w-full h-full object-cover" alt="Evidence" />
                  ) : (
                    <div className="text-center group-hover:scale-110 transition-transform">
                      <Camera size={48} className="text-zinc-200 dark:text-zinc-700 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase text-zinc-400">Click to Snap or Upload</p>
                    </div>
                  )}
                </div>
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              onClick={handleSubmit} 
              disabled={!newIssue} 
              className="flex-[2] bg-blue-600 text-white px-8 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
               <Wrench size={20} className="hover:rotate-45" />
               Submit Maintenance Log
            </button>
            <button onClick={() => setIsSubmitting(false)} className="flex-1 text-zinc-400 font-black uppercase tracking-widest text-xs px-4 bg-offwhite dark:bg-zinc-800 rounded-[2rem] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">Discard</button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {tickets.map(ticket => {
          const property = store.properties.find(p => p.id === ticket.propertyId);
          return (
            <div key={ticket.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[3.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row gap-8 group hover:border-blue-200 transition-all duration-500">
              {ticket.imageUrl && (
                <div 
                  className="w-full lg:w-48 h-48 rounded-[2.5rem] overflow-hidden shrink-0 relative cursor-pointer group/img"
                  onClick={() => setExpandedImage(ticket.imageUrl || null)}
                >
                   <img src={ticket.imageUrl} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt="Ticket Evidence" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white" size={24} />
                   </div>
                </div>
              )}
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">#{ticket.id.slice(-6)}</span>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm border ${
                    ticket.priority === 'EMERGENCY' ? 'bg-rose-500 text-white border-rose-400' : 
                    ticket.priority === 'HIGH' ? 'bg-amber-500 text-white border-amber-400' :
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                  }`}>{ticket.priority}</span>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${
                    ticket.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-600 text-white border-blue-400'
                  }`}>{ticket.status.replace('_', ' ')}</span>
                </div>
                
                <div>
                   <h4 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight tracking-tight">{ticket.issue}</h4>
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                     <Building size={12} className="text-blue-600" /> {property?.name || 'Unknown Unit'} • {new Date(ticket.createdAt).toLocaleDateString()}
                   </p>
                </div>
              </div>

              {(user.role === UserRole.AGENT || user.role === UserRole.ADMIN) && (
                 <div className="lg:w-48 self-center">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1 text-center lg:text-left">Status Update</p>
                    <div className="relative">
                       <select 
                         className="w-full appearance-none bg-offwhite dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl px-6 py-4 pr-10 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-600 shadow-sm" 
                         value={ticket.status} 
                         onChange={e => handleUpdateStatus(ticket.id, e.target.value as TicketStatus)}
                       >
                         <option value={TicketStatus.OPEN}>OPEN</option>
                         <option value={TicketStatus.IN_PROGRESS}>IN PROGRESS</option>
                         <option value={TicketStatus.RESOLVED}>RESOLVED</option>
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                 </div>
              )}
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div className="text-center py-24 bg-white dark:bg-zinc-950 rounded-[4rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800">
            <Wrench className="w-12 h-12 text-zinc-100 dark:text-zinc-800 mx-auto mb-6" />
            <p className="text-zinc-300 font-black uppercase tracking-widest text-[10px]">Registry Empty</p>
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
