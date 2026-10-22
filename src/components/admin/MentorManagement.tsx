import React, { useState, useEffect } from 'react';
import { Mentor } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import { UserCheck, Plus, Search, Filter, Mail, Phone, Building2, UserX, Eye, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';

interface MentorManagementProps {
  onSelectMentor: (mentor: Mentor) => void;
  actorId: string;
}

export const MentorManagement: React.FC<MentorManagementProps> = ({ onSelectMentor, actorId }) => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [staffId, setStaffId] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState<{ email: string } | null>(null);

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    setLoading(true);
    try {
      const data = await dbService.getMentors();
      setMentors(data);
    } catch (err) {
      console.error('Error loading mentors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setCreateError('Enter a valid email address.');
      return;
    }

    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length === 0) {
      setCreateError('Phone number is required because it is used as the initial password.');
      return;
    }

    if (!staffId.trim()) {
      setCreateError('Staff / Employee ID is required.');
      return;
    }

    if (!name.trim()) {
      setCreateError('Full name is required.');
      return;
    }

    setSaving(true);

    try {
      const newM = await dbService.createMentor(
        {
          userId: `u_m_${Date.now()}`,
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          department,
          staffId: staffId.trim(),
        },
        actorId
      );

      setCreatedNotice({ email: newM.email });
      setName('');
      setEmail('');
      setPhone('');
      setStaffId('');
      setCreateError(null);
      setIsCreateModalOpen(false);
      await loadMentors();
    } catch (err: any) {
      console.error('Failed to create mentor:', err);
      setCreateError(err.message || 'Mentor account could not be created. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (mentor: Mentor) => {
    if (confirm(`Deactivate mentor ${mentor.name}? The mentor will no longer be able to log in. Historical records and allocated mentees will be preserved.`)) {
      try {
        await dbService.deactivateMentor(mentor.id, actorId);
        await loadMentors();
      } catch (err: any) {
        alert(err.message || 'Mentor could not be deactivated.');
      }
    }
  };

  const handleReactivate = async (mentor: Mentor) => {
    if (confirm(`Reactivate mentor ${mentor.name}? The mentor will be able to log in again using their existing password.`)) {
      try {
        await dbService.reactivateMentor(mentor.id, actorId);
        await loadMentors();
      } catch (err: any) {
        alert(err.message || 'Mentor could not be reactivated.');
      }
    }
  };

  const handleDelete = async (mentor: Mentor) => {
    if (mentor.activeMenteesCount > 0) {
      alert('This mentor currently has allocated students. Reassign students before permanently deleting this mentor.');
      return;
    }

    if (confirm(`Permanently delete mentor ${mentor.name}? This will remove their authentication account and profile. Historical audit logs will be preserved.`)) {
      try {
        await dbService.deleteMentor(mentor.id, actorId);
        await loadMentors();
      } catch (err: any) {
        alert(err.message || 'Mentor could not be deleted.');
      }
    }
  };

  const filteredMentors = mentors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.staffId.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !deptFilter || m.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Institutional Mentor Management</h2>
          <p className="text-xs text-slate-400 mt-1">Manage faculty mentors, departments, and mentee workloads</p>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Mentor
        </button>
      </div>

      {createdNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs space-y-1 relative backdrop-blur-md">
          <button onClick={() => setCreatedNotice(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white text-sm">✕</button>
          <p className="font-bold text-sm text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mentor created successfully.
          </p>
          <p className="mt-1">Initial login credentials:</p>
          <p>Email: <span className="font-mono font-bold text-white">{createdNotice.email}</span></p>
          <p>Temporary password: <span className="font-bold text-white">Registered phone number</span></p>
          <p className="text-[11px] text-slate-400 mt-1">The mentor will be required to create a new password after first login.</p>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mentor name, email, or staff ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Departments</option>
          <option value="Computer Science & Engineering">Computer Science & Engineering</option>
          <option value="Information Science & Engineering">Information Science & Engineering</option>
          <option value="Electronics & Communication">Electronics & Communication</option>
        </select>
      </div>

      {/* Mentors Table */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs font-semibold">Loading institutional mentor records...</div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">No faculty mentors found matching your filters.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 no-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="p-4">Staff ID</th>
                  <th className="p-4">Mentor Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Active Mentees</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredMentors.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-400">{m.staffId}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 font-bold flex items-center justify-center">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{m.name}</p>
                          <p className="text-[11px] text-slate-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-300">{m.department}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          m.status === 'inactive' || (m as any).status === 'deactivated'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                            : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        }`}
                      >
                        {m.status === 'inactive' || (m as any).status === 'deactivated' ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{m.phone || 'N/A'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-bold">
                        {m.activeMenteesCount} Mentees
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectMentor(m)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-bold border border-indigo-500/30 transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>

                      {m.status === 'inactive' || (m as any).status === 'deactivated' ? (
                        <button
                          onClick={() => handleReactivate(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-800/40 transition-all inline-flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivate(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 font-bold border border-amber-800/40 transition-all inline-flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" /> Deactivate
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(m)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold border border-rose-800/40 transition-all inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Mentor Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Faculty Mentor" subtitle="Onboard a new mentor into institutional records">
        <form onSubmit={handleCreateMentor} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Staff / Employee ID</label>
            <input
              type="text"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="e.g. EMP-CS-105"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Alan Turing"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Institutional Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alan.turing@edumentorx.edu"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phone Number <span className="text-amber-400 font-bold">* Required (Initial Password)</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9000000003"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Information Science & Engineering">Information Science & Engineering</option>
              <option value="Electronics & Communication">Electronics & Communication</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all mt-2"
          >
            {saving ? 'Creating Mentor Account...' : 'Confirm Mentor Creation'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
