import React from 'react';
import { QuoteRotator } from './QuoteRotator';
import { ArrowRight, ShieldCheck, Sparkles, Users, Cpu, TrendingUp } from 'lucide-react';

interface HeroSectionProps {
  onOpenLogin: (role?: 'student' | 'mentor' | 'admin') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenLogin }) => {
  return (
    <section id="hero" className="relative pt-12 pb-24 overflow-hidden border-b border-slate-800/60">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-10 right-10 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Quote Banner */}
          <div className="mb-6">
            <QuoteRotator />
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white font-sans leading-[1.15] sm:leading-[1.1]">
            Smarter Mentorship.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-sky-400">
              Stronger Students.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
            EduMentorX connects students, mentors, and administrators in one unified platform — featuring intelligent allocation, permanent mentorship logs, explainable risk analytics, and an AI avatar mentor.
          </p>

          {/* Call to Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => onOpenLogin()}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 shadow-2xl shadow-indigo-600/40 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onOpenLogin('admin')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-slate-200 hover:text-white bg-slate-900/90 border border-slate-800 hover:border-slate-700 backdrop-blur-md transition-all hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Institutional Admin Login
            </button>
          </div>

          {/* Quick Demo Access Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-400">Instant Demo Access:</span>
            <button
              onClick={() => onOpenLogin('admin')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors"
            >
              👑 Login as Admin
            </button>
            <button
              onClick={() => onOpenLogin('mentor')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:text-purple-300 transition-colors"
            >
              👨‍🏫 Login as Mentor
            </button>
            <button
              onClick={() => onOpenLogin('student')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:text-sky-300 transition-colors"
            >
              🎓 Login as Student
            </button>
          </div>
        </div>

        {/* Dynamic Graphic Dashboard Mockup Preview */}
        <div className="mt-16 relative mx-auto max-w-5xl">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 opacity-20 blur-xl"></div>
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl p-4 sm:p-6 md:p-8 backdrop-blur-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Card 1 */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Total Active Mentees</p>
                  <p className="text-2xl font-bold text-white mt-1">1,420</p>
                  <span className="text-[11px] text-emerald-400 font-semibold">100% Allocated</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Good Standing</p>
                  <p className="text-2xl font-bold text-white mt-1">82.4%</p>
                  <span className="text-[11px] text-slate-400 font-medium">CGPA &gt; 7.5</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/50">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">AI Avatar Sessions</p>
                  <p className="text-2xl font-bold text-white mt-1">4,890</p>
                  <span className="text-[11px] text-purple-300 font-medium">Real-time Voice & STT</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/50">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Safety Risk Escalation</p>
                  <p className="text-2xl font-bold text-white mt-1">0.8%</p>
                  <span className="text-[11px] text-rose-300 font-semibold">Confidential Alerts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
