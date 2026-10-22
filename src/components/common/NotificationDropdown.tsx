import React, { useState, useEffect, useRef } from 'react';
import { AppNotification, UserRole } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Bell, ShieldAlert, CheckCircle2, UserCheck, BookOpen, X } from 'lucide-react';

interface NotificationDropdownProps {
  userId: string;
  role: UserRole;
  onNavigateSection?: (section: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  userId,
  role,
  onNavigateSection,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 5000);
    return () => clearInterval(timer);
  }, [userId, role]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadNotifications = async () => {
    try {
      const list = await dbService.getNotifications(userId, role);
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkAsRead = async (id: string, linkSection?: string) => {
    await dbService.markNotificationRead(id);
    await loadNotifications();
    if (linkSection && onNavigateSection) {
      onNavigateSection(linkSection);
      setIsOpen(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center animate-bounce shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3.5 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-auto sm:mx-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" /> Notifications ({unreadCount} Unread)
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No notifications at present.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.linkSection)}
                  className={`p-3.5 hover:bg-slate-800/50 cursor-pointer transition-colors text-xs flex items-start gap-3 ${
                    !n.read ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 shrink-0">
                    {n.type === 'safety_alert' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white leading-tight">{n.title}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">{n.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
