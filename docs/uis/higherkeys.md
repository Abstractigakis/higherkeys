# Higher Keys Management UI

## Overview

The Higher Keys Management interface provides a filesystem-like experience for creating, organizing, and managing hierarchical labels.

## Components

### 1. Filesystem Tree

- A sidebar or main view showing the nested structure of Higher Keys.
- Folders represent Higher Keys.
- Files (optional view) represent assignments to Sources or Highlights.

### 2. Breadcrumbs

- Displays the current path in the hierarchy (e.g., `airx / work / projects`).
- Allows for quick navigation back up the tree.

### 3. Management Actions

- **Create**: Add a new child Higher Key to the current directory.
- **Rename**: Change the name of a Higher Key (updates `ltree` path).
- **Delete**: Remove a Higher Key and all its descendants.
- **Move (Drag and Drop)**: Move a Higher Key (and all its descendants) to a new parent by dragging it onto another folder or into the breadcrumbs.
- **Play Playlist**: A play button on each Higher Key card that opens the recursive playlist view, playing all highlights in the folder and its subfolders in DFS order.

### 4. Drill-Down Management Modal

- A dedicated modal for hierarchical label organization using a "Drill-Down" explorer pattern (similar to macOS Column view but single-pane).
- **Navigation Logic**:
  - The UI shows only the children of the "Current Folder".
  - There is no folding/unfolding; you either enter a folder or exit it.
- **Keyboard Shortcuts**:
  - **ArrowUp / ArrowDown**: Move focus within the current level.
  - **Right**: **Drill Down** into the focused folder.
  - **Left**: **Navigate Up** to the parent folder.
  - **N**: Create a new sub-key in the current level.
  - **A**: Rename focused key or highlight.
  - **P / O**: Play Recursive Playlist for the focused folder (Breakout).
  - **Enter (on Focused Highlight)**: Open Source / Play.
  - **Enter (in Tagging Mode)**: Toggle tag for focused folder.
  - **D / K (in Tagging Mode)**: Done Tagging (Save/Close).
  - **Delete / Backspace**: Remove key or highlight from folder.
  - **Esc**: Blur focus or Close modal.
- **Move Systems**:
  - **Shift (Pickup Mode)**: Pick up the focused key to reorder it within the current folder.
  - **Command + Shift (Absolute Move)**:
    1. Focus a key and press keys.
    2. The UI immediately resets to the **Virtual Root**.
    3. The focused key is "attached" to your cursor (visually highlighted).
    4. Use Arrow keys to navigate to the target destination.
    5. Release to drop the key into the current view.
- **Visual Design**:
  - **Breadcrumb Header**: Shows the full path (e.g., `airx > work > projects`). Each segment is clickable to jump back.
  - **Empty States**: Clear visual when a folder has no children.
  - **Pick-and-Drop Highlight**: The key being moved is distinct (e.g., ghosted or bordered).
  - **Virtual Root**: The journey always begins at the user's username.

## Interactions

### Navigation

- Clicking a folder navigates "into" that Higher Key, showing its children.
- The root node is always the user's username and cannot be renamed or deleted.

### Drag and Drop

- User can drag a Higher Key card.
- Dropping it onto another Higher Key card moves it to be a child of that key.
- Dropping it onto a breadcrumb segment moves it to that level in the hierarchy.
- On drop, the `parent_id` is updated, and the `path` is automatically recalculated by the database trigger.
- A Memory event is captured for the move operation.

### Creation Flow

1. User clicks "New Higher Key".
2. System prompts for name (validated for alphanumeric/underscores).
3. Geographic location is automatically captured.
4. On save, a `higherkeys` record is created including the user's current coordinates.

## Visual Style

- Should feel like a modern file explorer (e.g., macOS Finder or VS Code Sidebar).
- Streamlined items: Folder and highlight entries use a single-line primary display to maximize space.
- Highlights show their title/alias and duration on one line; source metadata is omitted to reduce vertical clutter.
- Uses indentations and toggle chevrons to show hierarchy.
- Interactive Breadcrumbs for easy navigation.
