# Chat Feature Documentation

## Overview

The NOTION CRM includes a complete real-time chat system that enables communication between users based on their roles. The chat system features online/offline status tracking, read receipts, search functionality, notifications with badge counts, and a mobile-first responsive UI.

## Features

### Core Features

- ✅ **Real-time Messaging**: Instant message delivery using Convex subscriptions
- ✅ **One-on-One Conversations**: Private conversations between two users
- ✅ **Message Timestamps**: Smart date formatting (today/time, date for older messages)
- ✅ **Read Receipts**: Visual indicators showing message delivery and read status
- ✅ **Online/Offline Status**: Real-time presence tracking with visual indicators
- ✅ **Search Functionality**: Search conversations by user name
- ✅ **Unread Message Count**: Badge showing total unread messages
- ✅ **Mobile-First Design**: Responsive UI optimized for all screen sizes
- ✅ **Theme Support**: Matches the existing NOTION theme system

### Role-Based Permissions

The chat system enforces strict role-based permissions:

#### Site Engineer
- ✅ Can chat with ALL Purchase Officers
- ✅ Can chat with ALL Managers
- ❌ CANNOT chat with other Site Engineers (no internal chat)

#### Purchase Officer
- ✅ Can chat with ALL Site Engineers
- ✅ Can chat with ALL Managers
- ✅ Can chat with other Purchase Officers (internal chat allowed)

#### Manager
- ✅ Can chat with ALL Site Engineers
- ✅ Can chat with ALL Purchase Officers
- ✅ Can chat with other Managers (internal chat allowed)

## Architecture

### Database Schema

The chat system uses three main tables in Convex:

#### 1. Conversations
Stores chat conversations between users:
- `participants`: Array of 2 user IDs
- `lastMessageAt`: Timestamp of last message
- `lastMessage`: Preview text (first 100 chars)
- `lastMessageSenderId`: User who sent last message
- `unreadCount`: Object mapping userId to unread count
- `mutedBy`: Array of user IDs who muted this conversation
- `createdAt`, `updatedAt`: Timestamps

#### 2. Messages
Stores individual messages:
- `conversationId`: Reference to conversation
- `senderId`: User who sent the message
- `content`: Message text (max 5000 chars)
- `readBy`: Array of user IDs who have read the message
- `createdAt`: Timestamp

#### 3. UserPresence
Tracks online/offline status:
- `userId`: User ID
- `isOnline`: Boolean status
- `lastSeenAt`: Last activity timestamp
- `updatedAt`: Last update timestamp

### Backend Functions

Located in `convex/chat.ts`:

- `getOrCreateConversation`: Get or create a conversation with another user
- `getConversations`: Get all conversations for current user
- `getConversation`: Get specific conversation details
- `getMessages`: Get messages for a conversation
- `sendMessage`: Send a new message
- `markAsRead`: Mark messages as read
- `getChattableUsers`: Get list of users current user can chat with
- `searchConversations`: Search conversations by user name
- `getUnreadCount`: Get total unread message count

Located in `convex/presence.ts`:

- `updatePresence`: Update user's online status (heartbeat)
- `getUserPresence`: Get user's online status
- `getMultipleUserPresence`: Get presence for multiple users
- `getOnlineUsers`: Get all currently online users
- `setOffline`: Mark user as offline
- `cleanupStalePresence`: Cleanup stale presence records

### Frontend Components

Located in `components/chat/`:

1. **chat-window.tsx**: Main chat interface with conversation list and message view
2. **conversation-list.tsx**: List of conversations with search
3. **message-list.tsx**: Messages display with timestamps and read receipts
4. **message-input.tsx**: Message input with send button
5. **user-search.tsx**: Search and select users to start chat
6. **chat-icon.tsx**: Chat icon with notification badge for header
7. **online-indicator.tsx**: Online/offline status indicator
8. **read-receipt.tsx**: Read receipt indicators (✓ sent, ✓✓ read)
9. **presence-provider.tsx**: Automatic presence heartbeat provider

### Custom Hooks

Located in `hooks/`:

1. **use-chat.ts**: Chat operations (send, receive, mark read)
2. **use-presence.ts**: Online status tracking and updates
3. **use-unread-count.ts**: Unread message count

