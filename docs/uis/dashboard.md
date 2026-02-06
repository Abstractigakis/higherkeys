# Dashboard Page

The dashboard is the main hub for authenticated users to manage their media sources and highlights. It is accessible at `/dashboard`.

## Layout

### Header

The main navigation header features a single "Sources" view. Active filters are displayed as high-contrast pills on the **right side** of the row, keeping the interface compact.

### Main Content

- **Sources View**: A linear list of media sources.
  - **Vertical Scroll**: Navigate through different sources.
  - **Horizontal Scroll**: Within each source row, browse its associated highlights.
- **Global Modals**:
  - **Profile Settings (`I`)**: Redesigned minimalist interface to update your name and avatar, or sign out.
  - **Source Search (`⌘ + S`)**: Quick filter for sources by name.
  - **Add from URL (`D`)**: Insert a YouTube URL for download and processing.
  - **Upload File (`U`)**: Upload a local video file.
- **Legend Modal**: Triggered by the `L` key. Displays contextual keyboard shortcuts for the Sources view.

## Keyboard Navigation

Keyboard navigation is the primary way to interact with the dashboard.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up/Down Arrow** | Change Source | Move focus to the source above/below. |
| **Left/Right Arrow** | Browse Highlights | Scroll through highlights of the currently active source. |
| **Enter** | Open | Opens the focused source or highlight. |
| **⌘ + S** | Search Sources | Opens the 'Search by Source' modal to filter results. |
| **⌘ + K** | Filter Keys | Opens the Higher Key filter interface. |
| **I** | Profile | Opens the profile modal to update name, avatar, or sign out. |
| **P** | Playlists | Opens the Higher Key manager to browse and play sequences. |
| **D** | Download | Opens the 'Add from URL' modal for YouTube videos. |
| **U** | Upload | Opens the 'Upload File' modal for local videos. |
| **L** | Legend | Toggles the keyboard shortcuts legend popup. |
| **X** | Clear Filters | Reset all active search and key filters. |
| **Delete** | Delete | While focused on a Source or Highlight, opens a confirmation dialog. |

## UI Components

### DashboardContainer

The core client-side wrapper that handles keyboard events and state:

- **activeSourceIndex**: Tracks the currently focused source.
- **activeHighlightIndex**: Tracks focus within the horizontal highlight reel of the active source.

### Source Row

Represents an individual media item (Source) displayed as a horizontal reel:

- **Visual**: A vertical list where each row starts with source metadata and extends into a horizontal scrollable list of highlights.
- **Interactivity**: Vertical navigation selects the source; horizontal navigation selects clips within it.

### Highlight Entry

Individual highlights displayed in a unified grid within the **Highlights Tab (2)**:

- **Visual**: Displays a thumbnail of the highlight, its alias (or start time). Assigned **Higher Keys** are displayed as breadcrumb-style paths (e.g., `#a/b/c`) below the title.
- **Tag Display Logic**:
  - Only paths with more than 2 segments are displayed (omitting **Root** and **Leaf**).
  - Example: `username.folder.subfolder.tag` -> `#folder/subfolder`.
  - Top-level tags (e.g., `username.tag`) are hidden in this view to minimize clutter.
- **Interactivity**: Clicking or navigating to it selects it. Pressing `K` opens the tagger, and `A` opens the alias modal.

## Modals

### Higher Key Manager Modal

A global manager for the hierarchical key structure, accessible via the `P` key.

### Higher Key Tagger

A context-specific version of the manager used to assign/remove Higher Keys from specific highlights via the `K` shortcut.
