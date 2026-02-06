
# SPEC

A terse checklist that describes the app perfectly

## Global Functions

### Download

- [x] pressing 'D' key opens up Download menu
- [x] pasting link and pressing enter starts download
  - [x] If media server offline, report error modal
  - [x] Source record is created, status='gathering meta data'
  - [x] YouTube API is called for meta data
  - [x] Higherkey is created with video title
  - [x] Source is updated with meta data, status='getting thumbnail'
  - [x] Thumbnail is downloaded and uploaded
  - [x] Source record is updated, status='downloading'
  - [x] Video download starts
  - [x] Source record is updated, status='processing'
  - [x] YouTube subtitles used if available, else Vosk
  - [x] Transcript gaps filled with 'BLANK' entries
  - [x] Word-level VTT/TXT generated
  - [x] Source record is updated, status='uploading'
  - [x] Processed files (HLS, etc.) uploaded to storage
  - [x] Source record is updated, status='completed'

### Upload

- [x] pressing 'U' key opens up Upload menu
- [x] selecting file and pressing enter starts upload
  - [x] If media server offline, report error modal
  - [x] Source record is created, status='uploading'
  - [x] File is streamed to media server
  - [x] Higherkey is created with filename
  - [x] Source record is updated, status='getting thumbnail'
  - [x] Thumbnail is generated and uploaded
  - [x] Source record is updated, status='processing'
  - [x] Vosk transcription model is always used
  - [x] Transcript gaps filled with 'BLANK' entries
  - [x] Word-level VTT/TXT generated
  - [x] Source record is updated, status='uploading'
  - [x] Processed files (HLS, etc.) uploaded to storage
  - [x] Source record is updated, status='completed'

### Keyboard Legend

- [x] pressing 'L' key toggles the shortcut cheat sheet
- [x] Automatically disabled when input fields (Search, Aliaser, Folder names etc.) are focused
- [x] Legend is context-aware (shows Highlighter keys in video view, Tree keys in menu)
- [x] Clicking the backdrop or an 'X' button closes the legend

## Dashboard Shortcuts

- [x] `Up / Down`: Select Source
- [x] `Left / Right`: Browse Highlights
- [x] `Enter`: Open Focused
- [x] `P`: Play Source Playlist (Navigates to Playlist Player for the selected source)
- [x] `Tab`: Toggle Higher Key Manager Modal
- [x] `D`: Download Menu
- [x] `U`: Upload Menu
- [x] `L`: Toggle Legend
- [x] `X`: Clear Filters

## Dashboard Content

- [x] Sources are listed with their highlights
- [x] Keyboard navigation for sources and highlights
- [x] Highlights display their associated Higher Keys (tags/folders)
  - [x] **Path Filtering**: Highlight path `a.b.c.e.f.g` (where `a` is profile and `g` is highlight name) only shows segments `b/c/e/f`.
  - [x] **Source Key Exclusion**: If the immediate parent `f` is a Source Key (represents the video itself), the Higher Key is not displayed on the Dashboard.
  - [x] **No Source Titles**: Segments in the Higher Key path must never include the title of any source.

## Highlighter

The main curation UI for sources.

### Concepts

- **Blue Cursor**: A navigation cursor used for range selection and transcript browsing. Can be locked to the Playhead (Yellow) or move independently.
- **Relative Duration**: When in Relative Mode, durations are shown as time minus the sum of preceding strikethroughs.
- **Transcript**: Word-level synchronized text with "BLANK" markers for audio gaps. Allows clicking words to navigate.
- **Undo Stack**: Maintains a history of mutations (creations, deletions, strikes) for quick reversal.

### Navigation

- [x] `Space` toggles Play/Pause
- [x] `m` toggles **Relative Mode** (skips strikethroughs during playback)
- [x] `Meta+f` opens **Search Overlay** to find text in transcript
  - [x] `Enter` / `Shift+Enter` to navigate search results
- [x] `Arrow keys` navigate the blue cursor (word-by-word or line-by-line)
  - [x] `Meta+Left/Right` jumps to start/end of transcript lines
- [x] `q` seeks the video playhead to the current blue cursor position
- [x] `e` locks/unlocks the blue cursor to the video playhead
- [x] `.` / `,` skips to the next/previous highlight
- [x] `s` cycles playback rate (1.0x to 3.0x)
- [x] `[` / `]` decreases/increases playback rate (+/- 0.25)
- [x] `\` resets playback rate to 1.0x

### Operations

- [x] `1` starts/completes a **Highlight** selection
  - [x] Record created in `highlights` table
  - [x] **Shadow Mirror**: `HigherKey` created under parent Source Key (Immutable)
  - [x] GPS coordinates pinned to all three entity records
- [x] `2` starts/completes a **Strikethrough** selection
  - [x] Record created in `highlights` with `is_strikethrough = true`
  - [x] Mirror HigherKeys created for structural tracking
  - [x] Playback logic skipping range in Relative Mode enabled
- [x] `3` starts/completes a **Clear Highlight** selection (removes highlight labels)
  - [x] Intersecting non-strikethrough highlights identified
  - [x] Records deleted if covered, or truncated if overlapping
  - [x] HigherKey mirrors automatically cleaned up via database cascade
- [x] `4` starts/completes a **Clean** selection (removes strikethroughs)
  - [x] Intersecting `is_strikethrough` highlights removed or trimmed
  - [x] Video segments restored to playback visibility
- [x] `5` automatically strikes through long pauses (3+ "BLANK" words)
  - [x] Scans transcript for consecutive blank markers
  - [x] Batch inserts strikethrough highlights for all discovered gaps
- [x] `~` or `` ` `` cancels any active selection mode
- [x] `Meta+z` undos the last action
- [x] `k` opens the **Higher Key Tagger** for the focused highlight
- [x] `a` opens the **Aliaser** to rename the focused highlight
- [x] `Delete` / `Backspace` deletes the focused highlight

