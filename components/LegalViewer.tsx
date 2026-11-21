import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LegalDoc } from '../lib/legalConfig';
import { Terms, Privacy, Cookies } from './LegalContent';

const TITLES: Record<LegalDoc, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
};

const fromHash = (): LegalDoc | null => {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  return h === 'terms' || h === 'privacy' || h === 'cookies' ? h : null;
};

/** Modal viewer reachable from anywhere (logged out too): openLegal('terms') or #terms in the URL. */
const LegalViewer: React.FC = () => {
  const [doc, setDoc] = useState<LegalDoc | null>(fromHash());

  useEffect(() => {
    const onOpen = (e: Event) => setDoc((e as CustomEvent).detail as LegalDoc);
    const onHash = () => setDoc(fromHash());
    window.addEventListener('open-legal', onOpen);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('open-legal', onOpen);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const close = () => {
    setDoc(null);
    if (fromHash()) history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  if (!doc) return null;
  return (
    <div className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[doc]}
        className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white w-full max-w-3xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col border border-zinc-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(TITLES) as LegalDoc[]).map(k => (
              <button
                key={k}
                onClick={() => setDoc(k)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${doc === k ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-black dark:hover:text-white'}`}
              >
                {TITLES[k]}
              </button>
            ))}
          </div>
          <button onClick={close} aria-label="Close" className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:opacity-70"><X size={18} /></button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto">
          <h2 className="text-2xl font-black tracking-tight mb-4">{TITLES[doc]}</h2>
          {doc === 'terms' && <Terms />}
          {doc === 'privacy' && <Privacy />}
          {doc === 'cookies' && <Cookies />}
        </div>
      </div>
    </div>
  );
};

export default LegalViewer;
