import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  ClassReminderItem,
  getTodaysScheduledClasses,
  getActiveReminders,
  formatCountdown,
} from '../utils/reminderEngine';

interface NotificationContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  leadMinutes: number;
  setLeadMinutes: (mins: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  activeReminders: ClassReminderItem[];
  todaysClasses: ClassReminderItem[];
  dismissedIds: string[];
  dismissReminder: (id: string) => void;
  triggerTestReminder: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  testReminder: ClassReminderItem | null;
  dismissTestReminder: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ENABLED: 'ledger_reminder_enabled',
  LEAD_MINUTES: 'ledger_reminder_lead_mins',
  SOUND: 'ledger_reminder_sound',
  DISMISSED: 'ledger_reminder_dismissed',
};

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // First tone (E5: 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Second tone (B5: 987.77Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.75);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function NotificationProvider({
  children,
  schedule = [],
  calendar,
}: {
  children: React.ReactNode;
  schedule?: any[];
  calendar?: any;
}) {
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ENABLED);
    return saved !== null ? saved === 'true' : true;
  });

  const [leadMinutes, setLeadMinutesState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEAD_MINUTES);
    return saved ? parseInt(saved, 10) : 15;
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
    return saved !== null ? saved === 'true' : true;
  });

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISMISSED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeReminders, setActiveReminders] = useState<ClassReminderItem[]>([]);
  const [todaysClasses, setTodaysClasses] = useState<ClassReminderItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [testReminder, setTestReminder] = useState<ClassReminderItem | null>(null);

  const notifiedClassIdsRef = useRef<Set<string>>(new Set());

  const setNotificationsEnabled = (val: boolean) => {
    setNotificationsEnabledState(val);
    localStorage.setItem(STORAGE_KEYS.ENABLED, String(val));
    if (val && permission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then((p) => setPermission(p));
    }
  };

  const setLeadMinutes = (mins: number) => {
    setLeadMinutesState(mins);
    localStorage.setItem(STORAGE_KEYS.LEAD_MINUTES, String(mins));
  };

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val);
    localStorage.setItem(STORAGE_KEYS.SOUND, String(val));
  };

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  const dismissReminder = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem(STORAGE_KEYS.DISMISSED, JSON.stringify(next));
      return next;
    });
  }, []);

  const triggerTestReminder = useCallback(() => {
    const testItem: ClassReminderItem = {
      id: 'test_class_reminder_' + Date.now(),
      courseCode: '18CSC302J',
      courseTitle: 'Compiler Design',
      room: 'TP-401 (Tech Park)',
      startTime: '08:50 AM',
      endTime: '09:40 AM',
      faculty: 'Dr. S. K. Raman',
      slotType: 'Theory Lecture',
      slotName: 'A1 / C1',
      startMinutes: 530,
      endMinutes: 580,
      startsInMinutes: 15,
      startsInSeconds: 900,
      formattedStartsIn: '15m 00s',
      isOngoing: false,
      dayLabel: 'Day 1',
      dayOrder: 1,
    };

    setTestReminder(testItem);

    if (soundEnabled) {
      playChime();
    }

    if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🔔 Class Reminder: ${testItem.courseTitle}`, {
          body: `Room: ${testItem.room} • Starts in 15 mins (${testItem.startTime})`,
          icon: '/icon.svg',
          tag: testItem.id,
        });
      } catch {
        // Ignore notification errors in iframe/sandboxed environments
      }
    }
  }, [soundEnabled, notificationsEnabled]);

  const dismissTestReminder = () => {
    setTestReminder(null);
  };

  // Periodic reminder checker (updates every second for real-time live countdown)
  useEffect(() => {
    const checkSchedule = () => {
      const allToday = getTodaysScheduledClasses(schedule, calendar);
      setTodaysClasses(allToday);

      if (!notificationsEnabled) {
        setActiveReminders([]);
        return;
      }

      const active = getActiveReminders(schedule, calendar, leadMinutes);
      // Filter out dismissed reminders
      const unDismissed = active.filter((r) => !dismissedIds.includes(r.id));
      setActiveReminders(unDismissed);

      // Trigger push & audio for newly entered reminders
      unDismissed.forEach((item) => {
        if (!notifiedClassIdsRef.current.has(item.id)) {
          notifiedClassIdsRef.current.add(item.id);

          if (soundEnabled) {
            playChime();
          }

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`🔔 Class in ${item.startsInMinutes > 0 ? `${item.startsInMinutes}m` : 'moments'}: ${item.courseTitle}`, {
                body: `Room: ${item.room} • Starts at ${item.startTime}\n${item.faculty || ''}`,
                icon: '/icon.svg',
                tag: item.id,
              });
            } catch {
              // Ignore
            }
          }
        }
      });
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 1000);
    return () => clearInterval(interval);
  }, [schedule, calendar, notificationsEnabled, leadMinutes, soundEnabled, dismissedIds]);

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        setNotificationsEnabled,
        leadMinutes,
        setLeadMinutes,
        soundEnabled,
        setSoundEnabled,
        permission,
        requestPermission,
        activeReminders,
        todaysClasses,
        dismissedIds,
        dismissReminder,
        triggerTestReminder,
        isDrawerOpen,
        setIsDrawerOpen,
        testReminder,
        dismissTestReminder,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
