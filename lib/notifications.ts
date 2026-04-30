/**
 * Utility to handle browser-level system notifications.
 */

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notifications");
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
};

export const sendSystemNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico', // Fallback icon
        ...options
      });
    } catch (err) {
      console.error("Failed to send system notification:", err);
    }
  }
};
