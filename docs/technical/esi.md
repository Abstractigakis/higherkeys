# Event-Stream Interface (ESI) Architecture

This document outlines the **Event-Stream Interface (ESI)** pattern used in HigherKeys. This architecture unifies **Event Sourcing** with a **Chat UI**, treating asynchronous entity workflows as a conversation between the User and the System.

## Core Concept

*   **Entities are Chat Threads**: Complex forms or async processes (like video processing) are modeled as "Submissions".
*   **Events are Messages**: Every state change or log entry is an immutable "Event" in the thread.
*   **State is a View**: The current status of an entity is derived by aggregating these events (Finite State Machine).

## Database Schema

### 1. Submissions (The Thread)
Tables: `source_form_submissions`, `highlight_form_submissions`

| Column | Description |
| :--- | :--- |
| `id` | UUID of the thread. |
| `source_id` | Parent entity (e.g., the video source). |
| `external_id` | **Idempotency Key**. Client-generated UUID to prevent duplicate submissions on retries. |
| `payload` | The initial request data (JSON). |

### 2. Events (The Messages)
Tables: `source_form_submission_events`, `highlight_form_submission_events`

| Column | Description |
| :--- | :--- |
| `submission_id` | Link to the specific thread. |
| `event_type` | Machine-readable type (e.g., `PROCESSING_STARTED`, `COMPLETED`, `FAILED`). |
| `metadata` | Raw system logs (JSON). |
| `display_metadata` | **UI Protocol**. JSON definition of how to render this event in the chat. |

### 3. State Synchronization (The FSM)
We use PostgreSQL Triggers to auto-calculate the entity's state based on the latest event.

*   **Trigger**: `sync_*_state_from_event`
*   **Logic**:
    *   Listens: `AFTER INSERT` on `*_events` table.
    *   Action: Updates the parent `sources` or `highlights` table.
    *   Fields Synced: `status`, `title`, `description`, `thumbnail_url`, `duration`, etc.

## Frontend Implementation (`web/`)

The frontend consumes this stream via **Supabase Realtime**.

### key Components

*   **Hook**: `useSubmissionChat(submissionId)`
    *   Subscribes to `INSERT` on the events table.
    *   Merges historical data with real-time updates.
*   **Component**: `<ChatThread />`
    *   Renders the list of events.
    *   Auto-scrolls to the bottom.
*   **Component**: `<ChatBubble />`
    *   Uses `display_metadata.role` to decide alignment (User = Right, System = Left).

### UI Protocol (`display_metadata`)

The backend (via SQL Trigger or API) enriches events with `display_metadata`:

```json
{
  "role": "assistant", // "user" | "assistant" | "system"
  "content": "Processing video...",
  "icon": "loader",
  "color": "#HEX"
}
```

## RBAC & Security

*   **RLS Policies**:
    *   Users can only view submissions/events for `sources` they own (linked via `profile_id`).
    *   `ON DELETE CASCADE`: Deleting a source automatically cleans up all chat history.

## Workflow Example

1.  **User** uploads a video -> Creates `source_form_submission`.
2.  **Trigger** -> Creates `CREATED` event (Role: User).
3.  **Media Server** picks up job -> Inserts `PROCESSING` event (Role: Assistant).
    *   Frontend shows "Processing..." bubble.
    *   `sources` table status updates to `processing`.
4.  **Media Server** finishes -> Inserts `COMPLETED` event (Role: Assistant).
    *   Frontend shows "Success" bubble.
    *   `sources` table status updates to `ready`.
