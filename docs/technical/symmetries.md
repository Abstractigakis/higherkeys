# Hierarchical Symmetries

The Higher Keys System (HKS) maintains a strict structural symmetry between raw media content and the organizational hierarchy. This ensures that the relationship between sources and their highlights is always preserved and discoverable within the folder system.

## The Core Principle

Every piece of media content (Sources and Highlights) exists as one or more "mirrored" entries in the Higher Key hierarchy.

A content item is not just *tagged* with a Higher Key; it *is* a HigherKey.

## 1. Source-Highlight Symmetry

When media is created, HKS automatically generates a shadow hierarchy that mirrors the database relationship:

1. **Source Creation**: When a `Source` is created, a corresponding `HigherKey` is generated. This key represents the source itself.
2. **Highlight Creation**: When a `Highlight` is created, a corresponding `HigherKey` is generated.
    * **The Anchor Link**: This generated key's `parent_id` is set to the `HigherKey` of its parent `Source`.
    * This creates a permanent, immutable branch in the hierarchy where a Source acts as a "folder" for all its derived Highlights.

## 2. Multi-Key Requirements

To ensure content is always organized and never "lost," the system enforces minimum key counts:

### Sources

Every **Source** must have **at least 1** Higher Key.

* By default, this is placed in the user's **Root Higher Key** (Inbox).
* It serves as the primary entry point for the source in the file system.

### Highlights

Every **Highlight** must have **at least 1** Higher Key:

1. **The Shadow Key**: The key that links the highlight to its parent Source's Higher Key (the "Anchor").

This ensures that the system always maintains the link to the *origin* (Shadow Key) within the hierarchy. Users can manually add highlights to other folders (Context Keys) as needed.

## 3. Structural Integrity Constraints

To preserve the relationship between a Source and its Highlights, specific immutability rules apply:

* **Descendant Protection**: Users may not move or delete any `HigherKey` that is a descendant of a "Source Higher Key" if it represents the primary link to a `Highlight`.
* **Source Integrity**: Deleting a Source's primary Higher Key is restricted if it would orphan the underlying media entity without a valid placement.
* **Automatic Synchronization**: If a Source or Highlight is deleted, its corresponding mirrored Higher Keys are automatically cleaned up to maintain synchronization.

## Why "Symmetries"?

The term **Symmetry** refers to the fact that for every relationship in the "Content Layer" (Highlight -> Source), there is a mirrored relationship in the "Hierarchy Layer" (HighlightKey -> SourceKey).

This architecture allows the application to treat the entire media library as a unified file system, where folders, videos, and clips are all navigated using the same recursive logic.
