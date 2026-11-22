import React from 'react';
import { Building2, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

export type SignupRole = 'AGENT' | 'TENANT';

interface RoleChoiceProps {
  onChoose: (role: SignupRole) => void;
}

const OPTIONS: {
  role: SignupRole;
  title: string;
  icon: React.ReactNode;
  summary: string;
  points: string[];
  cta: string;
}[] = [
  {
    role: 'AGENT',
    title: "I'm a property agent",
    icon: <Building2 size={28} />,
    summary: 'I list and manage rental properties for landlords or clients.',
    points: ['List and manage your properties', 'Screen tenant applications', 'Track rent, agreements and maintenance'],
    cta: 'Continue as an agent',
  },
  {
    role: 'TENANT',
    title: "I'm a Tenant",
    icon: <KeyRound size={28} />,
    summary: 'I want to rent a property and apply through an agent.',
    points: ['Browse and apply for properties', 'Track your application status', 'View your agreement, and requests'],
    cta: 'Continue as a tenant',
  },
];

const RoleChoice: React.FC<RoleChoiceProps> = ({ onChoose }) => (
  <div className="min-h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center p-6">
    <div className="w-full max-w-4xl space-y-10 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Welcome to SPACEYA</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">Let's get you set up.</h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Tell us how you'll use SPACEYA so we can show you the right tools. Choose the option that fits you best.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {OPTIONS.map(opt => (
          <button
            key={opt.role}
            onClick={() => onChoose(opt.role)}
            className="group text-left bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl transition-all hover:-translate-y-1 active:scale-[0.99] flex flex-col gap-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
              {opt.icon}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">{opt.title}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{opt.summary}</p>
            </div>
            <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {opt.points.map(p => (
                <li key={p} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black dark:bg-white shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
              <span>{opt.cta}</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-zinc-500 text-center">
        <ShieldCheck size={14} className="shrink-0" />
        Your account type can't be changed after you sign up, so pick the one that matches you.
      </p>
    </div>
  </div>
);

export default RoleChoice;
