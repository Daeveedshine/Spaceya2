
import React, { useState, useMemo } from 'react';
import { User, UserRole, TenantApplication, ApplicationStatus, NotificationType, PropertyStatus, Agreement } from '../types';
import { getStore, saveStore, useAppStore } from '../store';
import { OptimizedImage } from '../components/OptimizedImage';
import { toast } from 'sonner';
import { 
  ClipboardCheck, CheckCircle, XCircle, 
  Search, ChevronRight, ShieldCheck, Mail, Phone, Calendar, Download,
  User as UserIcon, MapPin, Briefcase, Info, Users, Home, Printer, FileText,
  BadgeCheck, Building, Maximize2, X, RefreshCw, Check, AlertCircle, Loader2, List
} from 'lucide-react';

interface ScreeningsProps {
  user: User;
  onNavigate: (view: string) => void;
  onUpdate?: () => void;
}

const Screenings: React.FC<ScreeningsProps> = ({ user, onNavigate, onUpdate }) => {
  const [store, setStore] = useAppStore();
  const [selectedApp, setSelectedApp] = useState<TenantApplication | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routedPropertyId, setRoutedPropertyId] = useState<string | null>(null);

  const relevantApps = useMemo(() => {
    if (user.role === UserRole.ADMIN) return store.applications;
    return store.applications.filter(app => app.agentId === user.id);
  }, [store.applications, user.id, user.role]);

  const availableProperties = useMemo(() => {
    return store.properties.filter(p => 
      p.agentId === user.id && 
      (p.status === PropertyStatus.LISTED || p.status === PropertyStatus.VACANT)
    );
  }, [store.properties, user.id]);

  const handleUpdateStatus = async (id: string, status: ApplicationStatus) => {
    const updatedApps = store.applications.map(app => app.id === id ? { ...app, status } : app);
    const app = store.applications.find(a => a.id === id);
    if (!app) return;

    const notification = {
      id: `n_app_${Date.now()}`,
      userId: app.userId,
      title: `Enrollment Update`,
      message: `Your dossier has been marked as ${status.toLowerCase()}.`,
      type: status === ApplicationStatus.APPROVED ? NotificationType.SUCCESS : NotificationType.INFO,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebaseConfig');
      await setDoc(doc(db, 'notifications', notification.id), notification);
    } catch (e) {}

    const newState = { ...store, applications: updatedApps, notifications: [notification, ...store.notifications] };
    saveStore(newState);
    setStore(newState);
    setSelectedApp(updatedApps.find(a => a.id === id) || null);
    if (onUpdate) onUpdate();
  };

  const handleRouteProperty = (propertyId: string) => {
    if (!selectedApp) return;
    setIsRouting(true);

    setTimeout(async () => {
      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 1);
      nextYear.setDate(today.getDate() - 1);

      const startDate = today.toISOString().split('T')[0];
      const endDate = nextYear.toISOString().split('T')[0];

      // 1. Update Property Status & Tenant Link
      const updatedProperties = store.properties.map(p => 
        p.id === propertyId ? { 
          ...p, 
          tenantId: selectedApp.userId, 
          status: PropertyStatus.OCCUPIED,
          rentStartDate: startDate,
          rentExpiryDate: endDate
        } : p
      );

      // 2. Update User Profile with Assigned Property
      const updatedUsers = store.users.map(u => 
        u.id === selectedApp.userId ? { ...u, assignedPropertyIds: [...(u.assignedPropertyIds || []), propertyId] } : u
      );

      // 3. Link this Application record to the routed Property
      const updatedApplications = store.applications.map(app => 
        app.id === selectedApp.id ? { ...app, propertyId: propertyId } : app
      );

      // 4. Create Legal Agreement Entry
      const newAgreement: Agreement = {
        id: `a${Date.now()}`,
        propertyId: propertyId,
        tenantId: selectedApp.userId,
        agentId: user.id, // The current agent performing the routing
        version: 1,
        startDate,
        endDate,
        status: 'active'
      };

      // 5. Dispatch Activation Notification
      const propertyName = store.properties.find(p => p.id === propertyId)?.name;
      const notification = {
        id: `n_route_${Date.now()}`,
        userId: selectedApp.userId,
        title: 'Tenancy Activated',
        message: `Congratulations! Your lifecycle for ${propertyName} has been officially routed and activated.`,
        type: NotificationType.SUCCESS,
        timestamp: new Date().toISOString(),
        isRead: false,
        linkTo: 'dashboard'
      };

      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebaseConfig');
        await setDoc(doc(db, 'notifications', notification.id), notification);
      } catch (e) {}

      const updatedStore = { 
        ...store, 
        properties: updatedProperties, 
        users: updatedUsers,
        applications: updatedApplications,
        agreements: [...store.agreements, newAgreement],
        notifications: [notification, ...store.notifications]
      };

      saveStore(updatedStore);
      setStore(updatedStore);
      setSelectedApp(updatedApplications.find(a => a.id === selectedApp.id) || null);
      setIsRouting(false);
      setRoutedPropertyId(null);
      if (onUpdate) onUpdate();
    }, 1200);
  };

  const handleDownloadPDF = () => {
    toast.info('Preparing print-friendly dossier... Select "Save as PDF" to download.', {
      duration: 3500
    });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredApps = relevantApps.filter(app => 
    `${app.firstName} ${app.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED: return 'bg-black text-white border-black font-black';
      case ApplicationStatus.REJECTED: return 'bg-zinc-100 text-zinc-400 border-zinc-200';
      case ApplicationStatus.PENDING: return 'bg-white text-black border-black font-bold';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tenant Screening Portal</h1>
          <p className="text-zinc-500 text-sm font-medium">Verify tenant dossiers. ({filteredApps.length} loaded)</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input type="text" placeholder="Search by name..." className="w-full sm:w-64 pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm outline-none text-white font-bold shadow-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left List - Hidden on print */}
        <div className="lg:col-span-1 space-y-4 max-h-[600px] lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar print:hidden">
          {filteredApps.map(app => (
            <button 
                key={app.id} 
                onClick={() => setSelectedApp(app)} 
                className={`w-full text-left p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 ${selectedApp?.id === app.id ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-2xl' : 'bg-zinc-900 text-white border-zinc-800 shadow-sm'}`}
            >
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center font-black shrink-0 border border-zinc-700 shadow-xl">
                {app.passportPhotoUrl ? (
                  <OptimizedImage src={app.passportPhotoUrl} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <UserIcon size={24} className="text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-xl truncate">{app.firstName} {app.surname}</h4>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedApp?.id === app.id ? 'text-zinc-400' : 'text-zinc-500'}`}>{app.status}</p>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
          {filteredApps.length === 0 && (
            <div className="text-center py-24 bg-zinc-950 rounded-[3rem] border-2 border-dashed border-zinc-900 animate-in fade-in duration-1000">
              <div className="relative w-fit mx-auto mb-6">
                <div className="absolute inset-0 bg-black dark:bg-white blur-[50px] opacity-10 animate-pulse"></div>
                <Search size={40} className="text-zinc-800 relative z-10" />
              </div>
              <p className="text-zinc-700 font-black uppercase tracking-[0.3em] text-[10px]">No matches found</p>
            </div>
          )}
        </div>

        {/* Right Detail View */}
        <div className="lg:col-span-2">
          {selectedApp ? (
            <div id="printable-dossier" className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-zinc-200 animate-in slide-in-from-right-8 duration-700 print:shadow-none print:rounded-none print:border-none print:m-0 print:p-0 print:overflow-visible print:w-full">
               
               {/* Action Bar for Agents - Hidden on print */}
               <div className="px-8 py-5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-4 print:hidden">
                 <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                   <FileText size={16} className="text-black dark:text-white" /> 
                   <span>Application Dossier • <span className="font-mono text-black dark:text-white">{selectedApp.id}</span></span>
                 </div>
                 <div className="flex items-center gap-3">
                   <button 
                     onClick={handleDownloadPDF}
                     className="flex items-center gap-2 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 group"
                     title="Download clean print-friendly PDF of this application submission"
                   >
                     <Download size={16} className="group-hover:translate-y-0.5 transition-transform" /> Download PDF
                   </button>
                   <button 
                     onClick={handlePrint}
                     className="flex items-center gap-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                     title="Print Dossier"
                   >
                     <Printer size={16} /> Print
                   </button>
                 </div>
               </div>

               {/* Print Header - Only visible on print */}
               <div className="hidden print:flex items-center justify-between pb-6 mb-6 border-b-2 border-black bg-white text-black">
                  <div className="flex items-center gap-4">
                    <div className="bg-black text-white p-3 rounded-xl font-black text-xl flex items-center justify-center">
                      <Building size={22} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-black">SPACEYA REAL ESTATE</h1>
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">Official Tenancy Application Dossier</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Dossier Reference</p>
                    <p className="font-mono text-sm font-bold text-black">{selectedApp.id}</p>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Printed: {new Date().toLocaleDateString()}</p>
                  </div>
               </div>

               <div className="bg-zinc-900 p-8 sm:p-12 text-white flex flex-col md:flex-row justify-between items-center gap-8 border-b-8 border-black print:bg-white print:text-black print:border-2 print:border-zinc-300 print:rounded-2xl print:p-6 print:mb-6">
                  <div className="flex items-center gap-6 sm:gap-8 w-full">
                    <div 
                      onClick={() => selectedApp.passportPhotoUrl && setExpandedImage(selectedApp.passportPhotoUrl)}
                      className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl print:border-zinc-300 print:shadow-none cursor-pointer group relative shrink-0"
                    >
                      {selectedApp.passportPhotoUrl ? (
                        <OptimizedImage src={selectedApp.passportPhotoUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Profile" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 print:text-zinc-600 text-3xl font-black">
                          {selectedApp.firstName.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center print:hidden">
                        <Maximize2 size={16} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-2xl sm:text-4xl font-black tracking-tighter print:text-black break-words leading-tight">{selectedApp.firstName} {selectedApp.surname}</h2>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border print:border-zinc-400 print:text-black ${getStatusStyle(selectedApp.status)}`}>{selectedApp.status}</span>
                        <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold uppercase tracking-widest">Application Date: {selectedApp.applicationDate}</span>
                      </div>
                      <div className="mt-3 text-xs text-zinc-400 print:text-zinc-700 flex flex-wrap gap-x-6 gap-y-1">
                        <span><strong>Phone:</strong> {selectedApp.phoneNumber || 'N/A'}</span>
                        <span><strong>Target Property:</strong> {store.properties.find(p => p.id === selectedApp.propertyId)?.name || 'Pending Allocation'}</span>
                        <span><strong>Managing Agent:</strong> {store.users.find(u => u.id === selectedApp.agentId)?.name || 'Unknown Agent'}</span>
                      </div>
                    </div>
                  </div>
               </div>
               
               <div className="p-10 md:p-14 space-y-16 text-black print:p-12 print:pt-4">
                  {/* ROUTING HUB: Integrated Property Assignment */}
                  {selectedApp.status === ApplicationStatus.APPROVED && !store.users.find(u => u.id === selectedApp.userId)?.assignedPropertyIds?.includes(selectedApp.propertyId) && (
                    <section className="p-8 bg-zinc-50 border-2 border-zinc-200 rounded-[3rem] space-y-8 animate-in zoom-in-95 duration-500 print:hidden">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-lg">
                                <RefreshCw size={24} />
                             </div>
                             <div>
                                <h4 className="text-xl font-black text-zinc-900 tracking-tight">Lifecycle Asset Routing</h4>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Route an available property to this candidate</p>
                             </div>
                          </div>
                          {selectedApp.propertyId !== 'PENDING' && (
                             <div className="px-4 py-1.5 bg-zinc-100 text-black rounded-full text-[9px] font-black uppercase border border-black">
                                Target: {store.properties.find(p => p.id === selectedApp.propertyId)?.name}
                             </div>
                          )}
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {availableProperties.map(prop => (
                             <button 
                                key={prop.id}
                                onClick={() => setRoutedPropertyId(prop.id)}
                                className={`p-6 rounded-3xl border-2 transition-all text-left flex items-start gap-4 hover:border-black ${routedPropertyId === prop.id ? 'border-black bg-zinc-50 shadow-xl' : 'bg-white border-zinc-100 shadow-sm'}`}
                             >
                                <div className={`p-3 rounded-2xl ${routedPropertyId === prop.id ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-400'}`}>
                                   <Building size={20} />
                                </div>
                                <div className="min-w-0">
                                   <p className="font-black text-zinc-900 tracking-tight truncate">{prop.name}</p>
                                   <p className="text-[10px] font-bold text-zinc-500 truncate">{prop.location}</p>
                                   <p className="text-xs font-black text-black mt-1">₦{prop.rent.toLocaleString()}/yr</p>
                                </div>
                                {routedPropertyId === prop.id && <Check size={20} className="text-black ml-auto shrink-0" />}
                             </button>
                          ))}
                          {availableProperties.length === 0 && (
                             <div className="col-span-full py-12 text-center text-zinc-400 opacity-60">
                                <AlertCircle size={32} className="mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No available assets found in your registry</p>
                             </div>
                          )}
                       </div>

                       {routedPropertyId && (
                          <div className="pt-4 animate-in slide-in-from-bottom-4">
                             <button 
                               onClick={() => handleRouteProperty(routedPropertyId)}
                               disabled={isRouting}
                               className="w-full bg-black text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-black/20 flex items-center justify-center gap-3 hover:opacity-80 transition-all active:scale-95"
                             >
                                {isRouting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                {isRouting ? 'routing lifecycle...' : 'Confirm Routing & Activate Tenancy'}
                             </button>
                          </div>
                       )}
                    </section>
                  )}

                  {/* Section 1: Identity */}
                  <section className="space-y-6 break-inside-avoid">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] border-b-2 border-zinc-100 pb-3 flex items-center gap-3 print:text-black print:border-black">
                       <UserIcon size={16} className="text-black print:hidden" /> 01: Profile & Personal Credentials
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8">
                      <DetailRow label="Surname" value={selectedApp.surname} />
                      <DetailRow label="First Name" value={selectedApp.firstName} />
                      <DetailRow label="Other Names" value={selectedApp.middleName} />
                      <DetailRow label="Date of Birth" value={selectedApp.dob} />
                      <DetailRow label="Biological Gender" value={selectedApp.gender} />
                      <DetailRow label="Marital Status" value={selectedApp.maritalStatus} />
                      <DetailRow label="Current Occupation" value={selectedApp.occupation} />
                      <DetailRow label="Contact Phone" value={selectedApp.phoneNumber} />
                      <DetailRow label="Household Size" value={selectedApp.familySize} />
                    </div>
                  </section>

                  {/* Section 2: Residential History */}
                  <section className="space-y-6 break-inside-avoid">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] border-b-2 border-zinc-100 pb-3 flex items-center gap-3 print:text-black print:border-black">
                       <MapPin size={16} className="text-black print:hidden" /> 02: Residential History & Background
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                       <DetailRow label="Current Residential Address" value={selectedApp.currentHomeAddress} />
                       <DetailRow label="Primary Reason for Relocation" value={selectedApp.reasonForRelocating} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 p-6 bg-zinc-50 rounded-2xl border border-zinc-100 print:bg-white print:border-zinc-200">
                       <DetailRow label="Current Landlord Name" value={selectedApp.currentLandlordName} />
                       <DetailRow label="Landlord Mobile Number" value={selectedApp.currentLandlordPhone} />
                    </div>
                  </section>

                  {/* Section 3: Verification Evidence */}
                  <section className="space-y-6 break-inside-avoid">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] border-b-2 border-zinc-100 pb-3 flex items-center gap-3 print:text-black print:border-black">
                       <ShieldCheck size={16} className="text-black print:hidden" /> 03: Identity Verification & Authentication
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <DetailRow label="Document Category" value={selectedApp.verificationType} />
                            <DetailRow label="Document Reference" value={selectedApp.verificationIdNumber} />
                          </div>
                          <div 
                            onClick={() => selectedApp.verificationUrl && setExpandedImage(selectedApp.verificationUrl)}
                            className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 shadow-sm print:shadow-none print:bg-white print:border-zinc-300 cursor-pointer group relative break-inside-avoid"
                          >
                             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Official Document Capture</p>
                             {selectedApp.verificationUrl ? (
                               <OptimizedImage src={selectedApp.verificationUrl} className="w-full h-auto rounded-xl max-h-56 object-contain shadow-sm print:shadow-none print:border print:border-zinc-200" alt="ID Document" />
                             ) : (
                               <div className="py-12 text-center text-zinc-400 italic text-xs">No scan data attached.</div>
                             )}
                             {selectedApp.verificationUrl && (
                               <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center print:hidden rounded-2xl">
                                 <Maximize2 size={24} className="text-zinc-600" />
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="p-8 bg-zinc-950 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl print:bg-white print:border-2 print:border-zinc-300 print:rounded-2xl print:p-6 break-inside-avoid">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 print:text-zinc-600">Digital Legal Signature</p>
                          <p className="text-4xl sm:text-5xl font-serif italic text-white border-b-2 border-zinc-800 pb-4 px-8 print:text-black print:border-zinc-300 break-words max-w-full">
                            {selectedApp.signature || `${selectedApp.firstName} ${selectedApp.surname}`}
                          </p>
                          <div className="mt-6 flex items-center gap-3 text-zinc-400 print:text-zinc-700">
                             <ShieldCheck size={20} className="text-zinc-300 print:text-black" />
                             <span className="text-[9px] font-black uppercase tracking-[0.3em]">Official Timestamp Verified • {selectedApp.applicationDate || 'Current'}</span>
                          </div>
                       </div>
                    </div>
                  </section>

                  {/* Section 4: Additional / Custom Responses */}
                  {selectedApp.customResponses && Object.keys(selectedApp.customResponses).length > 0 && (
                    <section className="space-y-6 break-inside-avoid">
                       <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] border-b-2 border-zinc-100 pb-3 flex items-center gap-3 print:text-black print:border-black">
                          <List size={16} className="text-black print:hidden" /> 04: Additional Information & Custom Fields
                       </h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {Object.entries(selectedApp.customResponses).map(([key, value]) => {
                             if (key === 'agentIdCode' || key === 'signature' || value === undefined || value === null || typeof value === 'object') return null;
                             if (['firstName', 'surname', 'middleName', 'dob', 'maritalStatus', 'gender', 'currentHomeAddress', 'occupation', 'familySize', 'phoneNumber', 'reasonForRelocating', 'currentLandlordName', 'currentLandlordPhone', 'verificationType', 'verificationIdNumber', 'verificationUrl', 'passportPhotoUrl'].includes(key)) return null;
                             
                             return <DetailRow key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={String(value)} />;
                          })}
                       </div>
                    </section>
                  )}

                  {/* Action Buttons - Hidden on print */}
                  <div className="pt-8 border-t border-zinc-100 flex flex-col sm:flex-row gap-4 print:hidden">
                     {selectedApp.status !== ApplicationStatus.APPROVED && (
                        <button onClick={() => handleUpdateStatus(selectedApp.id, ApplicationStatus.APPROVED)} className="flex-[2] bg-black hover:opacity-80 text-white py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95">
                           <CheckCircle size={18} /> Finalize Approval
                        </button>
                     )}
                     <button onClick={() => handleUpdateStatus(selectedApp.id, ApplicationStatus.REJECTED)} className="flex-1 bg-zinc-50 border-2 border-zinc-200 text-zinc-400 py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all hover:bg-black hover:text-white active:scale-95">
                        <XCircle size={18} /> Decline Candidate
                     </button>
                  </div>
                  
                  {/* Print Footer - Only visible on print */}
                  <div className="hidden print:block pt-8 border-t-2 border-zinc-200 text-center text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                    This dossier is an official legal record produced by SPACEYA Real Estate Management Suite.
                    <br />© {new Date().getFullYear()} SPACEYA Global Operations. All rights reserved.
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-250px)] flex flex-col items-center justify-center bg-zinc-950 rounded-[4rem] border-2 border-dashed border-zinc-900 print:hidden animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-black dark:bg-white blur-[80px] opacity-10 animate-pulse"></div>
                  <ClipboardCheck size={64} className="text-zinc-900 relative z-10" />
                </div>
                <h3 className="text-2xl font-black text-zinc-800 tracking-widest uppercase mb-2">Review Desk</h3>
                <p className="text-zinc-700 font-bold uppercase tracking-[0.4em] text-[10px] max-w-xs text-center opacity-60">
                  Select a candidate dossier from the registry to initiate the verification protocol.
                </p>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX / IMAGE EXPANDER */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in-95 duration-300 print:hidden"
          onClick={() => setExpandedImage(null)}
        >
           <button 
              className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              onClick={(e) => { e.stopPropagation(); setExpandedImage(null); }}
           >
              <X size={32} />
           </button>
           <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <OptimizedImage 
                src={expandedImage} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.2)]" 
                alt="Expanded View"
              />
           </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 12mm 12mm 12mm 12mm; 
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide all non-dossier UI */
          aside, nav, header, footer, .print\\:hidden, button, .custom-scrollbar {
            display: none !important;
          }
          
          /* Main container reset - STATIC to support multi-page printing */
          #root, main, .app-container, .max-w-7xl, .min-h-full {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          
          /* Dossier targeting */
          #printable-dossier {
            display: block !important;
            width: 100% !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            position: static !important;
          }
          
          /* Hide list column, show detail column at full width */
          .grid {
            display: block !important;
          }
          .lg\\:col-span-1 {
            display: none !important;
          }
          .lg\\:col-span-2 {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Content Flow & grids inside dossier */
          #printable-dossier .grid {
            display: grid !important;
          }

          .space-y-16, .space-y-12, .space-y-10, .space-y-8, .space-y-6 {
            height: auto !important;
            display: block !important;
          }

          /* Ensure images and borders are retained */
          img {
            max-width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Page break handling */
          section, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 24px !important;
          }
          
          h1, h2, h3, h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div className="min-w-0 mb-4 print:mb-3 break-inside-avoid">
    <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] leading-tight mb-1 truncate print:text-zinc-600">{label}</p>
    <p className="text-sm sm:text-base font-bold text-black leading-snug break-words print:text-sm">
      {value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : 'N/A'}
    </p>
  </div>
);

export default Screenings;