### General & Shortcuts

- [x] `Esc` closes modals, cancels selections, or triggers exit confirmation
- [x] All shortcuts are global to the highlighter view unless a modal is focused

### Organization & Views

- [x] `h` or `f` toggles the **Highlights List** overlay
- [x] `t` toggles the visibility of the **Transcript Overlay**
- [x] `Tab` opens the **Higher Keys Tree** (Global Mode)
- [x] `k` toggles the **Higher Key Tagger** for the focused highlight
- [x] **Yellow Progress Bar**: Visual indicator of playback progress against the total source duration at the bottom of the screen.

### Higher Keys Menu Controls

The Higher Keys menu (Tab/K) operates in two distinct modes with shared navigation.

#### Shared Controls

- [x] `Arrow Keys` (Up/Down) to navigate items
- [x] `ArrowRight` to drill down into a folder
- [x] `ArrowLeft` to go up to the parent folder
- [x] `n` to create a new folder
  - [x] Record created in `higherkeys` table with `parent_id`
  - [x] `ltree` path automatically generated
- [x] a to rename a folder or **Shadow Key**
  - [x] name updated; all descendant paths refreshed via trigger
  - [x] **Shadow Sync**: Renaming a Shadow Key updates the associated highlight's alias.
- [x] `Backspace` / `Delete` to remove a folder or highlight reference
  - [x] Recursive deletion for folders; single record for highlights

#### Global Tree Mode (`Tab`)

- [x] `Enter` on a folder drills down; on a highlight, navigates to its source
- [x] `Shift` starts a **Move** operation (reparent folder/highlight)
  - [x] `parent_id` updated in `higherkeys` table
  - [x] `path` and all children's paths updated via recursive trigger
  - [x] Blocked if target is a deterministic Source Folder
- [x] `Control` starts a **Copy** operation
  - [x] Recursive duplication of folder structure or highlight reference
- [x] `Enter` while moving/copying commits the action to the current folder
- [x] `p` plays the current folder or highlight as a playlist

#### Tagger Mode (`k`)

- [x] `Enter` / `Space` / `v` toggles the tag for the highlighted folder
  - [x] **Context Mirror**: `HigherKey` created/deleted in the target folder
  - [x] Deterministic media mirrors are blocked from being manual tag targets
- [x] `k` / `d` to finish tagging and close the menu
- [x] Visual indicator showing the count of highlights being tagged

## Playlist Page

Immersive playback environment for Higher Key collections.

- [x] Full-screen video player with scrollable sidebar of recursive highlights
- [x] `Space` to toggle Play/Pause
- [x] `.` / `,` (or `> / <`) skip to next/previous highlight
- [x] `Arrow Keys` navigate highlights (Blue Cursor) or move items in Move mode
- [x] `Enter` on a list item seeks and plays that highlight
- [x] `q` seeks the video playhead to the current blue cursor position
- [x] `e` locks/unlocks blue cursor to playhead
- [x] `m` toggles **Relative Mode** (skips strikethroughs)
- [x] `t` toggles **Transcript Overlay**
- [x] `k` opens **Higher Key Tagger** for focused highlight
- [x] `a` opens **Aliaser** for focused highlight
- [x] `Delete` / `Backspace` removes highlight from the current Higher Key folder
- [x] `Shift` toggles **Move Mode** for reordering highlights
  - [x] `Arrow Keys` swap position of the moving item
  - [x] `order_index` persists to `higherkeys` table on swap
- [x] **Auto-Advance**: Seamlessly plays the next highlight in sequence upon completion
- [x] `L` toggles playlist-specific shortcut legend
- [x] `Tab` opens **Higher Keys Tree** (Global Mode)
- [ ] **Shuffle Mode**: Toggled via `u` key, randomizes playback order without affecting `order_index`
- [ ] **Loop Mode**: Toggled via `r` key, restarts the playlist or current highlight
- [x] **Playlist Progress**: Visual indicator of total playlist duration and current position
- [x] **Breadcrumbs**: Show the path of the current Higher Key folder at the top
- [x] **Playback Rate**: `[` / `]` and `\` keys for speed control (consistent with Highlighter)
- [x] **Continuous Transcript**: Single flowing stream of cues across all clips in the playlist
