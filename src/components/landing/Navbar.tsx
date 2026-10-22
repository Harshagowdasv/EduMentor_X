import React, { useState } from 'react';
import { GraduationCap, Sparkles, LogIn, Menu, X, ArrowRight } from 'lucide-react';
import { isDemoMode } from '../../services/serviceFactory';

interface NavbarProps {
  onOpenLogin: (role?: 'student' | 'mentor' | 'admin') => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin, onNavigateSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    onNavigateSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group" onClick={() => scrollTo('hero')}>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300 shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-sans">
                EduMentor<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">X</span>
              </span>
              {isDemoMode && (
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 rounded-full">
                  Demo
                </span>
              )}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wide">AI-POWERED STUDENT MANAGEMENT</p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <button onClick={() => scrollTo('hero')} className="hover:text-indigo-400 transition-colors">Home</button>
          <button onClick={() => scrollTo('features')} className="hover:text-indigo-400 transition-colors">Features</button>
          <button onClick={() => scrollTo('how-it-works')} className="hover:text-indigo-400 transition-colors">How It Works</button>
          <button onClick={() => scrollTo('ai-mentor')} className="hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-indigo-300">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            AI Mentor
          </button>
          <button onClick={() => scrollTo('about')} className="hover:text-indigo-400 transition-colors">About</button>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => onOpenLogin()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-800"
          >
            <LogIn className="w-4 h-4 text-slate-400" />
            Login
          </button>
          <button
            onClick={() => onOpenLogin('student')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-6 py-6 space-y-4 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-4 text-base font-medium text-slate-300">
            <button onClick={() => scrollTo('hero')} className="text-left py-1 hover:text-indigo-400">Home</button>
            <button onClick={() => scrollTo('features')} className="text-left py-1 hover:text-indigo-400">Features</button>
            <button onClick={() => scrollTo('how-it-works')} className="text-left py-1 hover:text-indigo-400">How It Works</button>
            <button onClick={() => scrollTo('ai-mentor')} className="text-left py-1 hover:text-purple-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> AI Mentor
            </button>
            <button onClick={() => scrollTo('about')} className="text-left py-1 hover:text-indigo-400">About</button>
          </nav>
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
              className="w-full py-3 text-center rounded-xl font-semibold text-slate-200 bg-slate-900 border border-slate-800"
            >
              Login
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLogin('student'); }}
              className="w-full py-3 text-center rounded-xl font-semibold text-white bg-indigo-600 shadow-lg shadow-indigo-600/30"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
