import React from 'react';
import { User } from '../types';
import { FileText, Sparkles, ShieldCheck, PenTool, Lock } from 'lucide-react';

interface AgreementsProps {
  user: User;
}

const Agreements: React.FC<AgreementsProps> = ({ user }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-700 pb-20">
      <div className="relative">
        <div className="absolute inset-0 bg-black blur-[100px] opacity-10 animate-pulse-gentle"></div>
        <div className="relative bg-white dark:bg-zinc-900 p-10 md:p-14 rounded-[4rem] border border-black dark:border-white shadow-2xl">
          <div className="bg-black dark:bg-white p-6 rounded-[2.5rem] w-fit mx-auto mb-10 border border-black dark:border-white">
            <FileText size={64} className="text-white dark:text-black" />
          </div>
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-black dark:border-white mb-4">
              <Sparkles size={12} /> Feature Development
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">Legal Core Coming Soon</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-md mx-auto leading-relaxed">
              We are finalizing the security protocols for our digital lease engine. Soon, you'll be able to generate, sign, and store legally binding agreements directly in the suite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <FeaturePreview icon={PenTool} label="Digital Signatures" />
            <FeaturePreview icon={ShieldCheck} label="Smart Contracts" />
            <FeaturePreview icon={Lock} label="Encrypted Vault" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Proprietary Technology v2.0</p>
      </div>
    </div>
  );
};

const FeaturePreview = ({ icon: Icon, label }: { icon: any, label: string }) => (
  <div className="p-6 bg-offwhite dark:bg-black/40 rounded-3xl border border-zinc-50 dark:border-zinc-800 flex flex-col items-center gap-3 group transition-all hover:border-black dark:hover:border-white">
    <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors shadow-sm">
      <Icon size={20} />
    </div>
    <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{label}</span>
  </div>
);

export default Agreements;