### Utilities

1. **lib/chat/permissions.ts**: Role-based chat permission logic
2. **lib/notifications.ts**: Notification utilities

## Usage

### Accessing Chat

Users can access chat in three ways:

1. **Header Icon**: Click the chat icon in the header (shows unread count badge)
2. **Sidebar Link**: Click "Chat" in the sidebar navigation
3. **Direct URL**: Navigate to `/dashboard/chat`

### Starting a Conversation

1. Click the "New Chat" button (+ icon) in the conversation list
2. Search for a user by name or username
3. Click on a user to start chatting
4. Only users you're allowed to chat with (based on role) will appear

### Sending Messages

1. Type your message in the input field at the bottom
2. Press Enter or click the Send button
3. Messages are limited to 5000 characters
4. Empty messages cannot be sent

### Reading Messages

- Messages are automatically marked as read when you open a conversation
- Read receipts show delivery status:
  - Single check (✓) = Message sent
  - Double check (✓✓) = Message read

### Searching Conversations

- Use the search bar at the top of the conversation list
- Search by user's full name or username
- Results update in real-time as you type

### Online Status

- Green dot = User is online
- Gray dot = User is offline
- Status updates automatically every 30 seconds
- Users are considered offline if inactive for 2+ minutes

## Technical Details

### Real-time Updates

The chat system uses Convex's real-time subscriptions for instant updates:

- **Messages**: New messages appear instantly without refresh
- **Presence**: Online status updates in real-time
- **Unread Count**: Badge updates immediately when messages arrive
- **Conversations**: Conversation list reorders when new messages arrive

### Presence Tracking

Users' online status is tracked via a heartbeat system:

1. When user logs in, presence is set to online
2. Every 30 seconds, a heartbeat updates the presence
3. If no heartbeat for 2 minutes, user is considered offline
4. When user logs out or closes window, presence is set to offline

### Performance Optimizations

- **Efficient Queries**: Proper database indexes for fast lookups
- **Message Pagination**: Messages are limited to 100 per query
- **Debounced Search**: Search queries are optimized to reduce load
- **Cached Presence**: Presence data is cached to reduce queries

### Mobile Responsiveness

The chat UI is fully responsive:

- **Mobile**: Full-screen chat interface with slide-in animations
- **Tablet**: Optimized layout with appropriate spacing
- **Desktop**: Side-by-side conversation list and message view

### Accessibility

- **Screen Readers**: All UI elements are properly labeled
- **Keyboard Navigation**: Full keyboard support
- **High Contrast**: Respects theme settings
- **Focus Management**: Proper focus handling for modals and inputs

## Customization

### Styling

The chat UI uses the existing NOTION theme system:

- All colors are theme-aware (light/dark mode)
- Animations respect `prefers-reduced-motion`
- Spacing follows the design system
- Components use shadcn/ui primitives

### Extending Functionality

To add new features:

1. **Backend**: Add functions to `convex/chat.ts` or `convex/presence.ts`
2. **Frontend**: Create new components in `components/chat/`
3. **Hooks**: Add custom hooks in `hooks/`
4. **Types**: Update types in `convex/_generated/dataModel.d.ts`

## Troubleshooting

### Messages Not Sending

1. Check network connection
2. Verify Convex is running (`npm run dev:convex`)
3. Check browser console for errors
4. Ensure user has permission to chat with recipient

### Presence Not Updating

1. Verify presence heartbeat is running (check dashboard layout)
2. Check if user is authenticated
3. Look for errors in browser console
4. Ensure Convex connection is active

### Unread Count Not Updating

1. Check if Convex subscriptions are active
2. Verify user is authenticated
3. Check for JavaScript errors
4. Ensure conversation is not muted

### Chat Not Loading

1. Verify user has correct role permissions
2. Check if Convex database is accessible
3. Look for authentication errors
4. Ensure all required dependencies are installed

## Security

### Permission Enforcement

- All chat permissions are enforced server-side in Convex
- Users cannot bypass role-based restrictions
- Conversations are private and only visible to participants
- Messages are validated before saving

### Data Privacy

- Messages are stored securely in Convex
- Only conversation participants can read messages
- Presence data is only visible to users who can chat together
- No message content is logged or tracked

