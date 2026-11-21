import React, { useEffect, useState } from 'react';
import { getCookiePrefs, saveCookiePrefs, openLegal } from '../lib/consent';

/** Shows until the user decides; reopen with window.dispatchEvent(new Event('open-cookie-settings')). */
const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(() => getCookiePrefs() === null);
  const [custom, setCustom] = useState(false);
  const [prefs, setPrefs] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const open = () => {
      const cur = getCookiePrefs();
      setPrefs(cur ? cur.preferences : true);
      setAnalytics(cur ? cur.analytics : false);
      setCustom(true);
      setVisible(true);
    };
    window.addEventListener('open-cookie-settings', open);
    return () => window.removeEventListener('open-cookie-settings', open);
  }, []);

  if (!visible) return null;
  const decide = (p: boolean, a: boolean) => { saveCookiePrefs({ preferences: p, analytics: a }); setVisible(false); setCustom(false); };

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md z-[19000] bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 print:hidden">
      <p className="text-xs font-black uppercase tracking-widest mb-2">Cookies &amp; storage</p>
      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 mb-4">
        We use essential storage to keep you signed in. Optional storage remembers preferences and, if enabled, measures usage.{' '}
        <button onClick={() => openLegal('cookies')} className="underline font-bold">Cookie Policy</button> ·{' '}
        <button onClick={() => openLegal('privacy')} className="underline font-bold">Privacy Policy</button>
      </p>
      {custom && (
        <div className="space-y-3 mb-4 text-xs font-bold">
          <label className="flex items-center gap-3 opacity-60"><input type="checkbox" checked disabled /> Essential (always on)</label>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={prefs} onChange={e => setPrefs(e.target.checked)} /> Preferences (theme)</label>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /> Analytics</label>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {custom ? (
          <button onClick={() => decide(prefs, analytics)} className="flex-1 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest">Save choices</button>
        ) : (
          <>
            <button onClick={() => decide(true, true)} className="flex-1 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest">Accept all</button>
            <button onClick={() => decide(false, false)} className="flex-1 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest">Essential only</button>
            <button onClick={() => setCustom(true)} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white">Customise</button>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
