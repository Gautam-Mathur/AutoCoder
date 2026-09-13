'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Terminal,
  Activity,
  HeartPulse,
  Settings,
  BookOpen,
  HelpCircle,
  Plus,
  Rocket,
  CheckCircle,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { activeId, setActiveId, ollamaConnected } = useApp();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workspace', path: activeId ? `/workspace?id=${activeId}` : '/workspace', icon: Terminal },
    { name: 'Telemetry', path: '/telemetry', icon: Activity },
    { name: 'Health', path: '/health', icon: HeartPulse },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="bg-slate-900 border-r border-slate-700 w-sidebar-width flex-shrink-0 flex flex-col z-40 h-full hidden md:flex">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-700 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            ollamaConnected
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
              : 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
          }`}>
            {ollamaConnected ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Rocket className="w-4 h-4 animate-pulse" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-on-surface">Project Alpha</div>
            <div className={`text-xs font-semibold ${ollamaConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
              {ollamaConnected ? 'Ollama Online' : 'Ollama Offline'}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            // Reset active project and route to landing
            setActiveId(null);
            window.location.href = '/';
          }}
          className="w-full mt-2 bg-electric-indigo text-white py-2 rounded text-xs font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 p-3 text-xs font-bold transition-all rounded ${
                isActive
                  ? 'text-on-surface bg-slate-800 border-r-2 border-electric-indigo shadow-[0_0_8px_rgba(129,140,248,0.2)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-on-surface'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-electric-indigo' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Nav */}
      <div className="border-t border-slate-700 p-2 flex flex-col gap-1">
        <Link
          href="/docs"
          className="text-slate-400 flex items-center gap-3 p-3 text-xs font-semibold hover:bg-slate-800/50 hover:text-on-surface transition-colors rounded"
        >
          <BookOpen className="w-4 h-4" /> Documentation
        </Link>
        <Link
          href="/support"
          className="text-slate-400 flex items-center gap-3 p-3 text-xs font-semibold hover:bg-slate-800/50 hover:text-on-surface transition-colors rounded"
        >
          <HelpCircle className="w-4 h-4" /> Support
        </Link>
      </div>
    </aside>
  );
}
