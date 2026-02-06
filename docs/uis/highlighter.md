# Highlighter & Source Detail Page Specification

## 1. Overview

The Source Detail page provides a focused, full-screen environment for viewing media sources (video/audio) and managing content via a transcript-based interface. The core component is the **Highlighter**, which overlays text on the video and creates a document-editing intuitive experience for creating clips (highlights) and editing content (strikethroughs).

## 2. UI Layout & Video Player

- **Full Screen Player**: The page is dominated by the video player.
- **HLS Streaming**: Uses HLS (`.m3u8`) for adaptive bitrate streaming.
- **Transcript Overlay**:
  - The VTT (Video Text Tracks) content is rendered as a translucent text layer directly over the video.
  - Text is selectable and interactable, functioning effectively as the "document".
  - **Text Normalization**: The text "BLANK" in VTT cues is visually rendered as a space character.

## 3. Interaction Model

The interface mimics a text editor or word processor rather than a standard video player.

### 3.1. Cursors

There are two distinct cursors indicating position:

1. **Yellow Cursor (Play Head)**:
    - Represents the current frame/timestamp of the video playback.
    - Plays linearly with time.
    - **Follow Focus**: When locked to the Blue Cursor (E mode), the viewport automatically scrolls to keep the Yellow Cursor on screen.
    - **Visual**: A yellow background color applied to the text segment. It always takes visual precedence over other highlights or selection states.

2. **Blue Cursor (Navigation Head)**:
    - Represents the user's focus within the transcript document.
    - **Always Visible**: The viewport automatically scrolls to keep the Blue Cursor on screen.
    - Controlled via keyboard navigation.
    - **Visual**: A blue background color applied to the text segment.

### 3.2. States

- **Paused (Default)**: The player starts in a paused state.
- **Locked**: The Blue Cursor is "attached" to the Yellow Cursor. Navigation keys detach it.

### 3.3. Controls & Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| **Space** | Play/Pause | Toggles playback state. |
| **Cmd + Z** | Undo | Reverts the last action (highlight, strike, delete, etc.). |
| **M** | Toggle Mode | Switches between **Absolute** and **Relative** (Strikethroughs hidden/skipped) modes. |
| **S** | Cycle Speed | Cycles through playback speeds: 1x, 1.25x, 1.5x, ..., 3x. |
| **Arrows** | Move Blue Cursor | Navigates text word-by-word or line-by-line. **Unlocks** Blue Cursor from Yellow if currently locked. |
| **Cmd + ←/→** | Jump Line Start/End | Jumps the Blue Cursor to the beginning or end of the current line. |
| **Cmd + F** | Find | Opens a search bar to find text in the transcript. Use **Enter** to jump between results. |
| **Q** | Sync Video to Text | Seeks the video (Yellow) to the current Blue Cursor position. |
| **E** | Sync Text to Video | Moves the Blue Cursor to the current video position (Yellow) and **Locks** it. In this mode, the Blue Cursor effectively disappears/merges with Yellow. |
| **1** | Toggle Highlight Mode | Toggles "Highlight" state. Press once to start selecting, press again to **Save**. |
| **2** | Toggle Strikethrough Mode | Toggles "Strikethrough" state. Press once to start selecting, press again to **Save**. |
| **3** | Toggle Clear Highlight | Toggles "Clear Highlight" state. Removes or trims existing highlights in selection on **Toggle-Off**. |
| **4** | Toggle Clear Strike | Toggles "Clear Strike" state. Removes existing strikethroughs in selection on **Toggle-Off**. |
| **5** | Strike Pauses | Automatically strikes through all "long pauses" (3 or more consecutive blank cues). |
| **~ / Esc** | Cancel Selection | Cancels any active Highlight, Strikethrough, or Clear selection without saving. |
| **[ / ] or < / >** | Playback Speed | Increases or decreases playback speed by 0.25 (0.25x to 4.0x). |
| **\\** | Reset Speed | Resets playback speed to 1.0x. |
| **, / .** | Scene Skip | Navigates forward or backward between highlights. |
| **T** | Toggle Text View | Toggles the visibility of the Transcript Overlay. |
| **I** | Profile Menu | Opens the global profile and navigation menu. |
| **L** | Toggle Legend | Toggles the keyboard shortcuts legend modal. |
| **F / H** | Toggle Highlights List | Toggles a modal showing a linear list of all highlights in the source. |
| **K** | Tag Highlight | Opens the Higher Key tagger for the highlight under the Blue Cursor. |
| **Esc** | Back / Cancel | Closes any open modal (Legend, Search, List, Delete Confirmation, Tagger) or cancels active selection. If no modal/selection is active, opens a **Return to Dashboard** confirmation dialog. |
| **Delete** | Delete Highlight | Opens the confirmation modal for the highlight under the Blue Cursor. |

