# Application Controls & Keyboard Shortcuts

Higher Keys is designed to be fully navigable via keyboard. This document serves as a comprehensive guide to all shortcuts and navigation patterns across the application.

## Core Interaction Model

| Context | I Key | P Key |
| :--- | :--- | :--- |
| **Global** | Profile Menu (Logged in only) | — |
| **Dashboard** | Profile Menu | Play Source Playlist |
| **Highlighter** | Profile Menu | — |
| **Playlist Player** | Profile Menu | — |
| **Higher Key Manager** | Profile Menu | Breakout Playlist (Launch sequence) |

## State-Specific Controls

### 1. Global Navigation

Available on every page when authenticated and no input is focused.

| Key | Action | Description |
| :--- | :--- | :--- |
| **I** | Profile Menu | Opens the user settings and logout menu. |
| **Esc** | Close / Back | Closes any open modal or cancels an active selection/mode. |

---

### 2. Dashboard (Main Hub)

Default state when viewing your library of sources and highlights.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up / Down** | Select Source | Move focus between media sources in the list. |
| **Left / Right** | Browse Clips | Browse the highlights belonging to the focused source. |
| **Enter** | Open | Opens the focused source player or highlight segment. |
| **P** | Play Playlist | Plays the playlist for the selected source. |
| **D** | Download | Opens the "Add from URL" modal for YouTube. |
| **U** | Upload | Opens the file upload modal. |
| **Tab** | Cycle Tabs | Cycle through Higher Keys, Sources, and Highlights tabs. |
| **1 / 2 / 3** | Switch Tab | Jump directly to a dashboard tab. |
| **⌘ + S** | Search | Filter sources by name. |
| **⌘ + K** | Key Filter | Filter dashboard by Higher Key associations. |
| **L** | Legend | Toggle the dashboard keyboard guide. |
| **X** | Clear | Reset all active filters and search queries. |
| **Delete** | Delete | Removes the focused source or highlight (with confirmation). |

---

### 3. Higher Key Manager (Tab Mode)

Triggered by **Tab** or **P** on the Dashboard. Used for organizing and navigation.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up / Down** | Navigate | Move selector through files and folders. |
| **Right / Enter** | Drill Down | Enter the focused folder. |
| **Left / Bksp** | Go Up | Return to the parent folder level. |
| **Shift** | Move Mode | "Pick up" an item to move it. Use arrows to position, press again to drop. |
| **Control** | Copy Mode | "Pick up" an item to duplicate it to a new location. |
| **Enter** | Play | If focused on a folder, launches the Playlist Player for its content. |
| **P** | Breakout | Direct launch of the sequence. |
| **N** | New Folder | Create a new directory at the current level. |
| **A** | Alias | Rename the focused folder or highlight association. |
| **K** | Tag Mode | Switch to batch-tagging highlights within children. |

---

### 4. Higher Key Tagger (Assignment Mode)

Triggered by **K** on a highlight in the Dashboard, Highlighter, or Playlist Player.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up / Down** | Navigate | Browse the folder structure. |
| **Right / Left** | Browse Depth | Enter or leave folders. |
| **Space / V** | Toggle Tag | Apply/Remove the active Higher Key to the target highlight(s). |
| **Enter** | Toggle / Save | Toggles the tag and keeps the modal open. |
| **D / K** | Done | Save changes and close the tagging interface. |

---

### 5. Highlight Alias Modal

Triggered by **A** on any highlight.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Enter** | Save | Applies the new alias to the highlight. |
| **Esc** | Cancel | Discards changes and closes the modal. |

---

### 6. Source Player (Highlighter)

The core editing environment.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Space** | Play / Pause | Toggle video playback. |
| **Arrows** | Navigate | Move the Blue Cursor word-by-word or line-by-line. |
| **1** | Highlight | Start/End creating a new highlight segment. |
| **2** | Strikethrough | Start/End striking out content for removal. |
| **3 / 4** | Clear | Clear existing highlights (3) or strikethroughs (4) in range. |
| **5** | Auto-Strike | Automatically strike out long pauses (3+ blanks). |
| **Q / E** | Sync | Sync Video to Cursor (Q) or Cursor to Video (E). |
| **S** | Cycle Speed | Cycle playback speed (1x -> 3x). |
| **M** | Toggle Mode | Switch between Absolute (Full) and Relative (Edited) modes. |
| **F / H** | List | Toggle the list of all highlights in the source. |
| **K / A** | Manage | Open Tagger (K) or Aliaser (A) for active highlight at cursor. |
| **T** | Transcript | Toggle the text overlay visibility. |
| **Esc** | Exit | Confirmation to return to the Dashboard. |

