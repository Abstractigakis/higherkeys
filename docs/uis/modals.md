# Confirmation and Deletion Modals

This document tracks all confirmation, deletion, and "are you sure" style modals/dialogs across the project.

## Web Project (`/web`)

### AlertDialog Components (Shadcn UI)

| Component | Modal Title | Purpose | File Path |
|-----------|-------------|---------|-----------|
| `DashboardContainer` | Delete Source | Deletes a source and all its highlights | [web/components/dashboard-container.tsx](web/components/dashboard-container.tsx) |
| `DashboardContainer` | Delete Highlight / Untag Highlight | Deletes a highlight or removes it from a folder | [web/components/dashboard-container.tsx](web/components/dashboard-container.tsx) |
| `HigherKeyEditor` | Delete Higher Key? | Deletes a folder and all nested subfolders | [web/components/higherkeys/higher-key-editor.tsx](web/components/higherkeys/higher-key-editor.tsx) |
| `HigherKeysEditor` (Dashboard) | Delete Higher Key? | Deletes a folder and all nested subfolders | [web/components/dashboard/higher-keys-editor.tsx](web/components/dashboard/higher-keys-editor.tsx) |
| `ProfileModal` | Sign Out | Confirmation before logging out | [web/components/dashboard/profile-modal.tsx](web/components/dashboard/profile-modal.tsx) |
| `HighlighterContainer` | Delete Highlight | Deletes a highlight while editing | [web/components/highlighter/highlighter-container.tsx](web/components/highlighter/highlighter-container.tsx) |
| `HighlighterContainer` | Return to Dashboard? | Confirmation before exiting without saving | [web/components/highlighter/highlighter-container.tsx](web/components/highlighter/highlighter-container.tsx) |

### Native Confirmation Dialogs (`window.confirm`)

| Purpose | File Path |
|---------|-----------|
| Remove highlight from folder | [web/components/dashboard/higher-keys-editor.tsx](web/components/dashboard/higher-keys-editor.tsx#L484) |
| Remove highlight from folder | [web/components/higherkeys/higher-key-editor.tsx](web/components/higherkeys/higher-key-editor.tsx#L340) |
| Remove clip from playlist | [web/app/playlist/[id]/playlist-player.tsx](web/app/playlist/[id]/playlist-player.tsx#L412) |

---
*Note: All modals using `AlertDialog` have been standardized with consistent styling:*

- `p-0` and `overflow-hidden` on `AlertDialogContent`
- `p-6` and `text-left` on `AlertDialogHeader`
- `p-6`, `bg-white/5`, and `border-t` on `AlertDialogFooter`
- `h-9` and `text-[10px]` on action buttons
- `sm:max-w-md` for consistent width
