import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { hasCurrentConsent, recordConsent, openLegal } from '../lib/consent';
import { LEGAL } from '../lib/legalConfig';

/** Blocks the app until the signed-in user has accepted the current Terms/Privacy version. */
const ConsentGate: React.FC<{ user: User; onDecline: () => void }> = ({ user, onDecline }) => {
  const [needed, setNeeded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    hasCurrentConsent(user.id).then(ok => { if (live) setNeeded(!ok); });
    return () => { live = false; };
  }, [user.id]);

  if (!needed) return null;
  const accept = async () => {
    setBusy(true); setErr('');
    try { await recordConsent(user.id); setNeeded(false); }
    catch { setErr('Could not save your acceptance. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[21000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
      <div role="dialog" aria-modal="true" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white max-w-md w-full rounded-[2rem] p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-5">
        <h2 className="text-xl font-black tracking-tight">Terms &amp; Privacy</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Please review and accept our terms to continue using {LEGAL.brandName} (version {LEGAL.version}).</p>
        <label className="flex items-start gap-3 text-sm font-bold cursor-pointer">
          <input type="checkbox" className="mt-1" checked={checked} onChange={e => setChecked(e.target.checked)} />
          <span>I have read and agree to the{' '}
            <button type="button" onClick={() => openLegal('terms')} className="underline">Terms of Service</button> and{' '}
            <button type="button" onClick={() => openLegal('privacy')} className="underline">Privacy Policy</button>.</span>
        </label>
        {err && <p className="text-xs font-bold text-rose-500">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onDecline} className="flex-1 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest">Sign out</button>
          <button onClick={accept} disabled={!checked || busy} className="flex-[2] py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40">{busy ? 'Saving…' : 'Accept & continue'}</button>
        </div>
      </div>
    </div>
  );
};

export default ConsentGate;
