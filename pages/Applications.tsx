
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, TenantApplication, ApplicationStatus, NotificationType, UserRole, FormTemplate, FormSection, FormField, FieldType } from '../types';
import { getStore, saveStore, useAppStore } from '../store';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  CheckCircle, ArrowRight, ArrowLeft, Building, ShieldCheck, 
  Loader2, MapPin, UserCheck, Search, Camera, Fingerprint, 
  Briefcase, Users, Phone, PenTool, Calendar, History, FileText, Eye,
  UserPlus, Download, Trash2, Edit3, Image as ImageIcon, AlertCircle, ChevronDown, User as UserIcon, Printer, X, Maximize2, Check,
  Info, Settings, Plus, GripVertical, Save
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-6 break-inside-avoid">
     <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] border-b border-zinc-100 dark:border-zinc-800 pb-2">{title}</h3>
     {children}
  </div>
);

const PrintRow: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div className="mb-4">
    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 truncate">{label}</p>
    <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight break-words">{value || 'N/A'}</p>
  </div>
);

const DEFAULT_TEMPLATE: FormTemplate = {
  agentId: 'default',
  lastUpdated: new Date().toISOString(),
  sections: [
    {
      id: 's1',
      title: 'Identity Credentials',
      icon: 'User',
      fields: [
        { id: 'f1', key: 'surname', label: 'Surname', type: 'text', required: true },
        { id: 'f2', key: 'firstName', label: 'First Name', type: 'text', required: true },
        { id: 'f3', key: 'middleName', label: 'Other Names', type: 'text', required: false },
        { id: 'f4', key: 'dob', label: 'Date of Birth', type: 'date', required: true },
        { id: 'f5', key: 'gender', label: 'Biological Gender', type: 'select', options: ['Male', 'Female'], required: true },
        { id: 'f6', key: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widow', 'Widower', 'Separated'], required: true }
      ]
    },
    {
      id: 's2',
      title: 'Professional & Contact',
      icon: 'Briefcase',
      fields: [
        { id: 'f7', key: 'occupation', label: 'Current Occupation', type: 'text', required: true },
        { id: 'f8', key: 'familySize', label: 'Family Size', type: 'number', required: true },
        { id: 'f9', key: 'phoneNumber', label: 'Phone Number', type: 'tel', required: true }
      ]
    },
    {
      id: 's3',
      title: 'Residential History',
      icon: 'MapPin',
      fields: [
        { id: 'f10', key: 'currentHomeAddress', label: 'Current House Address', type: 'textarea', required: true },
        { id: 'f11', key: 'reasonForRelocating', label: 'Reason for Relocation', type: 'textarea', required: true },
        { id: 'f12', key: 'currentLandlordName', label: 'Name of Current Landlord', type: 'text', required: true },
        { id: 'f13', key: 'currentLandlordPhone', label: 'Landlord Phone Number', type: 'tel', required: true }
      ]
    },
    {
      id: 's4',
      title: 'Identity Verification',
      icon: 'ShieldCheck',
      fields: [
        { id: 'f14', key: 'verificationType', label: 'Select ID Type', type: 'select', options: ['NIN', "Voter's Card", 'Passport', 'Drivers License'], required: true },
        { id: 'f15', key: 'verificationIdNumber', label: 'ID Number', type: 'text', required: true },
        { id: 'f16', key: 'verificationUrl', label: 'Photo of Valid ID', type: 'file', required: true },
        { id: 'f17', key: 'passportPhotoUrl', label: 'Passport Photo', type: 'file', required: true }
      ]
    },
    {
      id: 's5',
      title: 'Final Authorization',
      icon: 'PenTool',
      fields: [
        { id: 'f18', key: 'signature', label: 'Digital Signature (Full Legal Name)', type: 'text', required: true },
        { id: 'f19', key: 'applicationDate', label: 'Application Date', type: 'date', required: true }
      ]
    }
  ]
};

interface ApplicationsProps {
  user: User;
  onNavigate: (view: string) => void;
  onUpdate?: () => void;
}

const Applications: React.FC<ApplicationsProps> = ({ user, onNavigate, onUpdate }) => {
  const [store, setStore] = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Views: 'gate' | 'form' | 'history'
  const [viewMode, setViewMode] = useState<'gate' | 'form' | 'history'>('gate');
  
  // Tenant State
  const [targetAgentId, setTargetAgentId] = useState(localStorage.getItem('referral_agent_id') || '');
  const [targetAgent, setTargetAgent] = useState<User | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  const [viewingApp, setViewingApp] = useState<TenantApplication | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check for referral on mount
  useEffect(() => {
    if (targetAgentId) {
      validateAgent(targetAgentId);
    }
  }, []);

  const validateAgent = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setIsSearchingAgent(true);
    
    try {
      let agent: User | null = null;

      // 1. Try Direct UID Match (Case Sensitive)
      const agentDoc = await getDoc(doc(db, 'users', cleanId));
      if (agentDoc.exists() && agentDoc.data().role === UserRole.AGENT) {
        agent = agentDoc.data() as User;
      }

      // 2. Try Email Match (If ID looks like an email)
      if (!agent && cleanId.includes('@')) {
        const q = query(collection(db, 'users'), where('email', '==', cleanId.toLowerCase()), where('role', '==', UserRole.AGENT));
        const snap = await getDocs(q);
        if (!snap.empty) {
          agent = snap.docs[0].data() as User;
        }
      }

      // 3. Try Name Match (Last Resort)
      if (!agent) {
        const q = query(collection(db, 'users'), where('name', '==', cleanId), where('role', '==', UserRole.AGENT));
        const snap = await getDocs(q);
        if (!snap.empty) {
          agent = snap.docs[0].data() as User;
        }
      }

      if (agent) {
        setTargetAgent(agent);
        setTargetAgentId(agent.id); // Normalize state to the real ID
        
        const templateDoc = await getDoc(doc(db, 'formTemplates', agent.id));
        const template = templateDoc.exists() ? (templateDoc.data() as FormTemplate) : DEFAULT_TEMPLATE;
        
        setActiveTemplate(template);
        setViewMode('form');
        setFormData(prev => ({ ...prev, agentIdCode: agent?.id }));
      } else {
        setTargetAgent(null);
        alert('Agent not found. Please check the Agent ID, Name, or Email.');
      }
    } catch (error) {
      console.error('Error validating agent:', error);
      setTargetAgent(null);
      alert('Error finding Agent. Wait a moment and try again.');
    } finally {
      setIsSearchingAgent(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleInputChange(key, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- TENANT SUBMISSION LOGIC ---

  const handleSubmitApplication = () => {
    setIsSubmitting(true);
    
    // Default values (AI disabled)
    const score = 0;
    const recommendation = "";

    setTimeout(() => {
      // Map form data to standard fields where possible, put rest in customResponses
      const appRecord: TenantApplication = {
        id: `app${Date.now()}`,
        userId: user.id,
        propertyId: 'PENDING',
        agentId: targetAgent?.id || 'u1',
        status: ApplicationStatus.PENDING,
        submissionDate: new Date().toISOString(),
        
        // Standard Mapping (fallback to formData if keys match)
        firstName: formData.firstName || '',
        surname: formData.surname || '',
        middleName: formData.middleName || '',
        dob: formData.dob || '',
        maritalStatus: formData.maritalStatus || 'Single',
        gender: formData.gender || 'Male',
        currentHomeAddress: formData.currentHomeAddress || '',
        occupation: formData.occupation || '',
        familySize: Number(formData.familySize) || 1,
        phoneNumber: formData.phoneNumber || '',
        reasonForRelocating: formData.reasonForRelocating || '',
        currentLandlordName: formData.currentLandlordName || '',
        currentLandlordPhone: formData.currentLandlordPhone || '',
        verificationType: formData.verificationType || '',
        verificationIdNumber: formData.verificationIdNumber || '',
        verificationUrl: formData.verificationUrl,
        passportPhotoUrl: formData.passportPhotoUrl,
        agentIdCode: targetAgent?.id || '',
        signature: formData.signature || '',
        applicationDate: formData.applicationDate || new Date().toISOString().split('T')[0],
        
        riskScore: score,
        aiRecommendation: recommendation,
        customResponses: formData
      };

      const newState = {
        ...store,
        applications: [...store.applications, appRecord],
        notifications: [{
          id: `n_app_${Date.now()}`,
          userId: appRecord.agentId,
          title: 'New Tenancy Application',
          message: `A new candidate has submitted a dossier via your custom form.`,
          type: NotificationType.INFO,
          timestamp: new Date().toISOString(),
          isRead: false,
          linkTo: 'screenings'
        }, ...store.notifications]
      };

      saveStore(newState);
      setStore(newState); // Local update
      setIsSubmitting(false);
      setViewMode('history');
      setFormData({});
      setCurrentStepIndex(0);
      if (onUpdate) onUpdate();
    }, 1500);
  };

  const myApplications = useMemo(() => {
    return store.applications
      .filter(app => app.userId === user.id)
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [store.applications, user.id]);

  const handleDownloadPDF = async (app: TenantApplication) => {
    // If not currently viewing, view it first to render the DOM
    if (!viewingApp || viewingApp.id !== app.id) {
        setViewingApp(app);
        // Wait for render
        setTimeout(() => generatePDF(app), 500);
        return;
    }
    generatePDF(app);
  };

  const generatePDF = async (app: TenantApplication) => {
    setIsDownloading(true);
    const input = document.getElementById('printable-content');
    if (!input) {
        setIsDownloading(false);
        return;
    }

    try {
        const canvas = await html2canvas(input, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`SPACEYA_Application_${app.id}.pdf`);
    } catch (err) {
        console.error("PDF Generation failed", err);
    } finally {
        setIsDownloading(false);
    }
  };

  // --- RENDERERS ---

  if (viewMode === 'gate') {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-8 pb-20 animate-in fade-in zoom-in-95 duration-500">
         <div className="bg-white dark:bg-zinc-900 p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 max-w-lg w-full text-center space-y-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto text-white shadow-xl shadow-blue-600/20">
               <ShieldCheck size={40} />
            </div>
            <div>
               <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Agent Verification</h2>
               <p className="text-zinc-500 font-medium mt-2 text-sm">Enter the unique ID of your leasing agent to access their specific enrollment form.</p>
            </div>
            <div className="relative">
               <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" />
               <input 
                 className="w-full pl-14 pr-6 py-6 bg-offwhite dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-3xl text-lg font-bold text-center tracking-widest outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                 placeholder="AGENT ID (e.g. u1)"
                 value={targetAgentId}
                 onChange={(e) => setTargetAgentId(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && validateAgent(targetAgentId)}
               />
            </div>
            <button 
              onClick={() => validateAgent(targetAgentId)}
              disabled={isSearchingAgent || !targetAgentId}
              className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
               {isSearchingAgent ? <Loader2 className="animate-spin" /> : <ArrowRight />}
               {isSearchingAgent ? 'Verifying...' : 'Access Form'}
            </button>
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
               <button onClick={() => setViewMode('history')} className="text-zinc-400 font-bold text-xs hover:text-blue-600 transition-colors uppercase tracking-widest">
                  View My Submitted Dossiers
               </button>
            </div>
         </div>
      </div>
    );
  }

  if (viewMode === 'form' && activeTemplate) {
    const currentSection = activeTemplate.sections[currentStepIndex];
    const isLastStep = currentStepIndex === activeTemplate.sections.length - 1;

    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
         <div className="flex items-center justify-between">
            <button onClick={() => setViewMode('gate')} className="p-3 bg-white dark:bg-zinc-900 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
               <ArrowLeft size={20} className="text-zinc-500" />
            </button>
            <div className="text-center">
               <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Application for {targetAgent?.name}</h2>
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Step {currentStepIndex + 1} of {activeTemplate.sections.length}</p>
            </div>
            <div className="w-12"></div>
         </div>

         {/* Progress Bar */}
         <div className="flex gap-2">
            {activeTemplate.sections.map((_, idx) => (
               <div key={idx} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${idx <= currentStepIndex ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            ))}
         </div>

         <div className="bg-white dark:bg-zinc-900 p-8 md:p-14 rounded-[3.5rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl">
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 key={currentStepIndex}">
               <div className="flex items-center gap-4 text-blue-600">
                  <FileText size={32} />
                  <h3 className="text-2xl font-black">{currentSection.title}</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {currentSection.fields.map(field => (
                     <div key={field.id} className={field.type === 'textarea' || field.type === 'file' ? 'col-span-1 md:col-span-2' : 'col-span-1'}>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                           {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        
                        {field.type === 'textarea' ? (
                           <textarea 
                              className="glass-input w-full p-6 rounded-[2rem] text-sm font-bold h-32 resize-none outline-none focus:ring-2 focus:ring-blue-600"
                              value={formData[field.key] || ''}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              placeholder={field.placeholder || ''}
                           />
                        ) : field.type === 'select' ? (
                           <div className="relative">
                              <select 
                                 className="glass-input w-full p-6 rounded-[2rem] text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-600"
                                 value={formData[field.key] || ''}
                                 onChange={(e) => handleInputChange(field.key, e.target.value)}
                              >
                                 <option value="">Select Option...</option>
                                 {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
                           </div>
                        ) : field.type === 'file' ? (
                           <div 
                              onClick={() => document.getElementById(`file-${field.id}`)?.click()}
                              className="h-48 rounded-[2.5rem] bg-offwhite dark:bg-black border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer group hover:border-blue-600/30 transition-all overflow-hidden"
                           >
                              {formData[field.key] ? (
                                 <img src={formData[field.key]} className="w-full h-full object-cover" alt="Uploaded" />
                              ) : (
                                 <div className="text-center group-hover:scale-110 transition-transform">
                                    <Camera size={32} className="text-zinc-300 mx-auto mb-2" />
                                    <p className="text-[9px] font-black uppercase text-zinc-400">Click to Upload</p>
                                 </div>
                              )}
                              <input 
                                 type="file" 
                                 id={`file-${field.id}`} 
                                 hidden 
                                 accept="image/*" 
                                 onChange={(e) => handleFileUpload(field.key, e)} 
                              />
                           </div>
                        ) : (
                           <input 
                              type={field.type}
                              className="glass-input w-full p-6 rounded-[2rem] text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600"
                              value={formData[field.key] || ''}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              placeholder={field.placeholder || ''}
                           />
                        )}
                     </div>
                  ))}
               </div>

               <div className="flex gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  {currentStepIndex > 0 && (
                     <button onClick={() => setCurrentStepIndex(prev => prev - 1)} className="flex-1 bg-offwhite dark:bg-zinc-800 py-6 rounded-[2rem] font-black uppercase text-[10px] text-zinc-400">Back</button>
                  )}
                  {isLastStep ? (
                     <button 
                        onClick={handleSubmitApplication}
                        disabled={isSubmitting}
                        className="flex-[2] bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
                     >
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                        Submit Application
                     </button>
                  ) : (
                     <button onClick={() => setCurrentStepIndex(prev => prev + 1)} className="flex-[2] bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3">
                        Next Step <ArrowRight size={18} />
                     </button>
                  )}
               </div>
            </div>
         </div>
      </div>
    );
  }

  // History View (Tenant Viewing Previous Submissions)
  return (
    <div className="space-y-6 print:hidden-container">
      <div className="flex items-center justify-between mb-8 print:hidden">
         <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">My Submissions</h1>
         <button onClick={() => setViewMode('gate')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl active:scale-95 transition-all">
            <Plus size={16} /> New Application
         </button>
      </div>

      {myApplications.length > 0 ? (
        myApplications.map(app => (
          <div key={app.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between shadow-sm group hover:border-blue-200 transition-all gap-6 print:hidden">
            <div className="flex items-center gap-6 flex-1">
                <div className="w-20 h-20 bg-offwhite dark:bg-black rounded-3xl flex items-center justify-center overflow-hidden border border-zinc-50 dark:border-zinc-800 shadow-xl">
                  {app.passportPhotoUrl ? (
                     <img src={app.passportPhotoUrl} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                     <span className="font-black text-blue-600 text-xl">{app.firstName.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">{app.firstName} {app.surname}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">{app.status} • Filed: {new Date(app.submissionDate).toLocaleDateString()}</p>
                  <div className="mt-2 flex items-center gap-4">
                     <span className="text-[9px] font-black text-emerald-500 uppercase">Risk Index: {app.riskScore}%</span>
                     <span className="text-[9px] font-black text-blue-600 uppercase">Status: {app.status}</span>
                  </div>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setViewingApp(app)}
                  className="flex-1 md:flex-none p-5 bg-offwhite dark:bg-black rounded-2xl text-zinc-400 hover:text-blue-600 hover:bg-white transition-all shadow-sm flex items-center justify-center gap-3 group"
                >
                  <Eye size={20} /> <span className="text-[9px] font-black uppercase tracking-widest hidden lg:inline">View</span>
                </button>
                <button 
                  onClick={() => handleDownloadPDF(app)}
                  disabled={isDownloading}
                  className="flex-1 md:flex-none p-5 bg-offwhite dark:bg-black rounded-2xl text-zinc-400 hover:text-blue-600 hover:bg-white transition-all shadow-sm flex items-center justify-center gap-3 group disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />} 
                  <span className="text-[9px] font-black uppercase tracking-widest hidden lg:inline">{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                </button>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-16 rounded-[4rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800 text-center space-y-8 shadow-sm print:hidden">
            <div className="w-24 h-24 bg-offwhite dark:bg-black rounded-full flex items-center justify-center mx-auto shadow-xl">
               <FileText size={40} className="text-zinc-200" />
            </div>
            <div className="space-y-2">
               <h3 className="text-2xl font-black text-zinc-900 dark:text-white">Submission History Empty</h3>
               <p className="text-zinc-400 text-sm max-w-xs mx-auto font-medium">No tenancy dossiers found on your registry. Begin your enrollment process to start a new lifecycle.</p>
            </div>
        </div>
      )}

      {/* VIEW MODAL (On Screen & Download Source) */}
      {viewingApp && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800 relative">
             <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-black/50">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FileText size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-zinc-900 dark:text-white">Application Details</h3>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dossier ID: {viewingApp.id}</p>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button 
                     onClick={() => handleDownloadPDF(viewingApp)} 
                     disabled={isDownloading}
                     className="bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-all disabled:opacity-50"
                   >
                      {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                      Download PDF
                   </button>
                   <button 
                     onClick={() => setViewingApp(null)} 
                     className="bg-zinc-200 dark:bg-zinc-800 p-3 rounded-xl text-zinc-500 hover:text-rose-500 transition-all"
                   >
                      <X size={20} />
                   </button>
                </div>
             </div>
             
             {/* Printable/Viewable Content Area */}
             <div id="printable-content" className="p-10 overflow-y-auto custom-scrollbar space-y-12 bg-white dark:bg-zinc-900 text-black dark:text-white">
                <div className="flex flex-col md:flex-row gap-8 items-center border-b border-zinc-100 dark:border-zinc-800 pb-10">
                   <div className="w-24 h-24 bg-zinc-100 dark:bg-black rounded-3xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800">
                      {viewingApp.passportPhotoUrl ? (
                        <img src={viewingApp.passportPhotoUrl} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 text-3xl font-black">
                          {viewingApp.firstName.charAt(0)}
                        </div>
                      )}
                   </div>
                   <div className="text-center md:text-left">
                      <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{viewingApp.firstName} {viewingApp.surname}</h2>
                      <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                        <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{viewingApp.status}</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Date: {new Date(viewingApp.submissionDate).toLocaleDateString()}</span>
                      </div>
                   </div>
                </div>

                <Section title="01: Registry Information">
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <PrintRow label="Surname" value={viewingApp.surname} />
                      <PrintRow label="First Name" value={viewingApp.firstName} />
                      <PrintRow label="Other Name" value={viewingApp.middleName} />
                      <PrintRow label="Date of Birth" value={viewingApp.dob} />
                      <PrintRow label="Gender" value={viewingApp.gender} />
                      <PrintRow label="Marital Status" value={viewingApp.maritalStatus} />
                      <PrintRow label="Occupation" value={viewingApp.occupation} />
                      <PrintRow label="Phone" value={viewingApp.phoneNumber} />
                      <PrintRow label="Family Size" value={viewingApp.familySize} />
                   </div>
                </Section>

                <Section title="02: Residential Analysis">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <PrintRow label="Current Address" value={viewingApp.currentHomeAddress} />
                      <PrintRow label="Relocation Reason" value={viewingApp.reasonForRelocating} />
                      <PrintRow label="Landlord" value={viewingApp.currentLandlordName} />
                      <PrintRow label="Landlord Phone" value={viewingApp.currentLandlordPhone} />
                   </div>
                </Section>

                <Section title="03: Verification Dossier">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <PrintRow label="ID Type" value={viewingApp.verificationType} />
                      <PrintRow label="ID Number" value={viewingApp.verificationIdNumber} />
                   </div>
                   {/* URL and Image removed from Tenant View per request */}
                </Section>

                {/* Dynamic Sections */}
                {Object.keys(viewingApp.customResponses || {}).length > 0 && (
                  <Section title="04: Additional Information">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {Object.entries(viewingApp.customResponses || {}).map(([key, value]) => {
                           if (key === 'agentIdCode' || key === 'signature' || typeof value !== 'string') return null;
                           if (['firstName', 'surname', 'middleName', 'dob', 'maritalStatus', 'gender', 'currentHomeAddress', 'occupation', 'familySize', 'phoneNumber', 'reasonForRelocating', 'currentLandlordName', 'currentLandlordPhone', 'verificationType', 'verificationIdNumber', 'verificationUrl', 'passportPhotoUrl'].includes(key)) return null;
                           
                           return <PrintRow key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={String(value)} />;
                        })}
                     </div>
                  </Section>
                )}

                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Dossier Authentication</p>
                    <p className="text-4xl font-serif italic text-zinc-900 dark:text-white mb-2">{viewingApp.signature}</p>
                    <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">Digital Signature Verified • {viewingApp.applicationDate}</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