---

### 7. Playlist Player

Distraction-free viewing of sequences.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Space** | Play / Pause | Toggle video playback. |
| **← / →** | Scrub | Move blue cursor through the transcript. |
| **↑ / ↓** | Jump | Skip cursor by 15 lines. |
| **Shift** | Move Mode | Reorder clips in the playlist using arrow keys. |
| **, / .** | Change Clip | Skip to the Previous (,) or Next (.) clip in the sequence. |
| **Q / E** | Sync | Sync Video to Cursor (Q) or Cursor to Video (E). |
| **M** | Toggle Mode | Toggle playback skipping of strikethroughs. |
| **Delete** | Remove | Remove the current clip from the playlist (with confirmation). |
| **I** | Profile | Global access to settings. |

## Global Navigation

| Key | Action | Description |
| :--- | :--- | :--- |
| **I** | Profile | Opens the profile and navigation menu from any page. |
| **P** | Playlists | Opens the Higher Key manager to browse and play sequences. |
| **D** | Download | Opens the "Add from URL" modal for YouTube videos. |
| **U** | Upload | Opens the "Upload File" modal for local video files. |
| **L** | Legend | Toggles the keyboard shortcut legend on screens that support it. |
| **Esc** | Back / Close | Closes modals or navigates back to the previous context (e.g., return to Dashboard from Playlist Editor). |

---

## Dashboard Page

The dashboard is the central hub, divided into **Higher Keys**, **Sources**, and **Highlights** tabs.

### Tab Navigation

- **`1`**: Switch to the **Higher Keys** tab.
- **`2`**: Switch to the **Sources** tab.
- **`3`**: Switch to the **Highlights** tab.
- **`Tab`**: Cycle to the next tab.
- **`Shift+Tab`**: Cycle to the previous tab.
- **`[` (Left Bracket)**: Cycle to the previous tab.
- **`]` (Right Bracket)**: Cycle to the next tab.
- **`L`**: Toggle keyboard shortcuts legend.

---

## Playlist Player Page

The playlist player provides a distraction-free environment for viewing sequences of clips.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Space** | Play / Pause | Toggle video playback. |
| **ArrowRight / →** | Move Cursor Forward | Move the blue transcript cursor forward. If unlocked, scrolls through clips without affecting playback. |
| **ArrowLeft / ←** | Move Cursor Backward | Move the blue transcript cursor backward. If unlocked, scrolls through clips without affecting playback. |
| **ArrowUp / ArrowDown** | Jump Cursor | Move the blue cursor up or down by multiple segments (~15). |
| **, (Comma)** | Previous Clip | Skip video playback to the previous highlight in the playlist. |
| **. (Period)** | Next Clip | Skip video playback to the next highlight in the playlist. |
| **Shift** | Move Mode | Toggle "Move Mode" to reorder clips using arrow keys. |
| **Q** | Sync Video to Cursor | Jumps video playback to the current blue cursor's clip and time. |
| **E** | Sync Cursor to Video | Resets the blue cursor to the current video playback position and re-locks it. |
| **M**| Toggle Relative | Toggle playback skipping of strikethroughs. |
| **A** | Alias | Rename thefocused clip (blue cursor if unlocked, else playback clip). |
| **K** | HigherKeys | Manage HigherKey assignments for the focused clip. |
| **T** | Transcript | Toggle the text transcript overlay. |
| **2** | Strikethrough | Enter Strikethrough mode at blue cursor. Mark start, move cursor, press again to apply. |
| **3** | Clean | Enter Clean mode at blue cursor to remove strikethroughs. |
| **Delete** | Remove Clip | Remove the focused clip (blue cursor if unlocked) from this playlist. |
| **L** | Legend | Toggle the on-screen keyboard shortcut guide. |
| **Esc** | Exit / Cancel | Clear selections, close modals, or return to the dashboard. |

---

## Source Player (Highlighter)

The core editing interface for creating and managing highlights.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Space** | Play / Pause | Toggle video playback. |
| **1 / 2 / 3 / 4** | Select | Create Highlight (1), Strikethrough (2), Clear Highlight (3), Clear Strikethrough (4). |
| **5** | Cleanup | Automatically strike out long pauses. |
| **Q / E** | Sync | Sync Video to Cursor (Q) or Cursor to Video (E). |
| **L** | Legend | Toggle the on-screen keyboard shortcut guide. |
| **F / H** | List | Toggle the list of all highlights. || **K** | Tag | Manage Higher Keys for active highlight. |
| **D / K** | Done | Finish tagging (when active). || **Esc** | Exit | Return to the dashboard. |

