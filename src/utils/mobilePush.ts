// Helper for reliable mobile push notifications, audio chime, and haptic vibration

let swRegistration: ServiceWorkerRegistration | null = null;
let audioContextUnlocked = false;
let globalAudioCtx: AudioContext | null = null;

// Register service worker on startup
export function initMobileServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        swRegistration = reg;
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  }
}

// Unlock Web Audio context on mobile user gesture (touchstart, click, pointerdown)
export function unlockAudioContext() {
  if (audioContextUnlocked) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!globalAudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume().then(() => {
          audioContextUnlocked = true;
        });
      } else {
        audioContextUnlocked = true;
      }
    }
  } catch {
    // Ignore
  }
}

// Auto-attach touch listener once
if (typeof window !== 'undefined') {
  const handleFirstTouch = () => {
    unlockAudioContext();
    window.removeEventListener('touchstart', handleFirstTouch);
    window.removeEventListener('click', handleFirstTouch);
  };
  window.addEventListener('touchstart', handleFirstTouch, { passive: true });
  window.addEventListener('click', handleFirstTouch, { passive: true });
}

// Play pleasant chime with Web Audio API
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = globalAudioCtx || new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.75);
  } catch {
    // Autoplay restrictions
  }
}

// Mobile Haptic Vibration
export function triggerHapticVibration(pattern: number[] = [200, 100, 200, 100, 300]) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibrate not permitted
    }
  }
}

// Dispatch phone notification
export async function sendMobileClassNotification({
  title,
  body,
  tag,
  data,
}: {
  title: string;
  body: string;
  tag?: string;
  data?: any;
}) {
  // 1. Trigger mobile haptic
  triggerHapticVibration([250, 100, 250]);

  // 2. Play chime
  playNotificationChime();

  // 3. Try ServiceWorker showNotification first (essential on Android & iOS PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          tag: tag || 'class-reminder',
          icon: '/icon.svg',
          badge: '/icon.svg',
          data,
          requireInteraction: true,
          silent: false,
        } as NotificationOptions);
        return true;
      }
    } catch (err) {
      console.warn('Service worker notification failed, trying standard Notification API:', err);
    }
  }

  // 4. Standard Notification API fallback
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: tag || 'class-reminder',
        icon: '/icon.svg',
      });
      return true;
    } catch (err) {
      console.warn('Standard Notification failed:', err);
    }
  }

  return false;
}
