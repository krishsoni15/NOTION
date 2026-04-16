/**
 * Notification Utilities
 * 
 * Helper functions for managing notifications in the chat system.
 */

import { toast } from "sonner";

/**
 * Show a notification for a new message
 */
export function notifyNewMessage(senderName: string, message: string) {
  toast.info(`New message from ${senderName}`, {
    description: message.length > 50 ? `${message.substring(0, 50)}...` : message,
    duration: 4000,
  });
}

/**
 * Show a notification for connection status
 */
export function notifyConnectionStatus(isOnline: boolean) {
  if (isOnline) {
    toast.success("Connected", {
      description: "You are now online",
      duration: 2000,
    });
  } else {
    toast.error("Disconnected", {
      description: "You are now offline",
      duration: 2000,
    });
  }
}

/**
 * Show a notification for chat errors
 */
export function notifyChatError(error: string) {
  toast.error("Chat Error", {
    description: error,
    duration: 4000,
  });
}

/**
 * Show a notification for successful actions
 */
export function notifySuccess(message: string) {
  toast.success(message, {
    duration: 2000,
  });
}

/**
 * Format unread count for display
 */
export function formatUnreadCount(count: number): string {
  if (count === 0) return "";
  if (count > 99) return "99+";
  return count.toString();
}

/**
 * Check if browser notifications are supported and enabled
 */
export function areBrowserNotificationsSupported(): boolean {
  return "Notification" in window;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areBrowserNotificationsSupported()) {
    return "denied";
  }

  return await Notification.requestPermission();
}

/**
 * Show a browser notification (requires permission)
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions
) {
  if (!areBrowserNotificationsSupported()) {
    return null;
  }

  if (Notification.permission === "granted") {
    return new Notification(title, options);
  }

  return null;
}

/**
 * Play notification sound (optional)
 */
export function playNotificationSound() {
  // You can add a notification sound here if desired
  // const audio = new Audio("/notification-sound.mp3");
  // audio.play().catch(() => {});
}

/**
 * Show a notification for a reminder
 */
export function notifyReminder(title: string, content: string) {
  toast.info(`Reminder: ${title}`, {
    description: content.length > 100 ? `${content.substring(0, 100)}...` : content,
    duration: 6000,
  });

  // Also show browser notification if permission granted
  if (areBrowserNotificationsSupported() && Notification.permission === "granted") {
    showBrowserNotification(`Reminder: ${title}`, {
      body: content,
      icon: "/favicon.ico",
      tag: `reminder-${title}`, // Prevent duplicate notifications
    });
  }
}