---

## Higher Keys Tab (Key 1)

Hierarchical organization of your thoughts and media. Move, nest and copy items.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up/Down Arrows** | Navigate | Browse folders and highlights within the current level. |
| **Enter** | Enter / Rename | Enter focused folder. If already focused, opens rename input. |
| **P** | Breakout | Launch the Playlist Player for the focused folder (or current folder). |
| **Backspace / ←** | Go Up | Navigate to the parent folder. |
| **Shift** | Move | Pick up a folder or highlight to move it. Press **Shift** or **Enter** again to drop it at the new location (gap or folder). |
| **Control** | Copy | Pick up a folder or highlight to duplicate it. Press **Control** or **Enter** again to copy it to the new location. |
| **N** | New | Create a new folder at the current level. |
| **A** | Alias | Rename the focused highlight or folder. |
| **Delete** | Delete | Deletes the selected folder or highlight association (requires confirmation). |

### Sources Tab (Key 2)

Focuses on managing your media sources. Sources are displayed in a responsive grid.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up Arrow** | Move Up | Navigate to the source in the row above. |
| **Down Arrow** | Move Down | Navigate to the source in the row below. |
| **Enter** | Open | Opens the focused Source Page. |
| **⌘/Ctrl + S** | Search | Opens the "Search by Source" modal to filter by name. |
| **K** | Tag | While focused on a **Source**, opens the Higher Key tagger. |
| **Delete** | Delete | While focused on a **Source**, opens a confirmation modal to delete it. |

### Highlights Tab (Key 3)

A unified view of all highlights from every source, organized in a grid.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up/Down Arrow** | Navigate | Move focus between highlights in the grid. |
| **Enter** | Play | Open the source page and start playback at the selected highlight's timestamp. |
| **⌘/Ctrl + H** | Search | Opens the global search Modal to filter highlights/global content. |
| **A** | Alias | Rename the focused highlight. |
| **K** | Tag | Tag the focused highlight with Higher Keys. |
| **Delete** | Delete | Delete the focused highlight. |

### Search & Filter

Higher Keys provides multi-layered filtering. Active filters are displayed as high-contrast indicators on the **right side** of the navigation tabs.

| Key | Action | Description |
| :--- | :--- | :--- |
| **⌘/Ctrl + S** | Search Sources | Opens the "Search by Source" modal to filter specifically by source name. |
| **⌘/Ctrl + H** | Search Highlights | Opens the global search Modal to filter across all tabs. |
| **⌘/Ctrl + P** | Search Playlists | Opens the "Search by Playlist" modal. |
| **⌘/Ctrl + K** | Key Filter | Opens the Higher Key selection modal. |
| **X** | Clear Filters | Instantly clears all active search queries and Higher Key filters. |
| **Esc** | Close/Clear | Closes search modals. |

Active filter pills can be clicked to remove specific filters, or the "Reset" button can be used to clear everything instantly.

### Playlists Tab (Key 3)

Focuses on managing your highlight collections. Each selected playlist is automatically **centered** on the screen.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up Arrow** | Move Up | Navigate to the playlist above. |
| **Down Arrow** | Move Down | Navigate to the playlist below. |
| **Enter** | Open | Opens the Playlist Editor for the selected playlist. |
| **⌘/Ctrl + P** | Search | Opens the "Search by Playlist" modal. |
| **N** | New | Opens the "Create New Playlist" dialog. |
| **A** | Rename | Opens the "Rename Playlist" dialog for the selected playlist. |
| **Delete** | Delete | Deletes the selected playlist (requires confirmation). |

---

## Source Page (Highlighter)

Accessed by opening a source or highlight. This is where you create new clips and manage strikethroughs.

### Playback

| Key | Action | Description |
| :--- | :--- | :--- |
| **Space** | Play / Pause | Toggles video playback. |
| **Q** | Seek | Seeks the video to the current position of the blue cursor. |
| **E** | Lock | Snaps the blue cursor to the current video playback time. |
| **M** | Mode | Toggles **Relative Mode** (useful for refined editing). |
| **S** | Cycle Speed | Cycles through playback speeds: 1x, 1.25x, 1.5x, ..., 3x. |
| **[ / ]** | Speed | Decreases or increases playback speed by 0.25x (0.25x - 4.0x). |
| **< / >** | Speed | Alternative keys to decrease or increase playback speed. |
| **\\** | Reset | Resets playback speed to 1.0x. |

### Navigation