## 4. Features

### 4.1. Highlighting

Highlights represent saved clips or important regions of the source.

- **Creation**: Press `1` to start a selection, navigate to the end point, and press `1` again to save.
- **Constraints**: None. Highlights can overlap and exist on top of strikethroughs.
- **Cancellation**: Press `~` while in highlight mode to cancel the selection without saving.
- **Data Model**: A highlight is defined by `{ source_id, start_time, end_time, is_strikethrough, latitude, longitude }`.
- **Overlapping**:
  - Multiple highlights can cover the same timestamps.
  - **Visual**: Overlapping regions are colored in **Emerald Green** (higher saturation) to distinguish from standard highlights.
- **Active Focus**:
  - When the **Blue Cursor (Navigator)** is positioned inside a highlight, the entire range of that highlight is colored in **Sky Blue**. This helps identify the boundaries of the specific clip you are currently inspecting.
- **Permanence**: Highlights are saved to the database.
- **Highlights List (F)**:
  - Toggled via the `F` key.
  - Displays a linear list of all highlights (excluding strikethroughs).
  - **Durations**:
    - **Absolute Mode**: Shows full duration of the highlight.
    - **Relative Mode**: Shows the "trimmed" duration (total duration minus any struck-through segments within its range).
  - **Strikethrough Count**: Shows a chip with the count of distinct strikethrough regions that overlap with the highlight.
  - **Navigation**:
    - Selecting a highlight in the list (or clicking it) seeks the video and navigator to the start of that highlight.
    - **Keyboard Control**: When the modal is open, use **Arrows** to navigate up/down the list. Press **Space** to select and seek to the focused highlight.
    - **Quick Actions**: While the list is open, you can press **A** to alias the currently focused highlight or **K** to tag it with Higher Keys without closing the list.
    - **Focus UX**: Auto-scrolls the list to keep the focused highlight centered in the viewport.

#### 4.1.1. Higher Key Management

Highlights can be organized using **Higher Keys** (hierarchical tags).

- **Focused Clip Indicator**: When the **Blue Cursor (Navigator)** is inside a highlight, a "Focused Clip" chip appears in the bottom right, displaying currently assigned Higher Keys.
  - **Display Format**: Higher Key tags are displayed as breadcrumb-style paths (e.g., `#a/b/c` for path `x.a.b.c.z`) omitting both the **Root** (the username/root folder) and the **Leaf** (the tag itself).
  - **Filtering**: If a tag's path is only two segments long (e.g., `username.tag`), it is considered a top-level tag and is **not displayed** in the chip to reduce visual noise. Only nested tags that provide hierarchy context are shown.
- **Tagging Shortcut (K)**: Press `K` (or `H`) while the Blue Cursor is inside a highlight to open the hierarchical Higher Key Tagger.
- **Hierarchical Manager**: The tagger uses the full tree manager interface, allowing you to:
  - **Navigate**: Use Arrows to browse the hierarchy.
  - **Search/Create**: Press `N` to create a new key on the fly.
  - **Tag/Untag**: Press `Space` or `V` (or click the **Select** button) to toggle the tag for the current highlight.
