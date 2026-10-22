import React, { useState, useEffect, useRef } from 'react';
import { AvatarCanvas } from '../ai-avatar/AvatarCanvas';
import { aiService, dbService } from '../../services/serviceFactory';
import { speechService } from '../../services/speechService';
import { AIChatMessage } from '../../services/interfaces/IAIService';
import { Student } from '../../types';
import { Sparkles, Mic, MicOff, Volume2, VolumeX, Send, RefreshCw, Settings, Bot, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';

interface AIMentorSectionProps {
  student: Student;
}

export const AIMentorSection: React.FC<AIMentorSectionProps> = ({ student }) => {
  // Avatar Customization State
  const [avatarName, setAvatarName] = useState('Mentor Astra');
  const [avatarTheme, setAvatarTheme] = useState('#6366f1'); // Indigo
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Chat & Emotion State
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'model',
      text: `Hello ${student.name}! I am ${avatarName}, your AI Academic Assistant. How can I help with your studies, time management, or project goals today?`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [emotion, setEmotion] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'concerned'>('idle');
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, emotion]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    const userMsg: AIChatMessage = { role: 'user', text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);

    setLoading(true);
    setEmotion('thinking');

    try {
      const response = await aiService.chat(text, messages, {
        name: student.name,
        cgpa: student.cgpa,
        attendance: student.attendance,
        studyHours: student.studyHours,
        assignedMentorName: student.mentorName,
        mentorId: student.mentorId || undefined,
        studentId: student.id,
        usn: student.usn,
      });

      setMessages([...updatedHistory, { role: 'model', text: response.text }]);
      setEmotion(response.emotion);

      // If Contextual Safety Engine flagged HIGH_CONCERN or IMMEDIATE_DANGER, log confidential safety alert for mentor
      if (response.safety.isEscalated && student.mentorId) {
        await dbService.createAISafetyAlert({
          studentId: student.id,
          studentName: student.name,
          studentUsn: student.usn,
          mentorId: student.mentorId,
          severity: response.safety.severity,
          triggerMessage: text,
          contextSummary: response.safety.contextSummary,
          confidenceReasoning: response.safety.confidenceReasoning,
        });
      }

      // Audio Spoken Output if not muted
      if (!isMuted && speechService.isSpeechSupported()) {
        setIsSpeakingAudio(true);
        speechService.speak(
          response.text,
          selectedVoice,
          () => setEmotion('speaking'),
          () => {
            setIsSpeakingAudio(false);
            setEmotion('idle');
          }
        );
      } else {
        setTimeout(() => setEmotion('idle'), 3000);
      }
    } catch (err) {
      console.error('AI response error:', err);
      setMessages([
        ...updatedHistory,
        { role: 'model', text: 'I am right here to help you study! What topic would you like to review?' },
      ]);
      setEmotion('idle');
    } finally {
      setLoading(false);
    }
  };

  const toggleMicListening = () => {
    if (isListeningMic) {
      speechService.stopListening();
      setIsListeningMic(false);
      setEmotion('idle');
    } else {
      setIsListeningMic(true);
      setEmotion('listening');
      speechService.startListening({
        onResult: (transcript) => {
          setIsListeningMic(false);
          setInputText(transcript);
          handleSendMessage(transcript);
        },
        onError: (err) => {
          console.error('Speech recognition error:', err);
          setIsListeningMic(false);
          setEmotion('idle');
        },
        onEnd: () => {
          setIsListeningMic(false);
          setEmotion('idle');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Customizer Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{avatarName}</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 rounded-full">
                AI Voice Avatar Assistant
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized guidance powered by Gemini AI • AI Assistant Notice: Not a substitute for human professionals
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCustomizerOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all"
        >
          <Settings className="w-4 h-4 text-indigo-400" /> Customize Avatar
        </button>
      </div>

      {/* Main Avatar & Chat Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 2D Canvas Animated Avatar */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={() => {
                if (isSpeakingAudio) speechService.stopSpeaking();
                setIsMuted(!isMuted);
              }}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>

          <AvatarCanvas emotion={emotion} themeColor={avatarTheme} isSpeaking={isSpeakingAudio} />

          <h3 className="text-lg font-bold text-white mt-4">{avatarName}</h3>
          <p className="text-xs text-slate-400 capitalize mt-0.5">Current State: <span className="text-indigo-400 font-bold">{emotion}</span></p>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={toggleMicListening}
              className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                isListeningMic
                  ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {isListeningMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListeningMic ? 'Listening... (Click to stop)' : 'Talk with Voice Mic'}
            </button>
          </div>
        </div>

        {/* Right Column: Chat History & Input */}
        <div className="lg:col-span-7 flex flex-col h-[500px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          {/* Chat Messages */}
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl space-y-1 ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {m.role === 'user' ? 'You' : avatarName}
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-indigo-400 font-semibold italic text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {avatarName} is formulating response...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${avatarName} about study plans, project code, or time management...`}
              className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Avatar Customizer Modal */}
      <Modal isOpen={isCustomizerOpen} onClose={() => setIsCustomizerOpen(false)} title="Customize Your AI Avatar Mentor">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Avatar Name</label>
            <input
              type="text"
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Theme Accent Color</label>
            <div className="flex gap-3">
              {['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarTheme(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    avatarTheme === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsCustomizerOpen(false)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              Save Customizations
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