| Key | Action | Description |
| :--- | :--- | :--- |
| **Left/Right Arrows** | Move Cursor | Moves the blue cursor by 1 cue (fine control). |
| **Cmd + ←/→** | Jump to Line | Jumps the blue cursor to the beginning or end of the current line. |
| **Cmd + F** | Find | Opens search bar to find text. **Enter** for next result, **Shift+Enter** for previous. |
| **Up/Down Arrows** | Move Cursor | Moves the blue cursor spatially to the line above or below. |
| **F** | Focus List | Toggles the Highlights List overlay for jumping between existing clips. |
| **T** | Transcript | Toggles the side transcript view. |

### Editing Actions

| Key | Action | Description |
| :--- | :--- | :--- |
| **1** | Highlight | Press to start selection, press again to create a **Highlight**. |
| **2** | Strikethrough | Press to start, press again to create a **Strikethrough** (removes from transcript). |
| **3** | Clear Highlight | Press to start, press again to **remove** highlights in that range. |
| **4** | Clean | Press to start, press again to **remove** strikethroughs in that range. |
| **5** | Strike Pauses | Automatically strikes through all "long pauses" (3 or more consecutive blank cues). |
| **Cmd + Z** | Undo | Reverts the last editing action. |
| **` / ~** | Cancel | Cancels the current pending selection. |
| **Esc** | Back / Close | Closes any open modal (Delete Confirmation, Find, Legend, etc.) or cancels selection. If no modal is open, triggers a **Confirmation Modal** before returning to the Dashboard. |
| **K / H** | Tag | Opens the Higher Key tagger for the segment the cursor is currently in. |
| **A** | Alias | Opens the renaming modal for the segment the cursor is currently in. |
| **Delete** | Delete | Deletes the highlight the cursor is currently in (requires confirmation). |

---

## Playlist Editor

A 3-column workspace for assembling your highlights into a sequence.

### Global Editor Actions

- **Left Arrow**: Move focus to the column on the left (**Vault** $\leftarrow$ **Sequence** $\leftarrow$ **Preview**).
- **Right Arrow**: Move focus to the column on the right (**Vault** $\rightarrow$ **Sequence** $\rightarrow$ **Preview**).
- **Esc**: Returns to the Dashboard with the **Playlist** tab focused.

### Vault Column (The Library)

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up / Down Arrows** | Navigate | Browse all available highlights. |
| **/** | Search | Focuses the search input. |
| **Enter** | Add | Adds the selected highlight to the end of the playlist. |
| **K** | Tag | Opens the Higher Key tagger for the selected highlight. |
| **A** | Alias | Opens the renaming modal for the selected highlight. |
| **D** | Delete | Deletes the highlight from the system (requires confirmation). |

### Sequence Column (The Playlist)

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up / Down Arrows** | Navigate | Browse clips in your current sequence. |
| **Shift + Up/Down Arrows** | Move | Reorders the selected clip within the sequence. |
| **Enter / V** | Preview | Plays the selected clip in the Preview column. |
| **D** | Remove | Deletes the highlight from the playlist sequence. |
| **K** | Tag | Opens the Higher Key tagger for the clip. |
| **A** | Alias | Opens the renaming modal for the clip. |

### Preview Column (The Player)

| Key | Action | Description |
| :--- | :--- | :--- |
| **Space** | Play / Pause | Toggles playback. |
| **Up / Down Arrows** | Skip | Jumps to the previous or next clip in the sequence. |
| **< / > (or , / .)** | Skip | Jumps to the previous or next clip in the sequence. |
| **R** | Reset | Restarts the current clip from its beginning. |

---

## Higher Key Manager

The hierarchical tree manager for organizing your tagging system.

| Key | Action | Description |
| :--- | :--- | :--- |
| **Up / Down Arrows** | Navigate | Move between keys or the gaps between them (for moving). |
| **Left Arrow** | Up Level | Return to the parent level. |
| **Right Arrow** | Drill Down | Enter the children of the selected key. |
| **Enter** | Rename / Drop | Rename the selected key, or drop a key you are currently moving. |
| **Shift** | Pick Up | "Pick up" a key to move it. Use Cmd+Shift to move to root. |
| **A** | Rename | Rename the focused key. |
| **N** | New | Create a new key at the current level. |
| **Backspace** | Delete | Deletes the selected key (requires confirmation). |
| **Space / V** | Select | Selects the key (when used as a tagger). |
| **`** | Cancel | Cancels a move in progress. |

---

## General UI Patterns

- **Inputs**: When focusing an input (Search, Rename), global shortcuts are disabled to allow typing. Press **Enter** to commit or **Esc** to blur and return to navigation.
- **Modals**: Most modals can be navigated with **Up / Down Arrows** and dismissed with **Esc**.
