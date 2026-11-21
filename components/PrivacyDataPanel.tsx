import React, { useState } from 'react';
import { toast } from 'sonner';
import { Download, Trash2, ShieldCheck, FileEdit } from 'lucide-react';
import { User } from '../types';
import { getStore } from '../store';
import { submitDataRequest, openLegal } from '../lib/consent';
import { LEGAL } from '../lib/legalConfig';

const PrivacyDataPanel: React.FC<{ user: User }> = ({ user }) => {
  const [busy, setBusy] = useState(false);

  const download = () => {
    const s = getStore();
    const mine = {
      exportedAt: new Date().toISOString(),
      profile: s.users.find(u => u.id === user.id) || user,
      applications: s.applications.filter(a => a.userId === user.id || a.agentId === user.id),
      properties: s.properties.filter(p => p.agentId === user.id || p.tenantId === user.id),
      agreements: s.agreements.filter(a => a.tenantId === user.id || a.agentId === user.id),
      maintenanceTickets: s.tickets.filter((t: any) => t.userId === user.id || t.tenantId === user.id || t.agentId === user.id),
      notifications: s.notifications.filter(n => n.userId === user.id),
      transactions: (s.transactions || []).filter((t: any) => t.userId === user.id || t.user_id === user.id),
    };
    const blob = new Blob([JSON.stringify(mine, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `spaceya-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success('Your data has been downloaded.');
  };

  const request = async (type: 'DELETE_ACCOUNT' | 'CORRECTION') => {
    const msg = type === 'DELETE_ACCOUNT'
      ? 'Request deletion of your account and personal data? We will review it and confirm by email. Some records may have to be kept by law.'
      : 'Send a request to correct your data? Describe the correction in the next box.';
    if (!window.confirm(msg)) return;
    const note = type === 'CORRECTION' ? (window.prompt('What should be corrected?') || '') : '';
    if (type === 'CORRECTION' && !note.trim()) return;
    setBusy(true);
    try {
      await submitDataRequest(user, type, note);
      toast.success('Request submitted. We will respond within 30 days.');
    } catch {
      toast.error(`Could not submit. Please email ${LEGAL.dpoEmail}.`);
    } finally { setBusy(false); }
  };

  const btn = 'flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50';
  return (
    <div className="bg-white dark:bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-900 shadow-xl space-y-5 print:hidden">
      <div className="flex items-center gap-3"><ShieldCheck size={20} /><h3 className="text-lg font-black tracking-tight">Privacy &amp; Data</h3></div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">Your rights under the Nigeria Data Protection Act: access, correction and deletion of your personal data.</p>
      <div className="flex flex-wrap gap-3">
        <button onClick={download} className={`${btn} bg-black text-white dark:bg-white dark:text-black`}><Download size={14} /> Download my data</button>
        <button onClick={() => request('CORRECTION')} disabled={busy} className={`${btn} bg-zinc-100 dark:bg-zinc-900`}><FileEdit size={14} /> Request correction</button>
        <button onClick={() => request('DELETE_ACCOUNT')} disabled={busy} className={`${btn} bg-rose-50 text-rose-600 dark:bg-rose-500/10 hover:bg-rose-600 hover:text-white`}><Trash2 size={14} /> Request account deletion</button>
      </div>
      <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
        <button onClick={() => openLegal('terms')} className="hover:text-black dark:hover:text-white underline">Terms</button>
        <button onClick={() => openLegal('privacy')} className="hover:text-black dark:hover:text-white underline">Privacy</button>
        <button onClick={() => openLegal('cookies')} className="hover:text-black dark:hover:text-white underline">Cookies</button>
        <button onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))} className="hover:text-black dark:hover:text-white underline">Cookie settings</button>
      </div>
    </div>
  );
};

export default PrivacyDataPanel;
