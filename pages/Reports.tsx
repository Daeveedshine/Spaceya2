
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Property, Agreement } from '../types';
import { getStore } from '../store';
import { Download, Search, Phone, Calendar, Building, User as UserIcon, DollarSign, Filter, MoreHorizontal, AlertCircle, Table, MapPin, Tag, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReportsProps {
  user: User;
}

interface ReportRow {
  tenantName: string;
  tenantPhone: string;
  propertyName: string;
  propertyType: string;
  propertyAddress: string;
  rentAmount: number;
  expiryDate: string;
  status: string;
  daysRemaining: number;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const store = getStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const reportData = useMemo(() => {
    // 1. Get properties
    let properties = store.properties;
    if (user.role === UserRole.AGENT) {
      properties = properties.filter(p => p.agentId === user.id);
    }
    
    // 2. Map properties to report rows
    const rows: ReportRow[] = properties.flatMap(property => {
      const assignedTenants = store.users.filter(u => u.role === UserRole.TENANT && u.assignedPropertyIds?.includes(property.id));
      
      if (assignedTenants.length === 0) {
        return [{
          tenantName: 'Vacant',
          tenantPhone: 'N/A',
          propertyName: property.name,
          propertyType: property.type,
          propertyAddress: property.location,
          rentAmount: property.rent || 0,
          expiryDate: 'N/A',
          status: 'Inactive',
          daysRemaining: 999
        }];
      }
      
      return assignedTenants.map(tenant => {
        const agreement = store.agreements.find(a => a.tenantId === tenant.id && a.propertyId === property.id && a.status === 'active');
        
        let daysRemaining = 999;
        const expiryDateStr = agreement?.endDate || property?.rentExpiryDate;
        
        if (expiryDateStr) {
          const expiry = new Date(expiryDateStr);
          const today = new Date();
          daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        let calculatedStatus = 'Active';
        if (daysRemaining <= 0) {
          calculatedStatus = 'Inactive';
        }

        return {
          tenantName: tenant.name,
          tenantPhone: tenant.phone || 'No phone provided',
          propertyName: property.name,
          propertyType: property.type,
          propertyAddress: property.location,
          rentAmount: property.rent || 0,
          expiryDate: expiryDateStr ? new Date(expiryDateStr).toLocaleDateString() : 'N/A',
          status: calculatedStatus,
          daysRemaining
        };
      });
    });

    // 3. Apply search term
    return rows.filter(row => 
      row.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.tenantPhone.includes(searchTerm)
    );
  }, [store, searchTerm, user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(reportData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return reportData.slice(start, start + rowsPerPage);
  }, [reportData, currentPage, rowsPerPage]);

  const handleExport = () => {
    const headers = ['Tenant', 'Phone', 'Property Name', 'Rent Type', 'Address', 'Annual Rent (Naira)', 'Expiry Date'];
    const csvRows = reportData.map(r => `"${r.tenantName}","${r.tenantPhone}","${r.propertyName}","${r.propertyType}","${r.propertyAddress}","${r.rentAmount}","${r.expiryDate}"`);
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPACEYA_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">Tenant Portfolio Sheet</h1>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium text-sm">Consolidated view of {user.role === UserRole.AGENT ? 'your' : 'all'} occupied properties and lease terms.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:opacity-80 active:scale-95"
        >
          <Download className="w-4 h-4 mr-2" /> Export to CSV
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Active Leases</p>
          <p className="text-2xl font-black text-black dark:text-white">{reportData.filter(r => r.status === 'Active').length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Gross Annual Rent</p>
          <p className="text-2xl font-black text-black dark:text-white">₦{reportData.reduce((acc, r) => acc + r.rentAmount, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Expiring Soon (&lt;30d)</p>
          <p className="text-2xl font-black text-black dark:text-white">{reportData.filter(r => r.daysRemaining <= 30 && r.daysRemaining > 0 && r.status === 'Active').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by name, address, or phone..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-black dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center px-6 py-3 text-[10px] font-black text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all uppercase tracking-widest">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-black text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="px-6 py-5"><div className="flex items-center"><UserIcon className="w-3 h-3 mr-2" /> Tenant Name</div></th>
                <th className="px-6 py-5"><div className="flex items-center"><Building className="w-3 h-3 mr-2" /> Property & Type</div></th>
                <th className="px-6 py-5"><div className="flex items-center"><MapPin className="w-3 h-3 mr-2" /> Address</div></th>
                <th className="px-6 py-5"><div className="flex items-center"><Phone className="w-3 h-3 mr-2" /> Contact</div></th>
                <th className="px-6 py-5"><div className="flex items-center">₦ Annual Rent</div></th>
                <th className="px-6 py-5"><div className="flex items-center"><Calendar className="w-3 h-3 mr-2" /> Expiry</div></th>
                <th className="px-6 py-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedData.length > 0 ? paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-black transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-black dark:text-white leading-none">{row.tenantName}</span>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-500 truncate max-w-[150px] uppercase font-black mt-1.5 tracking-widest">ID: {idx + 100}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 leading-none">{row.propertyName}</span>
                      <div className="flex items-center gap-1 mt-1.5 text-zinc-500 dark:text-zinc-500">
                        <Tag className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{row.propertyType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                     <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 truncate max-w-[150px] block" title={row.propertyAddress}>
                        {row.propertyAddress}
                     </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{row.tenantPhone}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-green-600 dark:text-green-500">₦{row.rentAmount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black text-red-600 dark:text-red-500 ${row.daysRemaining <= 30 && row.status === 'Active' ? 'underline underline-offset-4 decoration-red-600 dark:decoration-red-500' : ''}`}>
                        {row.expiryDate}
                      </span>
                      {row.daysRemaining <= 30 && row.daysRemaining > 0 && row.status === 'Active' && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        row.status === 'Active' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 
                        row.status === 'Inactive' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-500' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500'
                      }`}>
                        {row.status}
                      </span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <div className="relative mb-6">
                        <Table size={64} className="text-zinc-300 dark:text-zinc-700" />
                        <Search size={24} className="absolute -bottom-2 -right-2 text-zinc-400 dark:text-zinc-600" />
                      </div>
                      <h3 className="text-lg font-black text-black dark:text-white uppercase tracking-tighter mb-2">No Records Found</h3>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto font-black uppercase tracking-widest leading-relaxed">
                        The global registry contains no active occupancy records matching your current filter parameters or portfolio access.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-zinc-50 dark:bg-black border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center text-[9px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.2em]">
          <span>Showing {Math.min((currentPage - 1) * rowsPerPage + 1, reportData.length)} - {Math.min(currentPage * rowsPerPage, reportData.length)} of {reportData.length}</span>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">Page {currentPage} of {Math.max(1, totalPages)}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span>Generated on {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default Reports;
