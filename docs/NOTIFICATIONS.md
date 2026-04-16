# Chat Notification System

## Overview

The NOTION CRM chat system includes a comprehensive notification system to keep users informed of new messages and chat activity.

## Features

### 1. In-App Notifications

- **Toast Notifications**: Using `sonner` library for elegant, non-intrusive notifications
- **New Message Alerts**: Automatically shown when receiving messages
- **Connection Status**: Notifies users when they go online/offline
- **Error Handling**: Clear error messages for failed operations

### 2. Unread Message Badge

- **Header Badge**: Red badge on chat icon showing unread count
- **Real-time Updates**: Badge updates instantly via Convex subscriptions
- **99+ Display**: Shows "99+" for counts over 99
- **Per-Conversation Badges**: Individual badges on conversation list items

### 3. Visual Indicators

- **Online Status**: Green dot for online users, gray for offline
- **Read Receipts**: 
  - Single check (✓) = Message sent
  - Double check (✓✓) = Message read
- **Typing Indicators**: (Future enhancement)

## Implementation

### Notification Utilities

Located in `lib/notifications.ts`:

```typescript
import { notifyNewMessage, notifyChatError, notifySuccess } from "@/lib/notifications";

// Show new message notification
notifyNewMessage("John Doe", "Hello, how are you?");

// Show error notification
notifyChatError("Failed to send message");

// Show success notification
notifySuccess("Message sent successfully");
```

### Unread Count Hook

```typescript
import { useUnreadCount } from "@/hooks/use-unread-count";

function MyComponent() {
  const unreadCount = useUnreadCount();
  
  return <Badge>{unreadCount}</Badge>;
}
```

### Real-time Updates

The notification system uses Convex's real-time subscriptions:

1. **Message Subscriptions**: Automatically updates when new messages arrive
2. **Presence Subscriptions**: Tracks online/offline status changes
3. **Unread Count**: Recalculates in real-time as messages are sent/read

## Browser Notifications (Optional)

The system supports browser notifications (requires user permission):

```typescript
import { 
  requestNotificationPermission, 
  showBrowserNotification 
} from "@/lib/notifications";

// Request permission
const permission = await requestNotificationPermission();

// Show notification
if (permission === "granted") {
  showBrowserNotification("New Message", {
    body: "You have a new message from John",
    icon: "/icon.png",
  });
}
```

## Notification Types

### 1. New Message Notifications

**When**: A new message is received in any conversation
**Display**: Toast notification with sender name and message preview
**Duration**: 4 seconds
**Action**: Click to open chat

### 2. Connection Status

**When**: User's connection status changes
**Display**: Success (online) or error (offline) toast
**Duration**: 2 seconds

### 3. Error Notifications

**When**: An error occurs (send failure, connection error, etc.)
**Display**: Error toast with description
**Duration**: 4 seconds

### 4. Success Notifications

**When**: An action completes successfully
**Display**: Success toast
**Duration**: 2 seconds

## Customization

### Notification Settings

Users can customize notifications (future enhancement):

- Enable/disable in-app notifications
- Enable/disable browser notifications
- Enable/disable notification sounds
- Mute specific conversations

### Notification Preferences

Stored per-user in the database:

```typescript
// Future schema addition
notificationPreferences: {
  inApp: boolean;
  browser: boolean;
  sound: boolean;
  mutedConversations: Id<"conversations">[];
}
```

## Best Practices

1. **Don't Spam**: Limit notification frequency
2. **Respect Mute Settings**: Check if conversation is muted
3. **Clear Messages**: Use descriptive notification text
4. **Actionable**: Allow users to act on notifications
5. **Dismissible**: All notifications should be dismissible

## Technical Details

### Notification Flow

1. New message arrives via Convex subscription
2. Check if conversation is muted
3. Check if user is currently viewing the conversation
4. If not viewing, show notification
5. Update unread count badge
6. Play sound (if enabled)
7. Show browser notification (if permitted)

### Performance

- **Debouncing**: Multiple rapid messages are grouped
- **Batching**: Unread counts are calculated efficiently
- **Caching**: Presence data is cached to reduce queries

### Accessibility

- **Screen Readers**: All notifications are accessible
- **Keyboard Navigation**: Notifications can be dismissed with keyboard
- **High Contrast**: Notifications respect theme settings
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

## Future Enhancements

1. **Push Notifications**: Mobile push notifications via service workers
2. **Email Notifications**: Email digest for missed messages
3. **Notification Center**: Central place to view all notifications
4. **Smart Notifications**: AI-powered notification prioritization
5. **Do Not Disturb**: Schedule quiet hours
6. **Notification Grouping**: Group multiple messages from same sender

## Troubleshooting

### Notifications Not Showing

1. Check browser notification permissions
2. Verify Convex connection is active
3. Check if conversation is muted
4. Verify user is authenticated

### Badge Not Updating

1. Check Convex subscription is active
2. Verify unread count query is running
3. Check for JavaScript errors in console

### Sound Not Playing

1. Verify browser allows audio playback
2. Check if sound file exists
3. Verify user interaction before playing sound

## Related Files

- `lib/notifications.ts` - Notification utilities
- `hooks/use-unread-count.ts` - Unread count hook
- `components/chat/chat-icon.tsx` - Chat icon with badge
- `convex/chat.ts` - Chat backend functions
- `convex/presence.ts` - Presence tracking

## Support

For issues or questions about the notification system, refer to:
- Main README.md
- Convex documentation
- Sonner documentation

