// Notification system with graceful fallbacks
// Default schedule (user can edit): 9 AM morning brief, 2 PM mid-day check, 9 PM wind-down

export const DEFAULT_REMINDERS = [
  { id: 'morning', time: '09:00', title: '☀️ Morning Brief', body: 'Start your day. Check today\'s Scaler lectures + skill tasks.' },
  { id: 'midday',  time: '14:00', title: '⚡ Midday Checkpoint', body: 'How\'s progress? Knock out job applications + SQL practice.' },
  { id: 'evening', time: '20:30', title: '🔥 Streak At Risk', body: 'Complete your tasks before midnight to keep the streak alive.' },
  { id: 'reset',   time: '23:30', title: '⏰ Last Call', body: 'Day ends in 30 min. Lock in your Perfect Day.' },
];

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { granted: false, reason: 'unsupported' };
  }
  if (Notification.permission === 'granted') return { granted: true };
  if (Notification.permission === 'denied') {
    return { granted: false, reason: 'denied' };
  }
  const result = await Notification.requestPermission();
  return { granted: result === 'granted', reason: result };
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.error('SW registration failed', e);
    return null;
  }
}

// Browser-side scheduler. Uses setTimeout while tab is open;
// also schedules via SW message for background resilience.
let scheduledTimers = [];

export function scheduleDailyReminders(reminders) {
  // Clear previous timers
  scheduledTimers.forEach(t => clearTimeout(t));
  scheduledTimers = [];

  if (Notification.permission !== 'granted') return;

  const now = new Date();
  reminders.forEach(r => {
    const [hh, mm] = r.time.split(':').map(Number);
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;

    // Schedule via setTimeout (works while tab open)
    const timer = setTimeout(() => {
      showNotification(r.title, r.body);
      // Reschedule for next day
      scheduleDailyReminders(reminders);
    }, delay);
    scheduledTimers.push(timer);
  });
}

export function showNotification(title, body) {
  if (Notification.permission !== 'granted') return;
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'tracker-reminder',
        });
      });
    } else {
      new Notification(title, { body, icon: '/icon-192.png' });
    }
  } catch (e) {
    console.error('Notification failed', e);
  }
}

// Test notification (for the "Test" button in settings)
export function sendTestNotification() {
  showNotification('🎯 Test notification', 'Notifications are working. Keep the streak alive!');
}