### Authentication

- All chat operations require authentication
- User identity is verified via Clerk/Convex Auth
- Unauthorized access attempts are rejected
- Session management is handled securely

## Future Enhancements

Potential features for future versions:

1. **Typing Indicators**: Show when other user is typing
2. **Message Editing**: Edit sent messages
3. **Message Deletion**: Delete messages
4. **File Attachments**: Send images and files
5. **Group Chat**: Multi-user conversations
6. **Message Reactions**: React to messages with emojis
7. **Voice Messages**: Record and send voice messages
8. **Video Calls**: Integrated video calling
9. **Message Forwarding**: Forward messages to other conversations
10. **Rich Text**: Formatting options for messages
11. **Message Search**: Search within conversation messages
12. **Pinned Messages**: Pin important messages
13. **Mute Notifications**: Mute specific conversations
14. **Archive Conversations**: Archive old conversations
15. **Export Chat**: Export conversation history

## Related Documentation

- [Notifications System](./NOTIFICATIONS.md)
- [Theme System](./THEME.md)
- [Main README](../README.md)

## Support

For issues or questions:

1. Check this documentation
2. Review the code comments
3. Check Convex documentation
4. Review shadcn/ui documentation
5. Check the main README

## API Reference

### Chat Hooks

```typescript
// Get all conversations
const { conversations, unreadCount, chattableUsers } = useChat();

// Get specific conversation
const conversation = useConversation(conversationId);

// Get messages
const messages = useMessages(conversationId, limit);

// Search conversations
const results = useSearchConversations(searchQuery);

// Get chattable users
const users = useChattableUsers(searchQuery);
```

### Presence Hooks

```typescript
// Get user presence
const presence = useUserPresence(userId);

// Get multiple user presence
const presenceMap = useMultipleUserPresence(userIds);

// Get online users
const onlineUsers = useOnlineUsers();

// Update presence manually
const { setOnline, setOffline } = useUpdatePresence();
```

### Notification Utilities

```typescript
import { 
  notifyNewMessage, 
  notifyChatError, 
  notifySuccess,
  formatUnreadCount 
} from "@/lib/notifications";

// Show new message notification
notifyNewMessage("John Doe", "Hello!");

// Show error
notifyChatError("Failed to send message");

// Show success
notifySuccess("Message sent");

// Format unread count
const badge = formatUnreadCount(42); // "42"
const badge2 = formatUnreadCount(150); // "99+"
```

### Permission Utilities

```typescript
import { 
  canChatWith, 
  getChattableRoles, 
  canChatInternally 
} from "@/lib/chat/permissions";

// Check if user can chat with another user
const allowed = canChatWith(userRole, targetRole);

// Get roles user can chat with
const roles = getChattableRoles(userRole);

// Check if internal chat is allowed
const internal = canChatInternally(userRole);
```

## File Structure

```
convex/
  ├── schema.ts              # Database schema (conversations, messages, userPresence)
  ├── chat.ts                # Chat backend functions
  └── presence.ts            # Presence tracking functions

components/chat/
  ├── chat-window.tsx        # Main chat interface
  ├── conversation-list.tsx  # Conversation list
  ├── message-list.tsx       # Message display
  ├── message-input.tsx      # Message input
  ├── user-search.tsx        # User search
  ├── chat-icon.tsx          # Chat icon with badge
  ├── online-indicator.tsx   # Online status indicator
  ├── read-receipt.tsx       # Read receipt component
  └── presence-provider.tsx  # Presence heartbeat provider

hooks/
  ├── use-chat.ts            # Chat operations hook
  ├── use-presence.ts        # Presence tracking hook
  └── use-unread-count.ts    # Unread count hook

lib/
  ├── chat/
  │   └── permissions.ts     # Role-based permissions
  └── notifications.ts       # Notification utilities

app/dashboard/
  └── chat/
      └── page.tsx           # Chat page route

docs/
  ├── CHAT.md                # This file
  └── NOTIFICATIONS.md       # Notification system docs
```

## Version History

- **v1.0.0** (Current): Initial release with core chat functionality
  - Real-time messaging
  - Role-based permissions
  - Online/offline status
  - Read receipts
  - Search functionality
  - Notification system
  - Mobile-responsive UI

