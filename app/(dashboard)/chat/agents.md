# Module: Chat (Mensajería)

## Description
This module allows real-time communication between employees. It supports direct messages, group chats, and file sharing.

## Capabilities
- **Direct Messages**: One-on-one conversations.
- **Channels**: Public or private groups (`#general`, `#it-support`).
- **File Sharing**: Upload/Send images or docs.
- **Search**: Find past messages.

## Key Files
- `page.tsx`: The chat interface (sidebar with contacts + active chat window).

## Data Dependencies
- **Supabase Tables**:
  - `chat_messages` (or similar): The message log.
  - `chat_rooms`: Definitions of groups/DMs.
  - `chat_participants`: Who is in which room.
  - `profiles`: User info.

## Agent Context
- **Real-time**: Heavily reliant on Supabase Realtime (subscriptions).
- **Privacy**: Strict RLS rules ensuring users only see chats they are part of.
