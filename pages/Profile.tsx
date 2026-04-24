
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, FormTemplate, FormSection, FormField, FieldType } from '../types';
import { getStore, saveStore, UserSettings } from '../store';
import { 
  User as UserIcon, Mail, Phone, Shield, Save, CheckCircle2, 
  AlertCircle, Copy, Check, Link as LinkIcon, FileText, 
  Settings as SettingsIcon, PenTool, Plus, Trash2, GripVertical, X, Loader2,
  Camera, ArrowUp, ArrowDown
} from 'lucide-react';

interface ProfileProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

const DEFAULT_AGENT_TEMPLATE: FormTemplate = {
  agentId: '', // Set dynamically
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

const Profile: React.FC<ProfileProps> = ({ user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'form'>('general');
  const [name, setName] = useState(user.name);
  const [userPhone, setUserPhone] = useState(user.phone || '');
  const [profilePic, setProfilePic] = useState<string | undefined>(user.profilePictureUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FORM BUILDER STATE ---
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    if (user.role === UserRole.AGENT && activeTab === 'form') {
      const store = getStore();
      const existingTemplate = store.formTemplates.find(t => t.agentId === user.id);
      
      if (existingTemplate) {
        // Deep copy to avoid mutating store directly
        setEditingTemplate(JSON.parse(JSON.stringify(existingTemplate)));
      } else {
        // Load the full default template
        const defaultT = JSON.parse(JSON.stringify(DEFAULT_AGENT_TEMPLATE));
        defaultT.agentId = user.id;
        setEditingTemplate(defaultT);
      }
    }
  }, [user.id, user.role, activeTab]);

  // --- GENERAL PROFILE HANDLERS ---

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      const store = getStore();
      const updatedUser = { ...user, name, phone: userPhone, profilePictureUrl: profilePic };
      
      const updatedUsers = store.users.map(u => u.id === user.id ? updatedUser : u);
      const newState = { ...store, users: updatedUsers, currentUser: updatedUser };
      
      saveStore(newState);
      onUserUpdate(updatedUser);
      setIsSaving(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }, 1000);
  };

  const handleCopyId = () => {
    if (user.id) {
        navigator.clipboard.writeText(user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
      if (user.id) {
          const url = `${window.location.origin}?ref=${user.id}`;
          navigator.clipboard.writeText(url);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
      }
  };

  // --- FORM BUILDER HANDLERS ---

  const addSection = () => {
    if (!editingTemplate) return;
    const newSection: FormSection = {
      id: `s_${Date.now()}`,
      title: 'New Section',
      icon: 'FileText',
      fields: []
    };
    setEditingTemplate({
      ...editingTemplate,
      sections: [...editingTemplate.sections, newSection]
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!editingTemplate) return;
    const newSections = [...editingTemplate.sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    } else if (direction === 'down' && index < newSections.length - 1) {
       [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    }
    setEditingTemplate({ ...editingTemplate, sections: newSections });
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      sections: editingTemplate.sections.map(s => s.id === sectionId ? { ...s, title } : s)
    });
  };

  const deleteSection = (sectionId: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      sections: editingTemplate.sections.filter(s => s.id !== sectionId)
    });
  };

  const addField = (sectionId: string) => {
    if (!editingTemplate) return;
    const newField: FormField = {
      id: `f_${Date.now()}`,
      key: `custom_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false
    };
    setEditingTemplate({
      ...editingTemplate,
      sections: editingTemplate.sections.map(s => 
        s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s
      )
    });
  };

  const moveField = (sectionIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    if (!editingTemplate) return;
    const newSections = [...editingTemplate.sections];
    const section = { ...newSections[sectionIndex] };
    const newFields = [...section.fields];

    if (direction === 'up' && fieldIndex > 0) {
        [newFields[fieldIndex], newFields[fieldIndex - 1]] = [newFields[fieldIndex - 1], newFields[fieldIndex]];
    } else if (direction === 'down' && fieldIndex < newFields.length - 1) {
        [newFields[fieldIndex], newFields[fieldIndex + 1]] = [newFields[fieldIndex + 1], newFields[fieldIndex]];
    }

    section.fields = newFields;
    newSections[sectionIndex] = section;
    setEditingTemplate({ ...editingTemplate, sections: newSections });
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      sections: editingTemplate.sections.map(s => 
        s.id === sectionId ? {
          ...s,
          fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        } : s
      )
    });
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      sections: editingTemplate.sections.map(s => 
        s.id === sectionId ? {
          ...s,
          fields: s.fields.filter(f => f.id !== fieldId)
        } : s
      )
    });
  };

  const saveTemplate = () => {
    if (!editingTemplate) return;
    setIsSavingTemplate(true);
    setTimeout(() => {
      const store = getStore();
      const existingIndex = store.formTemplates.findIndex(t => t.agentId === user.id);
      let newTemplates = [...store.formTemplates];
      if (existingIndex >= 0) {
        newTemplates[existingIndex] = editingTemplate;
      } else {
        newTemplates.push(editingTemplate);
      }
      
      const newStore = { ...store, formTemplates: newTemplates };
      saveStore(newStore);
      setIsSavingTemplate(false);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">My Profile</h1>
          <p className="text-zinc-500 font-medium mt-1">Manage your identification and suite configuration.</p>
        </div>
        
        {user.role === UserRole.AGENT && (
          <div className="flex p-1 bg-zinc-100 dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800">
             <button 
               onClick={() => setActiveTab('general')}
               className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
             >
               Identity
             </button>
             <button 
               onClick={() => setActiveTab('form')}
               className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
             >
               Form Builder
             </button>
          </div>
        )}
      </header>

      {activeTab === 'general' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-left-4 duration-500">
          <div className="md:col-span-1 space-y-6">
            {/* Identity Card */}
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 flex flex-col items-center text-center shadow-2xl">
              <div 
                className="relative group cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-28 h-28 bg-white rounded-[2rem] overflow-hidden flex items-center justify-center text-zinc-300 border border-zinc-200 text-3xl font-black shadow-lg mb-6 relative">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Camera className="text-white w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2 text-white border-4 border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    <Plus size={14} />
                </div>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleProfilePicUpload} />

              <h2 className="text-2xl font-black text-white">{user.name}</h2>
              <div className="mt-2 inline-flex items-center px-4 py-1.5 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                <Shield size={12} className="mr-2" /> {user.role}
              </div>
              
              <div className="mt-8 w-full pt-8 border-t border-zinc-800 space-y-6">
                 <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Unique Suite ID</p>
                    <div className="bg-black p-3 rounded-xl border border-zinc-800 flex items-center justify-between group">
                      <span className="text-sm font-mono font-bold text-blue-400">{user.id}</span>
                      <button 
                          onClick={handleCopyId}
                          className="p-2 text-zinc-600 hover:text-white transition-colors rounded-lg active:scale-95"
                          title="Copy ID"
                      >
                          {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="mt-2 text-[9px] text-zinc-600 font-medium italic">Use this ID to receive applications or link properties.</p>
                 </div>

                 {user.role === UserRole.AGENT && (
                   <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Tenant Onboarding Link</p>
                      <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-600/20 flex items-center justify-between group cursor-pointer" onClick={handleCopyLink}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <LinkIcon size={14} className="text-blue-500 shrink-0" />
                            <span className="text-xs font-medium text-blue-400 truncate">spaceya.app?ref={user.id}</span>
                        </div>
                        <button 
                            className="p-2 text-blue-400 hover:text-white transition-colors rounded-lg"
                        >
                            {linkCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                      <p className="mt-2 text-[9px] text-zinc-600 font-medium italic">Share this link. New tenants will be auto-routed to your application inbox.</p>
                   </div>
                 )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {/* Settings Panel */}
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-8 md:p-12 shadow-sm border border-zinc-100 dark:border-zinc-800">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-zinc-900 dark:text-white">General Settings</h3>
                 {showSaved && (
                   <div className="flex items-center text-emerald-600 text-xs font-black uppercase animate-in fade-in slide-in-from-right-4">
                     <CheckCircle2 size={16} className="mr-2" /> Changes Saved
                   </div>
                 )}
               </div>

               <form onSubmit={handleUpdate} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Full Legal Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                          className="w-full pl-11 pr-5 py-4 bg-offwhite dark:bg-black border border-zinc-100 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-zinc-900 dark:text-white"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Contact Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                          className="w-full pl-11 pr-5 py-4 bg-offwhite dark:bg-black border border-zinc-100 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-zinc-900 dark:text-white"
                          value={userPhone}
                          onChange={e => setUserPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Account Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        className="w-full pl-11 pr-5 py-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-500 cursor-not-allowed"
                        value={user.email}
                        disabled
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-400 font-medium ml-1">Email changes require admin verification.</p>
                  </div>

                  <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                     <button 
                       type="submit"
                       disabled={isSaving}
                       className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center disabled:opacity-50"
                     >
                       {isSaving ? 'Processing...' : (
                         <><Save size={16} className="mr-2" /> Commit Changes</>
                       )}
                     </button>
                  </div>
               </form>
            </div>

            <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/20 flex items-start space-x-4">
               <div className="p-3 bg-amber-600/10 text-amber-600 rounded-xl shrink-0">
                  <AlertCircle size={24} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest">Security Notice</h4>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">Ensure your Unique Suite ID is only shared with trusted tenants. This ID serves as your global routing key for all digital applications in the suite.</p>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-4 duration-500">
           <div className="flex justify-between items-center mb-8">
              <div>
                 <h2 className="text-xl font-black text-zinc-900 dark:text-white">Tenancy Application Form Architect</h2>
                 <p className="text-zinc-500 text-xs font-bold mt-1">Customize and prioritize data requirements for new tenants.</p>
              </div>
              <button 
                onClick={saveTemplate} 
                disabled={isSavingTemplate}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl active:scale-95 transition-all"
              >
                {isSavingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Template
              </button>
           </div>

           <div className="space-y-8">
              {editingTemplate?.sections.map((section, sIndex) => (
                <div key={section.id} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative group/section transition-all hover:border-blue-400/30">
                   <div className="flex items-center justify-between mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                      <div className="flex items-center gap-3 w-full">
                         <div className="flex flex-col gap-1 mr-2">
                            <button 
                                onClick={() => moveSection(sIndex, 'up')}
                                disabled={sIndex === 0}
                                className="p-1 text-zinc-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button 
                                onClick={() => moveSection(sIndex, 'down')}
                                disabled={sIndex === (editingTemplate?.sections.length || 0) - 1}
                                className="p-1 text-zinc-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                            >
                                <ArrowDown size={14} />
                            </button>
                         </div>
                         <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-400"><PenTool size={16} /></div>
                         <input 
                           className="text-lg font-black text-zinc-900 dark:text-white bg-transparent outline-none w-full placeholder:text-zinc-300"
                           value={section.title}
                           onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                           placeholder="Section Title"
                         />
                      </div>
                      <button onClick={() => deleteSection(section.id)} className="text-zinc-400 hover:text-rose-500 p-2 transition-colors">
                        <Trash2 size={18} />
                      </button>
                   </div>

                   <div className="space-y-3">
                      {section.fields.map((field, fIndex) => (
                        <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-offwhite dark:bg-black rounded-2xl border border-zinc-100 dark:border-zinc-800 group/field hover:border-blue-500/30 transition-all">
                           <div className="p-2 text-zinc-300 cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>
                           
                           {/* Field Reorder Controls */}
                           <div className="flex flex-col gap-1 mr-1">
                                <button 
                                    onClick={() => moveField(sIndex, fIndex, 'up')}
                                    disabled={fIndex === 0}
                                    className="p-0.5 text-zinc-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                                >
                                    <ArrowUp size={10} />
                                </button>
                                <button 
                                    onClick={() => moveField(sIndex, fIndex, 'down')}
                                    disabled={fIndex === section.fields.length - 1}
                                    className="p-0.5 text-zinc-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                                >
                                    <ArrowDown size={10} />
                                </button>
                           </div>

                           <div className="flex-1 w-full sm:w-auto space-y-3 sm:space-y-0 sm:flex sm:gap-4 items-center">
                              <input 
                                className="bg-transparent font-bold text-sm text-zinc-900 dark:text-white outline-none w-full sm:w-1/3 placeholder:text-zinc-400"
                                value={field.label}
                                onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                                placeholder="Field Label"
                              />
                              <select 
                                className="bg-white dark:bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-500 rounded-xl px-3 py-2 outline-none border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto"
                                value={field.type}
                                onChange={(e) => updateField(section.id, field.id, { type: e.target.value as FieldType })}
                              >
                                 <option value="text">Text Input</option>
                                 <option value="number">Number</option>
                                 <option value="date">Date Picker</option>
                                 <option value="select">Dropdown</option>
                                 <option value="textarea">Text Area</option>
                                 <option value="file">File Upload</option>
                                 <option value="tel">Phone</option>
                                 <option value="email">Email</option>
                              </select>
                              {field.type === 'select' && (
                                 <input 
                                    className="bg-white/50 dark:bg-zinc-900/50 rounded-xl px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 outline-none w-full sm:w-1/3 border border-transparent focus:border-blue-500 transition-colors"
                                    value={field.options?.join(', ') || ''}
                                    onChange={(e) => updateField(section.id, field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                                    placeholder="Options (comma separated)"
                                 />
                              )}
                              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                                 <input 
                                   type="checkbox" 
                                   checked={field.required} 
                                   onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                                   className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                 />
                                 <span className="text-[9px] font-black uppercase text-zinc-400">Req</span>
                              </div>
                           </div>
                           <button onClick={() => deleteField(section.id, field.id)} className="text-zinc-400 hover:text-rose-500 opacity-0 group-hover/field:opacity-100 transition-opacity p-1">
                              <X size={16} />
                           </button>
                        </div>
                      ))}
                      <button onClick={() => addField(section.id)} className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2 group">
                         <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Add Data Field
                      </button>
                   </div>
                </div>
              ))}
              
              <button onClick={addSection} className="w-full py-8 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 font-black uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-3">
                 <Plus size={20} /> Create New Form Section
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
