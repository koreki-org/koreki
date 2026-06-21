import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Brain, FileSpreadsheet, ShieldCheck, Sparkles, Database } from 'lucide-react';

export const FeatureSubNav: React.FC = () => {
    const router = useRouter();
    const currentPath = router.pathname;

    const navItems = [
        { name: 'Workflow', href: '/features/workflow', icon: <FileSpreadsheet size={16} /> },
        { name: 'Expertise', href: '/features/expertise', icon: <ShieldCheck size={16} /> },
        { name: 'Skills', href: '/features/skills', icon: <Sparkles size={16} /> },
        { name: 'Memory', href: '/features/memory', icon: <Database size={16} /> },
        { name: 'Intelligenz', href: '/features/intelligence', icon: <Brain size={16} /> },
    ];

    return (
        <nav className="sticky top-24 z-[500] pointer-events-none flex justify-center px-4 mb-0">
            <div className="pointer-events-auto glass-morphism rounded-full p-1.5 flex items-center gap-1 shadow-2xl border border-white/20 bg-white/40 backdrop-blur-2xl">
                {navItems.map((item) => {
                    const isActive = currentPath === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300
                                ${isActive 
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
                                }
                            `}
                        >
                            {item.icon}
                            <span className="hidden sm:inline">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};
