
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole, Property, PropertyStatus, PropertyCategory, PropertyType, ApplicationStatus, Agreement, NotificationType, MaintenanceTicket, TicketStatus, TicketPriority, Notification, Transaction } from '../types';
import { getStore, saveStore, formatCurrency, formatDate, useAppStore } from '../store';
import { logger } from '../lib/logger';
import { 
  MapPin, Plus, Edit, X, Wrench, Info, ArrowRight, DollarSign, 
  UserPlus, Save, Loader2, Tag, Layout, Briefcase, UserCheck, 
  Maximize2, Users, CalendarDays, Clock, FileText, ChevronDown,
  ArrowUpNarrowWide, ArrowDownWideNarrow, CalendarRange, ListFilter,
  Search, CheckCircle2, ClipboardCheck, Building, Camera, Image as ImageIcon, AlertTriangle, CreditCard,
  Upload, Send, FileWarning, AlertOctagon, AlertCircle, Trash2, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

interface PropertiesProps {
  user: User;
}

type SortOption = 'none' | 'rent_asc' | 'rent_desc' | 'location' | 'expiry';
type NoticeType = 'RENT_INCREASE' | 'QUIT_NOTICE';

const PROPERTY_TYPES: PropertyType[] = [
  'Single Room', 'Self-contained', 'Mini Flat (1 Bedroom)', 
  '2 Bedroom flat', '3 Bedroom Flat', '4 Bedroom Flat', 
  'Terrace', 'Semi-detached Duplex', 'Fully Detached Duplex', 
  'Penthouse', 'Studio Appartment', 'Serviced Appartment', 
  'Shop', 'Plaza Shop', 'Office Space', 'Co-working Space', 
  'Factory', 'Warehouse', 'land'
];

const Properties: React.FC<PropertiesProps> = ({ user }) => {
  const [store, setStore] = useAppStore();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showMaintenanceList, setShowMaintenanceList] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [editFormData, setEditFormData] = useState<Partial<Property>>({});
  
  // Carousel State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Maintenance State
  const [maintenanceIssue, setMaintenanceIssue] = useState('');
  const [maintenanceImage, setMaintenanceImage] = useState<string | null>(null);
  
  // Notice State
  const [noticeType, setNoticeType] = useState<NoticeType>('RENT_INCREASE');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeFile, setNoticeFile] = useState<string | null>(null);
  const [noticeFileName, setNoticeFileName] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingTenant, setPendingTenant] = useState<User | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const propImagesRef = useRef<HTMLInputElement>(null);
  const noticeFileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = store;

  // Initial Notice Template Effect
  useEffect(() => {
    if (!selectedProperty) return;
    const today = new Date().toLocaleDateString();
    
    if (noticeType === 'RENT_INCREASE') {
      setNoticeMessage(`NOTICE OF RENT INCREASE\n\nDate: ${today}\n\nDear Tenant,\n\nPlease be advised that effective from the next renewal cycle, the annual rent for ${selectedProperty.name} will be adjusted. The new rental amount will be [ENTER NEW AMOUNT] due to market adjustments.\n\nKindly acknowledge receipt of this notice.`);
    } else {
      setNoticeMessage(`NOTICE TO QUIT\n\nDate: ${today}\n\nDear Tenant,\n\nThis serves as a formal notice to quit and deliver up possession of the premises known as ${selectedProperty.name} by [ENTER DATE].\n\nFailure to comply will lead to legal action for recovery of premises.`);
    }
  }, [noticeType, selectedProperty]);

  // Reset carousel on property select
  useEffect(() => {
      setCurrentImageIndex(0);
  }, [selectedProperty]);

  // Helper for days remaining
  const getDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate || expiryDate === '---') return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Automated Expiry Notifications
  useEffect(() => {
    if (user.role !== UserRole.AGENT && user.role !== UserRole.ADMIN) return;

    const expiringProps = store.properties.filter(p => {
        if (p.status !== PropertyStatus.OCCUPIED || !p.rentExpiryDate) return false;
        const days = getDaysRemaining(p.rentExpiryDate);
        return days !== null && days <= 30 && days > 0;
    });

    const newNotifications: Notification[] = [];
    let stateChanged = false;

    expiringProps.forEach(p => {
        const notifId = `n_exp_${p.id}_${p.rentExpiryDate}`;
        const exists = store.notifications.find(n => n.id === notifId);
        
        if (!exists) {
            const days = getDaysRemaining(p.rentExpiryDate!);
            newNotifications.push({
                id: notifId,
                userId: user.id,
                title: 'Lease Expiry Alert',
                message: `Lease for ${p.name} is expiring in ${days} days (${formatDate(p.rentExpiryDate!, settings)}). Review renewal options.`,
                type: NotificationType.WARNING,
                timestamp: new Date().toISOString(),
                isRead: false,
                linkTo: 'properties'
            });
            stateChanged = true;
        }
    });

    if (stateChanged) {
        const newState = { ...store, notifications: [...newNotifications, ...store.notifications] };
        saveStore(newState);
        setStore(newState);
    }
  }, [user.id, user.role]); 

  const properties = useMemo(() => {
    let list: Property[] = [];
    if (user.role === UserRole.ADMIN) {
      list = [...store.properties];
    } else if (user.role === UserRole.AGENT) {
      list = [...store.properties.filter(p => p.agentId === user.id)];
    } else {
      list = [...store.properties.filter(p => user.assignedPropertyIds?.includes(p.id))];
    }

    // Apply Filters
    if (filterStatus !== 'ALL') {
        list = list.filter(p => p.status === filterStatus);
    }
    if (filterCategory !== 'ALL') {
        list = list.filter(p => p.category === filterCategory);
    }
    if (filterType !== 'ALL') {
        list = list.filter(p => p.type === filterType);
    }

    switch (sortBy) {
      case 'rent_asc': list.sort((a, b) => a.rent - b.rent); break;
      case 'rent_desc': list.sort((a, b) => b.rent - a.rent); break;
      case 'location': list.sort((a, b) => a.location.localeCompare(b.location)); break;
      case 'expiry':
        list.sort((a, b) => {
          if (!a.rentExpiryDate) return 1;
          if (!b.rentExpiryDate) return -1;
          return new Date(a.rentExpiryDate).getTime() - new Date(b.rentExpiryDate).getTime();
        });
        break;
      default: break;
    }
    return list;
  }, [user, store, sortBy, filterStatus, filterCategory, filterType]);

  const approvedTenants = useMemo(() => {
    const approvedAppUserIds = store.applications
      .filter(app => app.status === ApplicationStatus.APPROVED && (user.role === UserRole.ADMIN || app.agentId === user.id))
      .map(app => app.userId);
    
    return store.users
      .filter(u => u.role === UserRole.TENANT && approvedAppUserIds.includes(u.id))
      .filter(u => !u.assignedPropertyIds?.includes(selectedProperty?.id || ''))
      .filter(u => 
        u.name.toLowerCase().includes(tenantSearch.toLowerCase()) || 
        u.email.toLowerCase().includes(tenantSearch.toLowerCase())
      );
  }, [store.applications, store.users, user.id, user.role, tenantSearch]);

  const handleAssignTenant = (tenant: User) => {
    if (!selectedProperty) return;
    setPendingTenant(tenant);
    setShowPaymentModal(true);
  };

  const handleTopUp = async () => {
    setIsSaving(true);
    const { simulateFundWallet } = await import('../services/simulationEngine');
    const result = await simulateFundWallet(user.id, 5000);
    if (result.status === 'success') {
      alert('Wallet funded via simulation.');
    } else {
      alert('Error: ' + result.message);
    }
    setIsSaving(false);
  };

  const confirmAssignmentWithPayment = async () => {
    if (!selectedProperty || !pendingTenant) return;
    
    setIsSaving(true);
    setShowPaymentModal(false);

    try {
      const { simulateTenantAssignment } = await import('../services/simulationEngine');
      const assignResult = await simulateTenantAssignment(user.id, pendingTenant.id, selectedProperty.id);

      if (assignResult.status !== 'success') {
         alert('Payment Failed: ' + assignResult.message);
         setIsSaving(false);
         setPendingTenant(null);
         return;
      }

      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 1);
      nextYear.setDate(today.getDate() - 1);

      const startDate = today.toISOString().split('T')[0];
      const endDate = nextYear.toISOString().split('T')[0];

      // 1. Update Property
      const updatedProperties = store.properties.map(p => 
        p.id === selectedProperty.id ? { 
          ...p, 
          tenantId: pendingTenant.id, 
          status: PropertyStatus.OCCUPIED,
          rentStartDate: startDate,
          rentExpiryDate: endDate
        } as Property : p
      );

      // 2. Update Tenant Array
      const updatedUsers = store.users.map(u => {
        if (u.id === pendingTenant.id) {
          return { ...u, assignedPropertyIds: [...(u.assignedPropertyIds || []), selectedProperty.id] };
        }
        return u;
      });

      const newAgreement: Agreement = {
        id: `a${Date.now()}`,
        propertyId: selectedProperty.id,
        tenantId: pendingTenant.id,
        version: 1,
        startDate,
        endDate,
        status: 'active'
      };

      const notification = {
        id: `n_assign_${Date.now()}`,
        userId: pendingTenant.id,
        title: 'Lease Activated',
        message: `Your application for ${selectedProperty.name} is complete. Your tenancy cycle starts today.`,
        type: NotificationType.SUCCESS,
        timestamp: new Date().toISOString(),
        isRead: false,
        linkTo: 'dashboard'
      };

      const updatedStore = { 
        ...store, 
        properties: updatedProperties, 
        users: updatedUsers,
        agreements: [...store.agreements, newAgreement],
        notifications: [notification, ...store.notifications]
      };

      saveStore(updatedStore);
      setStore(updatedStore);
      logger.action('tenant_assigned_to_property', { propertyId: selectedProperty.id, tenantId: pendingTenant.id });
      setSelectedProperty(updatedProperties.find(p => p.id === selectedProperty.id) || null);
      
    } catch (e: any) {
      alert('Error during assignment: ' + e.message);
    }

    setIsSaving(false);
    setShowTenantPicker(false);
    setPendingTenant(null);
    setTenantSearch('');
  };

  const handlePropertyImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    const readers: Promise<void>[] = [];

    Array.from(files).forEach((file: File) => {
      // Basic validation: must be image and < 5MB
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) return;

      const reader = new FileReader();
      const promise = new Promise<void>((resolve) => {
        reader.onloadend = () => {
          if (reader.result) {
            newImages.push(reader.result as string);
          }
          resolve();
        };
      });
      reader.readAsDataURL(file);
      readers.push(promise);
    });

    await Promise.all(readers);
    
    setEditFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...newImages]
    }));
  };

  const removePropertyImage = (indexToRemove: number) => {
    setEditFormData(prev => {
        const newImages = (prev.images || []).filter((_, idx) => idx !== indexToRemove);
        // Adjust currentImageIndex if needed
        if (currentImageIndex >= newImages.length && newImages.length > 0) {
            setCurrentImageIndex(newImages.length - 1);
        } else if (newImages.length === 0) {
            setCurrentImageIndex(0);
        }
        return {
            ...prev,
            images: newImages
        };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMaintenanceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleNoticeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNoticeFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNoticeFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitMaintenance = async () => {
    if (!selectedProperty || !maintenanceIssue) return;
    setIsSaving(true);

    const newTicket: MaintenanceTicket = {
      id: `t${Date.now()}`,
      propertyId: selectedProperty.id,
      tenantId: user.id,
      issue: maintenanceIssue,
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      createdAt: new Date().toISOString(),
      imageUrl: maintenanceImage || undefined,
      aiAssessment: undefined
    };

    const notification = {
      id: `n_maint_${Date.now()}`,
      userId: selectedProperty.agentId,
      title: 'Maintenance Alert',
      message: `A new repair request has been filed for ${selectedProperty.name}. Check Maintenance tab for details.`,
      type: newTicket.priority === TicketPriority.EMERGENCY ? NotificationType.ERROR : NotificationType.WARNING,
      timestamp: new Date().toISOString(),
      isRead: false,
      linkTo: 'maintenance'
    };

    const updatedStore = {
      ...store,
      tickets: [newTicket, ...store.tickets],
      notifications: [notification, ...store.notifications]
    };

    saveStore(updatedStore);
    setStore(updatedStore);
    logger.action('maintenance_ticket_created', { ticketId: newTicket.id, propertyId: selectedProperty.id });
    setIsSaving(false);
    setShowMaintenanceForm(false);
    setMaintenanceIssue('');
    setMaintenanceImage(null);
  };

  const handleSendNotice = () => {
    if (!selectedProperty || !selectedProperty.tenantId || !noticeMessage) return;
    setIsSaving(true);

    setTimeout(() => {
        const title = noticeType === 'RENT_INCREASE' ? 'Notice: Rent Adjustment' : 'Urgent: Notice to Quit';
        const type = noticeType === 'RENT_INCREASE' ? NotificationType.INFO : NotificationType.WARNING;

        const notification = {
            id: `n_notice_${Date.now()}`,
            userId: selectedProperty.tenantId!,
            title: title,
            message: noticeMessage,
            type: type,
            timestamp: new Date().toISOString(),
            isRead: false,
            linkTo: 'notifications',
            attachmentUrl: noticeFile || undefined
        };

        const updatedStore = {
            ...store,
            notifications: [notification, ...store.notifications]
        };

        saveStore(updatedStore);
        setStore(updatedStore);
        setIsSaving(false);
        setShowNoticeForm(false);
        setNoticeFile(null);
        setNoticeFileName('');
    }, 1500);
  };

  const getStatusStyle = (status: PropertyStatus) => {
    switch (status) {
      case PropertyStatus.OCCUPIED: return 'bg-black text-white dark:bg-white dark:text-black border-zinc-800 dark:border-zinc-200';
      case PropertyStatus.VACANT: return 'bg-zinc-100 text-black border-zinc-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-700';
      case PropertyStatus.LISTED: return 'bg-white text-black border-black dark:bg-black dark:text-white dark:border-white shadow-none';
      default: return 'bg-zinc-500 text-white border-zinc-400/50';
    }
  };

  const handleOpenDetail = (property: Property) => {
    setSelectedProperty(property);
    setEditFormData(property);
    setIsEditing(false);
    setShowTenantPicker(false);
    setShowMaintenanceForm(false);
    setShowMaintenanceList(false);
    setShowNoticeForm(false);
    setCurrentImageIndex(0);
  };

  const handleStartEdit = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    setSelectedProperty(property);
    setEditFormData(property);
    setIsEditing(true);
    setShowTenantPicker(false);
    setShowMaintenanceForm(false);
    setShowMaintenanceList(false);
    setShowNoticeForm(false);
    setCurrentImageIndex(0);
  };

  const calculateExpiryDate = (startDate: string) => {
    if (!startDate) return '';
    const date = new Date(startDate);
    date.setFullYear(date.getFullYear() + 1);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    const expiry = calculateExpiryDate(start);
    setEditFormData({ ...editFormData, rentStartDate: start, rentExpiryDate: expiry });
  };

  const handleSave = () => {
    if (!selectedProperty) return;
    setIsSaving(true);
    setTimeout(() => {
      const updatedProperties = store.properties.map(p => 
        p.id === selectedProperty.id ? { ...p, ...editFormData } as Property : p
      );
      const updatedStore = { ...store, properties: updatedProperties };
      saveStore(updatedStore);
      setStore(updatedStore);
      setSelectedProperty({ ...selectedProperty, ...editFormData } as Property);
      logger.action('property_updated', { propertyId: selectedProperty.id });
      setIsEditing(false);
      setIsSaving(false);
    }, 800);
  };

  const handlePublishNew = () => {
      const newId = `p${Date.now()}`;
      const newProperty: Property = {
          id: newId,
          name: 'New Asset ' + (store.properties.length + 1),
          location: 'Address TBD',
          rent: 0,
          status: PropertyStatus.DRAFT,
          agentId: user.id,
          category: PropertyCategory.RESIDENTIAL,
          type: 'Mini Flat (1 Bedroom)',
          description: 'Enter description here...',
          images: []
      };
      const updatedStore = { ...store, properties: [...store.properties, newProperty] };
      saveStore(updatedStore);
      setStore(updatedStore);
      logger.action('property_created', { propertyId: newId });
      handleOpenDetail(newProperty);
      setIsEditing(true);
  };

  const sortOptions = [
    { id: 'none', label: 'Default Order', icon: ListFilter },
    { id: 'rent_asc', label: 'Rent: Low to High', icon: ArrowUpNarrowWide },
    { id: 'rent_desc', label: 'Rent: High to Low', icon: ArrowDownWideNarrow },
    { id: 'location', label: 'By Location (A-Z)', icon: MapPin },
    { id: 'expiry', label: 'By Expiry Month', icon: CalendarRange },
  ];

  // Logic for carousel display
  const displayImages = useMemo(() => {
      if (!selectedProperty) return [];
      const source = isEditing ? editFormData.images : selectedProperty.images;
      if (source && source.length > 0) return source;
      return [`https://picsum.photos/seed/${selectedProperty.id}/800/1200`];
  }, [selectedProperty, isEditing, editFormData.images]);

  const nextImage = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  // Mobile Swipe Logic
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) nextImage();
    if (isRightSwipe) prevImage();
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col items-center text-center gap-8 border-b border-zinc-200 dark:border-zinc-800 pb-12">
        <div>
          <h1 className="text-3xl sm:text-7xl font-black text-black dark:text-white tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-3 text-center">Inventory</h1>
          <p className="text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px] text-center">Asset Registry Sync: {properties.length} Active Entities</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center">
          {/* Filter Button */}
          <div className="relative">
            <button 
              onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsSortMenuOpen(false); }}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl border border-black dark:border-white backdrop-blur-md flex items-center justify-between gap-4 font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl ${isFilterMenuOpen ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-white/20'}`}
            >
              <div className="flex items-center gap-3">
                <Filter size={16} />
                <span>Filters</span>
              </div>
              {(filterStatus !== 'ALL' || filterCategory !== 'ALL' || filterType !== 'ALL') && (
                <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-pulse" />
              )}
            </button>

            {isFilterMenuOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 glass-card p-6 rounded-[2rem] shadow-2xl animate-in zoom-in-95 slide-in-from-top-2 w-full sm:w-72 flex flex-col gap-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Status</label>
                    <div className="relative">
                        <select 
                            className="glass-input w-full rounded-xl px-4 py-3 text-xs font-bold text-black dark:text-white outline-none appearance-none"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            {Object.values(PropertyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Category</label>
                    <div className="relative">
                        <select 
                            className="glass-input w-full rounded-xl px-4 py-3 text-xs font-bold text-black dark:text-white outline-none appearance-none"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="ALL">All Categories</option>
                            {Object.values(PropertyCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Type</label>
                    <div className="relative">
                        <select 
                            className="glass-input w-full rounded-xl px-4 py-3 text-xs font-bold text-black dark:text-white outline-none appearance-none"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                    </div>
                 </div>
                 <button 
                    onClick={() => { setFilterStatus('ALL'); setFilterCategory('ALL'); setFilterType('ALL'); }}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-rose-500 transition-colors"
                 >
                    Reset Filters
                 </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => { setIsSortMenuOpen(!isSortMenuOpen); setIsFilterMenuOpen(false); }}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 border border-black dark:border-white backdrop-blur-md flex items-center justify-between gap-4 font-bold text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-white/20 transition-all active:scale-95 shadow-xl"
            >
              <div className="flex items-center gap-3">
                {React.createElement(sortOptions.find(o => o.id === sortBy)?.icon || ListFilter, { size: 16, className: "text-black dark:text-white" })}
                <span>{sortOptions.find(o => o.id === sortBy)?.label}</span>
              </div>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortMenuOpen && (
              <div className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[240px] mt-2 z-50 glass-card rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-top-2 border border-black dark:border-white">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id as SortOption); setIsSortMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${sortBy === opt.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white'}`}
                  >
                    <opt.icon size={16} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(user.role === UserRole.AGENT || user.role === UserRole.ADMIN) && (
            <button 
              onClick={handlePublishNew}
              className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white px-8 py-4 rounded-2xl flex items-center justify-center shadow-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              <Plus className="w-4 h-4 mr-3" /> Publish Asset
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 transition-all duration-500">
        {properties.length > 0 ? properties.map(property => {
          const propertyAgent = store.users.find(u => u.id === property.agentId);
          const activeTickets = store.tickets.filter(t => t.propertyId === property.id && t.status !== TicketStatus.RESOLVED);
          
          const daysRemaining = getDaysRemaining(property.rentExpiryDate);
          const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
          const isExpired = daysRemaining !== null && daysRemaining <= 0;
          
          // List view image preference: 1st uploaded image -> seed image
          const thumbnail = property.images && property.images.length > 0 
            ? property.images[0] 
            : `https://picsum.photos/seed/${property.id}/600/800`;

          return (
            <div 
              key={property.id} 
              onClick={() => handleOpenDetail(property)}
              className="group bg-zinc-50/50 dark:bg-white/5 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-500 cursor-pointer flex flex-col gap-3"
            >
              <div className="w-full h-44 bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden shrink-0 rounded-md">
                <img 
                  src={thumbnail} 
                  alt={property.name} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className={`px-2 py-0.5 text-[6px] font-black uppercase tracking-widest rounded-sm ${getStatusStyle(property.status)}`}>
                    {property.status}
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col px-1 pb-1">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-black text-black dark:text-white leading-tight tracking-tight uppercase truncate pr-4">{property.name}</h3>
                    {(user.role === UserRole.AGENT || user.role === UserRole.ADMIN) && (
                      <button 
                        onClick={(e) => handleStartEdit(e, property)}
                        className="p-0.5 text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <Edit size={10} />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center text-zinc-500 dark:text-zinc-400 text-[7px] font-bold uppercase tracking-wider mb-2">
                    <MapPin className="w-2 h-2 mr-1" />
                    <span className="truncate">{property.location}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[5px] font-bold text-zinc-500 dark:text-zinc-600 uppercase mb-0 tracking-wider">Type</p>
                      <p className="text-[8px] font-black text-black dark:text-zinc-100 uppercase tracking-wide truncate">{property.type}</p>
                    </div>
                    <div>
                      <p className="text-[5px] font-bold text-zinc-500 dark:text-zinc-600 uppercase mb-0 tracking-wider">Status</p>
                      <p className="text-[8px] font-black text-black dark:text-zinc-100 uppercase tracking-wide truncate">{property.status}</p>
                    </div>
                    <div>
                      <p className="text-[5px] font-bold text-zinc-500 dark:text-zinc-600 uppercase mb-0 tracking-wider">Expiry</p>
                      <p className="text-[8px] font-black text-black dark:text-zinc-200 uppercase tracking-wide truncate">{formatDate(property.rentExpiryDate || '---', settings)}</p>
                    </div>
                    <div>
                      <p className="text-[5px] font-bold text-zinc-500 dark:text-zinc-600 uppercase mb-0 tracking-wider">Rent</p>
                      <p className="text-[8px] font-black text-black dark:text-zinc-100 uppercase tracking-wide truncate">{formatCurrency(property.rent, settings)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 mt-4 group-hover:translate-x-1 transition-transform duration-500">
                    <span className="text-[6px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Details View</span>
                    <ArrowRight className="w-2 h-2 text-zinc-400 dark:text-zinc-600" />
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative">
              <div className="absolute inset-0 bg-black blur-[100px] opacity-10 animate-pulse"></div>
              <div className="relative w-48 h-48 bg-white dark:bg-zinc-900 rounded-[3rem] border border-black dark:border-white shadow-2xl flex items-center justify-center overflow-hidden group">
                 <Building size={80} className="text-zinc-300 dark:text-zinc-700 transition-transform group-hover:scale-110 duration-700" />
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-ping"></div>
                 </div>
              </div>
            </div>
            
            <div className="space-y-4 max-w-sm">
              <h3 className="text-3xl font-black text-black dark:text-white tracking-tighter uppercase leading-none">Registry Empty</h3>
              <p className="text-zinc-600 dark:text-zinc-400 font-medium text-sm leading-relaxed">
                We couldn't find any assets matching your current filter criteria or registry sync. Try adjusting your filters or publish a new asset to get started.
              </p>
            </div>

            {(user.role === UserRole.AGENT || user.role === UserRole.ADMIN) && (
              <button 
                onClick={handlePublishNew}
                className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                Publish First Asset
              </button>
            )}
          </div>
        )}
      </div>

      {selectedProperty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto pt-20 pb-20">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-xl shadow-[0_32px_128px_rgba(0,0,0,0.5)] border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col relative transition-all duration-500">
             
             {/* CAROUSEL SECTION - NOW TOP POSITIONED */}
             <div 
               className="w-full h-64 sm:h-80 relative group shrink-0 bg-black"
               onTouchStart={onTouchStart}
               onTouchMove={onTouchMove}
               onTouchEnd={onTouchEnd}
             >
                <div 
                    className="w-full h-full relative cursor-pointer"
                    onClick={() => setExpandedImage(displayImages[currentImageIndex])}
                >
                    <img 
                        src={displayImages[currentImageIndex]} 
                        className="w-full h-full object-cover" 
                        alt="Property Preview" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Maximize2 className="text-white" size={32} />
                    </div>
                </div>

                {/* Carousel Controls */}
                {displayImages.length > 1 && (
                    <>
                        <button 
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                            {displayImages.map((_, idx) => (
                                <button 
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50 hover:bg-white/80'}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pointer-events-none">
                    <p className="text-white font-black text-xl tracking-tight uppercase leading-none">{selectedProperty.name}</p>
                    <p className="text-white/60 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mt-1.5">
                      <MapPin size={10} className="text-zinc-400" /> {selectedProperty.location}
                    </p>
                </div>
                <button 
                  onClick={() => setSelectedProperty(null)} 
                  className="absolute top-4 right-4 p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white shadow-xl z-20 hover:bg-black transition-colors"
                >
                  <X size={18} />
                </button>
             </div>

             <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar scroll-smooth">
                {showTenantPicker ? (
                   /* ... Tenant Picker UI ... */
                   <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 h-full flex flex-col">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <UserPlus className="text-black dark:text-white" size={24} />
                            <div>
                               <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Onboard Tenant</h2>
                               <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Only approved candidates listed</p>
                            </div>
                         </div>
                         <button onClick={() => setShowTenantPicker(false)} className="p-4 bg-white/5 rounded-full text-zinc-400 hover:text-rose-500 transition-all">
                            <X size={20} />
                         </button>
                      </div>

                      <div className="relative">
                         <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                         <input 
                            className="glass-input w-full pl-14 pr-6 py-5 rounded-3xl text-zinc-900 dark:text-white font-bold outline-none" 
                            placeholder="Search by name or email..." 
                            value={tenantSearch}
                            onChange={e => setTenantSearch(e.target.value)}
                         />
                      </div>

                      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
                         {approvedTenants.map(tenant => (
                            <div key={tenant.id} className="p-4 bg-zinc-50/50 dark:bg-white/5 border border-zinc-100 dark:border-zinc-800 rounded-lg flex items-center justify-between hover:border-black dark:hover:border-white transition-all group shadow-sm">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-black dark:text-white font-black">
                                     {tenant.name.charAt(0)}
                                  </div>
                                  <div>
                                     <p className="font-black text-zinc-900 dark:text-white tracking-tight">{tenant.name}</p>
                                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{tenant.email}</p>
                                  </div>
                               </div>
                               <button 
                                  onClick={() => handleAssignTenant(tenant)}
                                  className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:opacity-80 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                               >
                                  <UserCheck size={14} /> Assign Placement
                               </button>
                            </div>
                         ))}
                      </div>
                   </div>
                ) : showMaintenanceForm ? (
                  /* ... Maintenance Form UI ... */
                  <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Wrench className="text-black dark:text-white lucide-wrench" size={24} />
                          <div>
                             <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Log Maintenance</h2>
                             <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Report fault or damage</p>
                          </div>
                       </div>
                       <button onClick={() => setShowMaintenanceForm(false)} className="p-3 bg-zinc-50 dark:bg-white/5 rounded-lg text-zinc-400 hover:text-rose-500 transition-all">
                          <X size={18} />
                       </button>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 ml-1">Fault Description</label>
                          <textarea 
                             className="glass-input w-full p-4 rounded-lg h-32 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 text-sm font-bold text-zinc-900 dark:text-white resize-none" 
                             placeholder="Describe the issue in detail..." 
                             value={maintenanceIssue} 
                             onChange={e => setMaintenanceIssue(e.target.value)}
                          />
                       </div>

                       <div className="space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 ml-1">Evidence / Picture</label>
                          <div 
                             onClick={() => fileInputRef.current?.click()}
                             className="h-48 rounded-lg bg-zinc-50 dark:bg-white/5 border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-black dark:hover:border-white transition-all"
                          >
                             {maintenanceImage ? (
                                <img src={maintenanceImage} className="w-full h-full object-cover" alt="Preview" />
                             ) : (
                                <div className="text-center group-hover:scale-110 transition-transform">
                                   <Camera size={32} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                                   <p className="text-[8px] font-black uppercase text-zinc-400">Snap or Upload Photo</p>
                                </div>
                             )}
                          </div>
                          <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                       </div>

                       <button 
                          onClick={handleSubmitMaintenance}
                          disabled={isSaving || !maintenanceIssue}
                          className="w-full bg-zinc-950 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[9px] py-4 rounded-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                       >
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {isSaving ? 'Submitting...' : 'Log Maintenance'}
                       </button>
                    </div>
                  </div>
                ) : showNoticeForm ? (
                  /* ... Notice Form UI ... */
                  <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <FileWarning className="text-black dark:text-white" size={24} />
                          <div>
                             <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Issue Notice</h2>
                             <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Formal Dispatch</p>
                          </div>
                       </div>
                       <button onClick={() => setShowNoticeForm(false)} className="p-3 bg-zinc-50 dark:bg-white/5 rounded-lg text-zinc-400 hover:text-rose-500 transition-all">
                          <X size={18} />
                       </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <button 
                          onClick={() => setNoticeType('RENT_INCREASE')}
                          className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${noticeType === 'RENT_INCREASE' ? 'bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white' : 'bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                       >
                          <DollarSign size={18} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Rent Hike</span>
                       </button>
                       <button 
                          onClick={() => setNoticeType('QUIT_NOTICE')}
                          className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${noticeType === 'QUIT_NOTICE' ? 'bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white' : 'bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                       >
                          <AlertOctagon size={18} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Quit Notice</span>
                       </button>
                    </div>

                    <div className="space-y-5">
                       <div className="space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 ml-1">Notice Content</label>
                          <textarea 
                             className="glass-input w-full p-4 rounded-lg h-40 outline-none focus:ring-2 focus:ring-black/5 text-sm font-bold text-zinc-900 dark:text-white resize-none" 
                             placeholder="Enter official notice message..." 
                             value={noticeMessage} 
                             onChange={e => setNoticeMessage(e.target.value)}
                          />
                       </div>

                       <div className="space-y-3">
                          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 ml-1">Document (PDF)</label>
                          <div 
                             onClick={() => noticeFileInputRef.current?.click()}
                             className="h-24 rounded-lg bg-zinc-50 dark:bg-white/5 border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-black transition-all"
                          >
                             {noticeFile ? (
                                <div className="text-center">
                                    <FileText size={24} className="text-emerald-500 mx-auto mb-1" />
                                    <p className="text-[8px] font-black uppercase text-emerald-500 truncate max-w-[200px]">{noticeFileName || 'Attached'}</p>
                                </div>
                             ) : (
                                <div className="text-center group-hover:scale-110 transition-transform">
                                   <Upload size={24} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-1" />
                                   <p className="text-[8px] font-black uppercase text-zinc-400">Upload PDF</p>
                                </div>
                             )}
                          </div>
                          <input type="file" hidden ref={noticeFileInputRef} accept="application/pdf,image/*" onChange={handleNoticeFileUpload} />
                       </div>

                       <button 
                          onClick={handleSendNotice}
                          disabled={isSaving || !noticeMessage}
                          className="w-full bg-zinc-950 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[9px] py-4 rounded-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                       >
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          Dispatch Notice
                       </button>
                    </div>
                  </div>
                ) : showMaintenanceList ? (
                  /* ... Maintenance List UI ... */
                  <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Wrench className="text-black dark:text-white" size={24} />
                          <div>
                             <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Maintenance Log</h2>
                             <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">History: {selectedProperty.name}</p>
                          </div>
                       </div>
                       <button onClick={() => setShowMaintenanceList(false)} className="p-3 bg-zinc-50 dark:bg-white/5 rounded-lg text-zinc-400 hover:text-rose-500 transition-all">
                          <X size={18} />
                       </button>
                    </div>

                    <div className="space-y-3">
                        {store.tickets.filter(t => t.propertyId === selectedProperty.id).length > 0 ? (
                            store.tickets.filter(t => t.propertyId === selectedProperty.id).map(ticket => (
                                <div key={ticket.id} className="p-4 bg-zinc-50/50 dark:bg-white/5 border border-zinc-100 dark:border-zinc-800 rounded-lg space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase">{ticket.issue}</h4>
                                            <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-sm text-[7px] font-black uppercase ${
                                            ticket.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-600/10 text-blue-600'
                                        }`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {ticket.imageUrl && (
                                        <div className="h-40 w-full rounded-md overflow-hidden cursor-pointer bg-black/20" onClick={() => setExpandedImage(ticket.imageUrl || null)}>
                                            <img src={ticket.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform" alt="Evidence" />
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-lg">
                                <Wrench className="w-8 h-8 text-zinc-200 dark:text-zinc-800 mx-auto mb-2" />
                                <p className="text-zinc-400 font-bold uppercase text-[8px] tracking-widest">No maintenance records.</p>
                            </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <>
                    <AnimatePresence>
                        {showPaymentModal && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
                            >
                                    <motion.div 
                                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                    className="bg-white dark:bg-zinc-950 w-full max-w-sm rounded-xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400" />
                                    
                                    <div className="flex justify-center mb-6">
                                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center text-black dark:text-white">
                                            <CreditCard size={32} />
                                        </div>
                                    </div>

                                    <div className="text-center space-y-2 mb-8">
                                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Service Fee</h3>
                                        <p className="text-zinc-500 font-medium text-[10px] uppercase tracking-wide">
                                            Admin fee of <span className="text-zinc-900 dark:text-white font-black">₦1,000</span> required.
                                        </p>
                                    </div>

                                    <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 mb-6 space-y-3">
                                        <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-zinc-400">
                                            <span>Wallet</span>
                                            <span className="text-zinc-900 dark:text-white">{formatCurrency(store.users.find(u => u.id === user.id)?.walletBalance || 0, settings)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-zinc-400">
                                            <span>Fee</span>
                                            <span className="text-black dark:text-white font-black">- ₦1,000</span>
                                        </div>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
                                        <div className="flex justify-between items-center text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                                            <span>Total</span>
                                            <span>{formatCurrency((store.users.find(u => u.id === user.id)?.walletBalance || 0) - 1000, settings)}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {(store.users.find(u => u.id === user.id)?.walletBalance || 0) >= 1000 ? (
                                            <button 
                                                onClick={confirmAssignmentWithPayment}
                                                disabled={isSaving}
                                                className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[9px] rounded-lg shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="animate-spin mx-auto w-4 h-4" /> : 'Confirm Payment'}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={handleTopUp}
                                                disabled={isSaving}
                                                className="w-full py-4 bg-white dark:bg-zinc-900 text-black dark:text-white border border-zinc-950 dark:border-white font-black uppercase tracking-[0.2em] text-[9px] rounded-lg shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="animate-spin mx-auto w-4 h-4" /> : 'Add Funds (₦5,000)'}
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => { setShowPaymentModal(false); setPendingTenant(null); }}
                                            className="w-full py-2 text-zinc-400 font-black uppercase tracking-[0.2em] text-[8px] hover:text-rose-500 transition-colors"
                                        >
                                            Abort
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-4 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase shadow-sm border backdrop-blur-md ${getStatusStyle(selectedProperty.status)}`}>{selectedProperty.status}</span>
                            <span className="bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/20 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-sm text-[8px] font-black uppercase">{selectedProperty.category}</span>
                        </div>
                        {isEditing ? (
                            <input 
                                className="glass-input text-2xl font-black text-zinc-900 dark:text-white tracking-tighter p-3 rounded-lg w-full outline-none" 
                                value={editFormData.name} 
                                onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                            />
                        ) : (
                            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight uppercase leading-tight break-words">{selectedProperty.name}</h2>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {(user.role === UserRole.AGENT || user.role === UserRole.ADMIN) && !isEditing && (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-2.5 bg-zinc-50 dark:bg-white/5 rounded-lg text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-zinc-100 dark:border-white/10"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {isEditing ? (
                                <>
                                    <InputWrapper label="Location">
                                        <input className="glass-input w-full p-4 rounded-xl text-sm font-bold" value={editFormData.location} onChange={e => setEditFormData({...editFormData, location: e.target.value})} />
                                    </InputWrapper>
                                    <InputWrapper label="Annual Rent (Base NGN)">
                                        <input type="number" className="glass-input w-full p-4 rounded-xl text-sm font-bold" value={editFormData.rent} onChange={e => setEditFormData({...editFormData, rent: parseInt(e.target.value) || 0})} />
                                    </InputWrapper>
                                    <InputWrapper label="Status">
                                        <select className="glass-input w-full p-4 rounded-xl text-sm font-bold appearance-none" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value as PropertyStatus})}>
                                            <option value={PropertyStatus.DRAFT}>DRAFT</option>
                                            <option value={PropertyStatus.LISTED}>LISTED</option>
                                            <option value={PropertyStatus.VACANT}>VACANT</option>
                                            <option value={PropertyStatus.OCCUPIED}>OCCUPIED</option>
                                            <option value={PropertyStatus.ARCHIVED}>ARCHIVED</option>
                                        </select>
                                    </InputWrapper>
                                    <InputWrapper label="Lifecycle Start">
                                        <input type="date" className="glass-input w-full p-4 rounded-xl text-sm font-bold" value={editFormData.rentStartDate || ''} onChange={handleStartDateChange} />
                                    </InputWrapper>
                                    
                                    <InputWrapper label="Property Category">
                                        <select 
                                          className="glass-input w-full p-4 rounded-xl text-sm font-bold appearance-none" 
                                          value={editFormData.category} 
                                          onChange={e => setEditFormData({...editFormData, category: e.target.value as PropertyCategory})}
                                        >
                                          <option value={PropertyCategory.RESIDENTIAL}>RESIDENTIAL</option>
                                          <option value={PropertyCategory.COMMERCIAL}>COMMERCIAL</option>
                                        </select>
                                    </InputWrapper>
                                    <InputWrapper label="Property Type">
                                        <select 
                                          className="glass-input w-full p-4 rounded-xl text-sm font-bold appearance-none" 
                                          value={editFormData.type} 
                                          onChange={e => setEditFormData({...editFormData, type: e.target.value as PropertyType})}
                                        >
                                          {PROPERTY_TYPES.map(type => (
                                            <option key={type} value={type}>{type.toUpperCase()}</option>
                                          ))}
                                        </select>
                                    </InputWrapper>

                                    {/* Multi-Image Gallery & Management Section */}
                                    <div className="col-span-1 sm:col-span-2 space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-4">Property Gallery Management</p>
                                            
                                            {/* Main Preview / Carousel for Edit Mode */}
                                            {editFormData.images && editFormData.images.length > 0 ? (
                                                <div className="relative h-72 md:h-96 rounded-[2.5rem] overflow-hidden mb-6 bg-zinc-100 dark:bg-zinc-900/50 group border border-white/10 shadow-2xl">
                                                    <AnimatePresence mode="wait">
                                                        <motion.img 
                                                            key={currentImageIndex}
                                                            src={editFormData.images[currentImageIndex]} 
                                                            initial={{ opacity: 0, scale: 1.1 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                            transition={{ duration: 0.4, ease: "circOut" }}
                                                            className="w-full h-full object-cover"
                                                            alt="Current Preview"
                                                        />
                                                    </AnimatePresence>
                                                    
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                                    {editFormData.images.length > 1 && (
                                                        <>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); prevImage(e); }}
                                                                className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 backdrop-blur-xl text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 border border-white/20 active:scale-90"
                                                            >
                                                                <ChevronLeft size={24} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); nextImage(e); }}
                                                                className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 backdrop-blur-xl text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 border border-white/20 active:scale-90"
                                                            >
                                                                <ChevronRight size={24} />
                                                            </button>
                                                        </>
                                                    )}
                                                    
                                                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                        <button 
                                                            onClick={() => removePropertyImage(currentImageIndex)}
                                                            className="p-4 bg-rose-500 text-white rounded-2xl shadow-xl hover:bg-rose-600 active:scale-95 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                                            title="Remove current image"
                                                        >
                                                            <Trash2 size={16} /> Remove
                                                        </button>
                                                    </div>

                                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">
                                                            Image {currentImageIndex + 1} of {editFormData.images.length}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-72 md:h-96 rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center mb-6">
                                                    <ImageIcon className="text-zinc-700 dark:text-zinc-300 mb-4 opacity-20" size={64} />
                                                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">No images uploaded yet</p>
                                                </div>
                                            )}

                                            {/* Upload Trigger */}
                                            <div 
                                                onClick={() => propImagesRef.current?.click()}
                                                className="w-full py-8 rounded-[2rem] bg-blue-600/5 border-2 border-dashed border-blue-600/20 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-600/10 hover:border-blue-600/40 transition-all mb-6 group"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                                                    <Plus size={24} />
                                                </div>
                                                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Upload New Visuals</p>
                                                <p className="text-[9px] font-bold text-zinc-400 mt-1">Supports JPG, PNG (Max 5MB)</p>
                                            </div>
                                            <input 
                                                type="file" 
                                                multiple 
                                                hidden 
                                                ref={propImagesRef} 
                                                accept="image/*" 
                                                onChange={handlePropertyImagesUpload} 
                                            />

                                            {/* Thumbnails Strip */}
                                            {editFormData.images && editFormData.images.length > 0 && (
                                                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                                    {editFormData.images.map((img, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => setCurrentImageIndex(idx)}
                                                            className={`w-24 h-24 rounded-2xl overflow-hidden relative shrink-0 cursor-pointer border-4 transition-all snap-start ${idx === currentImageIndex ? 'border-blue-600 scale-105 shadow-xl shadow-blue-600/20' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'}`}
                                                        >
                                                            <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                                            {idx === currentImageIndex && (
                                                                <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                                                                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <DetailCard icon={MapPin} label="Location" value={selectedProperty.location} />
                                    <DetailCard icon={DollarSign} label="Annual Yield" value={formatCurrency(selectedProperty.rent, settings)} />
                                    <DetailCard icon={Layout} label="Type" value={selectedProperty.type} />
                                    <DetailCard icon={Building} label="Category" value={selectedProperty.category} />
                                    {selectedProperty.rentStartDate && <DetailCard icon={CalendarDays} label="Start" value={formatDate(selectedProperty.rentStartDate, settings)} />}
                                    {selectedProperty.rentExpiryDate && (
                                        <div className={`p-6 bg-zinc-50/50 dark:bg-white/5 rounded-lg border group hover:border-black dark:hover:border-white transition-colors shadow-sm ${
                                            getDaysRemaining(selectedProperty.rentExpiryDate) !== null && getDaysRemaining(selectedProperty.rentExpiryDate)! <= 30 
                                            ? 'bg-amber-500/5 border-amber-500/20' 
                                            : 'border-zinc-100 dark:border-zinc-800'
                                        }`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className={`text-[8px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity ${
                                                    getDaysRemaining(selectedProperty.rentExpiryDate) !== null && getDaysRemaining(selectedProperty.rentExpiryDate)! <= 30 
                                                    ? 'text-zinc-900 dark:text-white underline decoration-zinc-500' 
                                                    : 'text-zinc-500 dark:text-zinc-400'
                                                }`}>Expiry</p>
                                                {getDaysRemaining(selectedProperty.rentExpiryDate) !== null && getDaysRemaining(selectedProperty.rentExpiryDate)! <= 30 ? (
                                                    <AlertTriangle className="w-3.5 h-3.5 text-black dark:text-white animate-pulse" />
                                                ) : (
                                                    <CalendarRange className="w-3.5 h-3.5 text-black dark:text-white" />
                                                )}
                                            </div>
                                            <p className={`text-lg font-black tracking-tight truncate leading-tight ${
                                                getDaysRemaining(selectedProperty.rentExpiryDate) !== null && getDaysRemaining(selectedProperty.rentExpiryDate)! <= 30 
                                                ? 'text-black dark:text-white' 
                                                : 'text-zinc-900 dark:text-white'
                                            }`}>
                                                {formatDate(selectedProperty.rentExpiryDate, settings)}
                                            </p>
                                            {getDaysRemaining(selectedProperty.rentExpiryDate) !== null && getDaysRemaining(selectedProperty.rentExpiryDate)! <= 30 && (
                                                <p className="text-[8px] font-black text-black dark:text-white uppercase mt-1.5 uppercase">
                                                    In {getDaysRemaining(selectedProperty.rentExpiryDate)} days
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {selectedProperty.tenantId && !isEditing && (
                           <div className="p-6 bg-emerald-600/5 border border-emerald-600/20 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <UserCheck size={24} />
                                 </div>
                                 <div>
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Resident</p>
                                    <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                                       {store.users.find(u => u.id === selectedProperty.tenantId)?.name || "Identity Protected"}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest text-right">Expiry</p>
                                 <p className={`text-xs font-black ${
                                     getDaysRemaining(selectedProperty.rentExpiryDate) !== null && getDaysRemaining(selectedProperty.rentExpiryDate)! <= 30 
                                     ? 'text-amber-500' 
                                     : 'text-rose-500'
                                 }`}>
                                     {formatDate(selectedProperty.rentExpiryDate || '', settings)}
                                 </p>
                              </div>
                           </div>
                        )}

                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Info size={12} className="text-black dark:text-white" /> Summary
                            </p>
                            {isEditing ? (
                                <textarea 
                                    className="glass-input w-full h-32 p-4 rounded-lg text-sm font-bold resize-none" 
                                    value={editFormData.description} 
                                    onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                                />
                            ) : (
                                <p className="text-zinc-600 dark:text-zinc-400 font-bold leading-relaxed text-sm border-l-2 border-black dark:border-white pl-4 py-2 bg-zinc-50/50 dark:bg-white/5 rounded-r-lg">
                                    {selectedProperty.description || "Portfolio brief pending submission."}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                            {isEditing ? (
                                <>
                                    <button 
                                        onClick={handleSave} 
                                        disabled={isSaving}
                                        className="flex-[2] bg-zinc-950 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[9px] py-4 rounded-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Update Asset
                                    </button>
                                    <button 
                                        onClick={() => { setIsEditing(false); setEditFormData(selectedProperty); }}
                                        className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-black uppercase tracking-[0.2em] text-[9px] py-4 rounded-lg hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <X size={16} /> Discard
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Agent Actions */}
                                    {(user.role === UserRole.AGENT || user.role === UserRole.ADMIN) && (
                                        <>
                                            {selectedProperty.status !== PropertyStatus.OCCUPIED ? (
                                                 <button 
                                                    onClick={() => setShowTenantPicker(true)}
                                                    className="flex-1 bg-zinc-950 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-[9px] py-4 rounded-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                 >
                                                    <UserPlus size={18} /> Initiate Tenancy
                                                 </button>
                                            ) : (
                                                 <div className="flex flex-col sm:flex-row gap-3 w-full">
                                                     <button 
                                                        onClick={() => setShowMaintenanceList(true)}
                                                        className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 font-black uppercase tracking-[0.2em] text-[9px] py-4 rounded-lg hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                     >
                                                        <Wrench size={18} /> Maintenance
                                                     </button>
                                                     <button 
                                                        onClick={() => setShowNoticeForm(true)}
                                                        className="flex-1 bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-900/10 dark:border-rose-900/30 dark:text-rose-400 font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                     >
                                                        <FileWarning size={18} /> Legal Notice
                                                     </button>
                                                 </div>
                                            )}
                                        </>
                                    )}

                                    {/* Tenant Actions */}
                                    {user.assignedPropertyIds?.includes(selectedProperty.id) && (
                                       <button 
                                          onClick={() => setShowMaintenanceForm(true)}
                                          className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-black uppercase tracking-[0.2em] text-[9px] py-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                                       >
                                          <Wrench size={18} className="lucide-wrench" /> Maintenance Request
                                       </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                  </>
                )}
             </div>
          </div>
        </div>
      )}

      {expandedImage && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-10 animate-in fade-in zoom-in-95 duration-500"
          onClick={() => setExpandedImage(null)}
        >
           <button className="absolute top-10 right-10 p-5 glass-card rounded-full text-white" onClick={() => setExpandedImage(null)}>
              <X size={32} />
           </button>
           <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.4)]" alt="Full Preview" />
        </div>
      )}
    </div>
  );
};

const InputWrapper = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="space-y-2">
        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</p>
        <div className="relative">
          {children}
          {React.isValidElement(children) && children.type === 'select' && (
             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
          )}
        </div>
    </div>
);

const DetailCard = ({ icon: Icon, label, value }: any) => (
  <div className="p-6 bg-zinc-50/50 dark:bg-white/5 rounded-lg border border-zinc-100 dark:border-zinc-800 group hover:border-black dark:hover:border-white transition-colors shadow-sm">
    <div className="flex items-center justify-between mb-3">
        <p className="text-[8px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
        <Icon className="w-3.5 h-3.5 text-black dark:text-white" />
    </div>
    <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight truncate leading-tight uppercase">{value}</p>
  </div>
);

export default Properties;