- **Manual Access**: Each highlight in the **Highlights List (F)** has a tag icon button to open the manager.

- **Independence**: Highlight and Strikethrough modes are independent. Strikethroughs do **not** delete highlights. Both can exist on the same text.
- **Visual**: A red line drawn through the text (superimposed over any highlights).
- **Behavior**:
    1. **Visual Mask**: Strikethroughs act as a visual strike-out.
    2. **Relative Mode**: In Relative Mode, struck-through content is skipped during playback and hidden from the transcript viewport.
- **Constraint**: The same word/timestamp cannot be struck through multiple times (ranges merge).

### 4.3. Clear Modes (Undo & Trim)

1. **Clear Highlight (3)**: Press `3` to start a selection and `3` again to confirm. Any highlights fully within the range are deleted. Highlights partially covered are trimmed or split to remove only the selected portion.
2. **Clear Strike (4)**: Press `4` to enter Clear Strike mode, navigate to cover the struck-through words, and press `4` again to confirm. Any strikethrough intervals within the selected range are removed.

### 4.4. Model Independence

To maintain maximum flexibility, the system treats Highlights and Strikethroughs as independent datasets:

1. **Independent Selection**: Toggling `Highlight` (1) or `Clear Highlight` (3) does **not** cancel an active `Strikethrough` (2) or `Clear Strike` (4) selection, and vice-versa.
2. **Mutual Exclusivity Groups**:
    - **Group A (Clip Management)**: `Highlight` (1) and `Clear Highlight` (3) are mutually exclusive. Activating one cancels the other.
    - **Group B (Edit Management)**: `Strikethrough` (2) and `Clear Strike` (4) are mutually exclusive. Activating one cancels the other.
3. **Layered Effects**: You can highlight content that is struck through. Strikethroughs do not destroy highlights; they merely provide a filter for playback and visibility in `Relative Mode`.
4. **Highlights are Persistent**: Highlights remain until either covered by a `Clear Highlight` selection or manually deleted.

### 4.5. Playback Modes & Timer Chip

The UI supports two synchronized viewports of time:

- **Absolute Mode**: Standard media time. All content (including strikes) is visible and playable.
- **Relative Mode (Preview)**: Edited media time.
  - **Visual**: Struck-through text is completely hidden from the transcript.
  - **Playback**: When the playhead reaches a strikethrough region, it automatically skips (seeks) to the end of that region.
  - **Editing Constraint**: `Strike (2)` and `Clear Strike (4)` are **disabled** in Relative Mode. Users must switch to Absolute Mode to modify the edit mask.
- **Timer Chip**: Located in the bottom right, it displays both Absolute and Relative timestamps for the **Playhead** (Yellow) and **Navigator** (Blue). The active mode is highlighted, while the inactive mode is dimmed.

## 5. Technical Implementation Details

### 5.1. Data Model

All persistent markers are stored in the `highlights` table:

```typescript
interface Highlight {
  id: string;
  source_id: string;
  start_time: number; // in seconds
  end_time: number;
  is_strikethrough: boolean;
}
```

- **Merging**: Strikethrough intervals are automatically merged on the client before rendering and when processed by the `Relative Mode` logic to ensure a contiguous playback experience.
- **Independence**: Querying `is_strikethrough = false` yields clips (highlights), while `is_strikethrough = true` yields the edit mask.

### 5.2. Component Architecture

- **`VideoPlayer`**: Handles HLS playback and exposes `currentTime`.
- **`TranscriptOverlay`**:
  - **Layers**:
        1. **Text Layer**: Renders VTT words.
        2. **Highlight Layer**: Renders `<div className="bg-green-500 opacity-blend" />` behind text.
        3. **Strikethrough Layer**: Renders `<div className="border-b-2 border-red-500" />` or SVG lines over text.
        4. **Cursor Layer**: Renders Yellow and Blue cursors.
  - **State**:
    - `isLocked`: boolean
    - `blueCursorTime`: number
    - `mode`: 'navigate' | 'highlight' | 'strikethrough'
