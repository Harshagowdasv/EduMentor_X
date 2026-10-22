import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { clearLoginStageMetrics } from '../../utils/loginPerfLogger';
import { ShieldCheck, UserCheck, GraduationCap, ArrowRight, Lock, Mail, Sparkles, User } from 'lucide-react';

interface RoleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'student',
}) => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoMentors = [
    { name: 'Dr. Sarah Jenkins', email: 'mentor.sarah@edumentorx.edu', phone: '+1 (555) 234-5678' },
    { name: 'Prof. Rajesh Kumar', email: 'mentor.rajesh@edumentorx.edu', phone: '+1 (555) 876-5432' },
    { name: 'Dr. Elena Rostova', email: 'mentor.elena@edumentorx.edu', phone: '+1 (555) 456-7890' },
    { name: 'Rahul Mehta', email: 'mentor.rahul@edumentorx.edu', phone: '9876543002' },
    { name: 'Priya Nair', email: 'mentor.priya@edumentorx.edu', phone: '9876543003' },
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    clearLoginStageMetrics();

    try {
      await login({
        email: email || getDefaultEmail(selectedRole),
        password: password || 'password123',
        role: selectedRole,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (targetEmail: string, role: UserRole) => {
    setError('');
    setLoading(true);
    setSelectedRole(role);
    setEmail(targetEmail);
    clearLoginStageMetrics();

    try {
      await login({
        email: targetEmail,
        password: 'password123',
        role,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultEmail = (role: UserRole) => {
    if (role === 'admin') return 'admin@edumentorx.edu';
    if (role === 'mentor') return 'mentor.sarah@edumentorx.edu';
    return 'student.alex@edumentorx.edu';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="EduMentorX Portal Login" subtitle="Select your institutional role and authenticate" maxWidth="xl">
      <div className="space-y-6">
        {/* Role Selection Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Student Card */}
          <button
            type="button"
            onClick={() => { setSelectedRole('student'); setEmail(''); setError(''); }}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col items-center sm:items-start text-center sm:text-left ${
              selectedRole === 'student'
                ? 'bg-sky-950/70 border-sky-500 shadow-lg shadow-sky-500/20 ring-1 ring-sky-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`p-2.5 rounded-xl mb-3 ${selectedRole === 'student' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-white">Student</h4>
            <p className="text-[11px] text-slate-400 mt-1 hidden sm:block">Access mentor updates & AI avatar</p>
          </button>

          {/* Mentor Card */}
          <button
            type="button"
            onClick={() => { setSelectedRole('mentor'); setEmail(''); setError(''); }}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col items-center sm:items-start text-center sm:text-left ${
              selectedRole === 'mentor'
                ? 'bg-purple-950/70 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`p-2.5 rounded-xl mb-3 ${selectedRole === 'mentor' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-white">Faculty Mentor</h4>
            <p className="text-[11px] text-slate-400 mt-1 hidden sm:block">Monitor mentees & AI safety alerts</p>
          </button>

          {/* Admin Card */}
          <button
            type="button"
            onClick={() => { setSelectedRole('admin'); setEmail(''); setError(''); }}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col items-center sm:items-start text-center sm:text-left ${
              selectedRole === 'admin'
                ? 'bg-amber-950/70 border-amber-500 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`p-2.5 rounded-xl mb-3 ${selectedRole === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-white">Administrator</h4>
            <p className="text-[11px] text-slate-400 mt-1 hidden sm:block">Manage CSV import & allocations</p>
          </button>
        </div>

        {/* Quick Mentor Selector Chips */}
        {selectedRole === 'mentor' && (
          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/80 space-y-2">
            <span className="text-xs font-bold text-purple-300 block">Select Faculty Mentor Account:</span>
            <div className="flex flex-wrap gap-2">
              {demoMentors.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickDemoLogin(m.email, 'mentor')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-800/60 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <User className="w-3 h-3 text-purple-400" />
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Demo Login Preset Bar */}
        {selectedRole !== 'mentor' && (
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Quick Demo Auth:</span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin(getDefaultEmail(selectedRole), selectedRole)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all"
            >
              Direct Login as {selectedRole.toUpperCase()}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Main Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Institutional Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={getDefaultEmail(selectedRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password or mentor phone number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : `Login to ${selectedRole.toUpperCase()} Portal`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Modal>
  );
};
