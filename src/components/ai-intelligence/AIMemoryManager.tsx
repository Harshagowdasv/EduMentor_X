import React, { useState, useEffect } from 'react';
import { AIMemoryItem, Student } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import { Brain, Trash2, Plus, Lock, CheckCircle2, Shield } from 'lucide-react';

interface AIMemoryManagerProps {
  student: Student;
}

export const AIMemoryManager: React.FC<AIMemoryManagerProps> = ({ student }) => {
  const [memories, setMemories] = useState<AIMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<AIMemoryItem['category']>('career');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMemories();
  }, [student.id]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const list = await dbService.getAIMemories(student.id);
      setMemories(list);
    } catch (err) {
      console.error('Failed to load AI memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !value) return;
    setSaving(true);

    try {
      await dbService.saveAIMemory({
        studentId: student.id,
        key,
        value,
        category,
        approvedByStudent: true,
      });
      setIsModalOpen(false);
      setKey('');
      setValue('');
      await loadMemories();
    } catch (err) {
      console.error('Failed to save AI memory:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    await dbService.deleteAIMemory(memoryId);
    await loadMemories();
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/80 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Controlled AI Mentor Memory & Personal Preferences
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Private student-approved memory used strictly to personalize your AI study conversations
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Memory Preference
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Privacy Guarantee</strong>: AI Memory is confidential to you. It is never automatically shared with faculty mentors or third parties.
        </span>
      </div>

      {/* Memories List */}
      {loading ? (
        <div className="p-4 text-center text-xs text-slate-400">Loading memory parameters...</div>
      ) : memories.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
          No custom AI memory items set. Click "Add Memory Preference" above to customize AI interactions.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {memories.map((mem) => (
            <div key={mem.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-purple-950 text-purple-300 border border-purple-800">
                  {mem.category}
                </span>
                <p className="font-bold text-white mt-1">{mem.key}</p>
                <p className="text-slate-300 text-xs mt-0.5 font-medium">"{mem.value}"</p>
              </div>

              <button
                onClick={() => handleDeleteMemory(mem.id)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Student-Approved AI Memory">
        <form onSubmit={handleAddMemory} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            >
              <option value="career">Career Target</option>
              <option value="academic">Academic Focus</option>
              <option value="study_preference">Study Schedule Preference</option>
              <option value="weakness">Topic Needing Practice</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Memory Parameter Name</label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. Target Career Goal or Preferred Study Hours"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Memory Value</label>
            <input
              type="text"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. Full-Stack Cloud Architect or Evening 6 PM - 9 PM"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">
              {saving ? 'Saving...' : 'Save AI Memory'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
