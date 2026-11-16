import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  ClassReminderItem,
  getTodaysScheduledClasses,
  getActiveReminders,
} from '../utils/reminderEngine';
import {
  initMobileServiceWorker,
  sendMobileClassNotification,
  playNotificationChime,
  triggerHapticVibration,
  unlockAudioContext,
} from '../utils/mobilePush';

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

const VALID_LEAD_MINUTES = [5, 10, 15, 30];

function readPreference(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the feature usable when browser storage is disabled or full.
  }
}

function readDismissedIds(): string[] {
  try {
    const saved = readPreference(STORAGE_KEYS.DISMISSED);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
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
    const saved = readPreference(STORAGE_KEYS.ENABLED);
    return saved !== null ? saved === 'true' : true;
  });

  const [leadMinutes, setLeadMinutesState] = useState<number>(() => {
    const saved = Number(readPreference(STORAGE_KEYS.LEAD_MINUTES));
    return VALID_LEAD_MINUTES.includes(saved) ? saved : 15;
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = readPreference(STORAGE_KEYS.SOUND);
    return saved !== null ? saved === 'true' : true;
  });

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [dismissedIds, setDismissedIds] = useState<string[]>(readDismissedIds);

  const [activeReminders, setActiveReminders] = useState<ClassReminderItem[]>([]);
  const [todaysClasses, setTodaysClasses] = useState<ClassReminderItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [testReminder, setTestReminder] = useState<ClassReminderItem | null>(null);

  const notifiedClassIdsRef = useRef<Set<string>>(new Set());

  // Initialize mobile service worker on mount
  useEffect(() => {
    initMobileServiceWorker();
  }, []);

  const setNotificationsEnabled = (val: boolean) => {
    setNotificationsEnabledState(val);
    writePreference(STORAGE_KEYS.ENABLED, String(val));
    unlockAudioContext();
    if (val && permission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        void Notification.requestPermission().then((nextPermission) => setPermission(nextPermission)).catch(() => {});
      } catch {
        // Permission prompts are not available in every browser context.
      }
    }
  };

  const setLeadMinutes = (mins: number) => {
    const next = VALID_LEAD_MINUTES.includes(mins) ? mins : 15;
    setLeadMinutesState(next);
    writePreference(STORAGE_KEYS.LEAD_MINUTES, String(next));
  };

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val);
    writePreference(STORAGE_KEYS.SOUND, String(val));
    if (val) unlockAudioContext();
  };

  const requestPermission = useCallback(async () => {
    unlockAudioContext();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        if (res === 'granted') {
          triggerHapticVibration([100, 50, 100]);
        }
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  const dismissReminder = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = [...new Set([...prev, id])].slice(-100);
      writePreference(STORAGE_KEYS.DISMISSED, JSON.stringify(next));
      return next;
    });
  }, []);

  const triggerTestReminder = useCallback(() => {
    unlockAudioContext();
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

    if (notificationsEnabled) {
      void sendMobileClassNotification({
        title: `🔔 Class Reminder: ${testItem.courseTitle}`,
        body: `Room: ${testItem.room} • Starts in 15 mins (${testItem.startTime})`,
        tag: testItem.id,
        playSound: soundEnabled,
        vibrate: true,
      }).catch(() => {});
    } else {
      if (soundEnabled) playNotificationChime();
      triggerHapticVibration([200, 100, 200, 100, 300]);
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

          void sendMobileClassNotification({
            title: `🔔 Class in ${item.startsInMinutes > 0 ? `${item.startsInMinutes}m` : 'moments'}: ${item.courseTitle}`,
            body: `Room: ${item.room} • Starts at ${item.startTime}\n${item.faculty || ''}`,
            tag: item.id,
            playSound: soundEnabled,
            vibrate: true,
          }).catch(() => {});
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

