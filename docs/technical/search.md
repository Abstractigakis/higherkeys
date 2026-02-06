# Search and Filtering Logic

This document outlines the requirements for searching and filtering content within the application. These are defined as **Database Searches**, focusing on the relational data flow rather than specific UI implementations.

The search system is built on a cascading logic where filtering one entity type automatically narrows down the results of related entity types.

## Core Entities

- **Sources**: The original video content.
- **Highlights**: Specific segments/clips derived from Sources.
- **Playlists**: Curated collections of Highlights.

---

## 1. Source Filter

When filtering by **Sources**, the application must apply the following cascade:

1. **Filter Sources**: Apply criteria (e.g., title, date, location) to the `sources` table.
2. **Filter Highlights**: Only return Highlights that reference the remaining Sources (`highlight.source_id` is in the filtered set).
3. **Filter Playlists**: Only return Playlists that reference the remaining Sources (i.e., Playlists containing at least one Highlight from the remaining Sources).

## 2. Highlights Filter

When filtering by **Highlights**, the application must apply the following cascade:

1. **Filter Highlights**: Apply criteria (e.g., description, time range, tags) to the `highlights` table.
2. **Filter Sources**:
    - Include Sources that are referenced by the remaining Highlights.
    - Exclude (Filter out) Sources that do not reference any of the remaining Highlights.
3. **Filter Playlists**: Only return Playlists that reference the remaining Highlights (i.e., Playlists containing at least one of the filtered Highlights).

## 3. Playlist Filter

When filtering by **Playlists**, the application must apply the following cascade:

1. **Filter Playlists**: Apply criteria (e.g., playlist name, creator) to the `playlists` table.
2. **Filter Highlights**: Only return Highlights that are contained within the filtered Playlists.
3. **Filter Sources**: Only return Sources that are parents of the remaining Highlights.

---

## Implementation Strategy

Given the **Supabase (Postgres)** architecture, the most scalable and maintainable approach is to move the filtering logic into the database layer rather than the client application.

### 1. Database Functions (Postgres RPC)

Instead of complex client-side joins, implement a single "Search RPC" function. This ensures that the cascading logic (e.g., "Filter Playlists that do not reference remaining highlights") is executed in a single transaction on the server.

**Example Logic (PL/pgSQL):**

- Accept `source_query`, `highlight_query`, and `playlist_query` as optional parameters.
- Use **Common Table Expressions (CTEs)** to derive the valid ID sets:
  - `filtered_sources`: All Sources matching text search or metadata filters.
  - `filtered_highlights`: (Highlights matching filters) INTERSECT (Highlights belonging to `filtered_sources`).
  - `filtered_playlists`: (Playlists matching filters) INTERSECT (Playlists containing `filtered_highlights`).

### 2. Scalability & Performance

- **Indexing**:
  - **B-tree Indexes**: Required on all foreign keys (`highlights.source_id`, `playlist_highlights.highlight_id`, `playlist_highlights.playlist_id`).
  - **GIN Indexes**: Use `to_tsvector` for full-text search on `sources.title`, `sources.description`, and `highlights.description`. This is significantly faster than `LIKE %query%` at scale.
- **Materialized Views**: If the dataset reaches millions of highlights, consider a Materialized View for "Searchable Content" that joins these entities. Use Supabase Triggers to refresh or "poke" the view when data changes.
- **Pagination**: Implement Keyset Pagination (using `created_at` or `id`) rather than Offset Pagination to ensure performance remains constant as users scroll deep into results.

### 3. Application Architecture

- **Global Search Context**: Manage the active search state in a global store (e.g., React Context or a specialized state manager).
- **TanStack Query Integrations**:
  - Use the search parameters as part of the `queryKey`.
  - When a user filters "Sources", the `queryKey` for Highlights and Playlists should also change, triggering an automatic refresh of the entire related dataset.
- **Supabase Realtime**: If search results need to update as new highlights are added, use Supabase's Realtime subscriptions on the primary tables to invalidate cached search results.

### 4. Search Ranking

Implement a simple ranking system using Postgres's `ts_rank`. Keywords found in a Source title should likely rank higher than keywords found in a long Highlight description.

---

## SQL Implementation

The following SQL script sets up the necessary indexes for performance and creates a unified search function that honors the cascading requirements.

### 1. Performance Indexes

```sql
-- Full-Text Search Indexes
CREATE INDEX IF NOT EXISTS idx_sources_fts ON public.sources USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_highlights_fts ON public.highlights USING GIN (to_tsvector('english', COALESCE(alias, '') || ' ' || COALESCE(description, ''))); -- Note: add description if it exists
CREATE INDEX IF NOT EXISTS idx_playlists_fts ON public.playlists USING GIN (to_tsvector('english', alias || ' ' || COALESCE(description, '')));

-- Foreign Key Indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_highlights_source_id ON public.highlights(source_id);
CREATE INDEX IF NOT EXISTS idx_playlist_highlights_highlight_id ON public.playlist_highlights(highlight_id);
CREATE INDEX IF NOT EXISTS idx_playlist_highlights_playlist_id ON public.playlist_highlights(playlist_id);
```

### 2. Cascading Search Function

This function allows the UI to pass a search term and a "primary filter type". It returns a JSON object containing the filtered sets for all three entities.

```sql
CREATE OR REPLACE FUNCTION public.search_content(
    search_term TEXT,
    primary_filter TEXT DEFAULT 'all' -- Options: 'source', 'highlight', 'playlist', 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH 
    -- 1. Initial filtered sets based on text search
    matched_sources AS (
        SELECT id FROM public.sources 
        WHERE (search_term = '' OR to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', search_term))
        AND profile_id = auth.uid()
    ),
    matched_highlights AS (
        SELECT id, source_id FROM public.highlights 
        WHERE (search_term = '' OR to_tsvector('english', COALESCE(alias, '')) @@ plainto_tsquery('english', search_term)) -- add description if available
        AND source_id IN (SELECT id FROM public.sources WHERE profile_id = auth.uid())
    ),
    matched_playlists AS (
        SELECT id FROM public.playlists 
        WHERE (search_term = '' OR to_tsvector('english', alias || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', search_term))
        AND profile_id = auth.uid()
    ),

    -- 2. Apply Cascading Logic based on Primary Filter
    final_entities AS (
        SELECT 
            CASE 
                WHEN primary_filter = 'source' THEN (SELECT array_agg(id) FROM matched_sources)
                WHEN primary_filter = 'highlight' THEN (
                    SELECT array_agg(DISTINCT source_id) FROM public.highlights WHERE id IN (SELECT id FROM matched_highlights)
                )
                WHEN primary_filter = 'playlist' THEN (
                    SELECT array_agg(DISTINCT s.id) 
                    FROM public.sources s
                    JOIN public.highlights h ON h.source_id = s.id
                    JOIN public.playlist_highlights ph ON ph.highlight_id = h.id
                    WHERE ph.playlist_id IN (SELECT id FROM matched_playlists)
                )
                ELSE (SELECT array_agg(id) FROM matched_sources)
            END as filtered_source_ids,

            CASE 
                WHEN primary_filter = 'source' THEN (
                    SELECT array_agg(id) FROM public.highlights WHERE source_id IN (SELECT id FROM matched_sources)
                )
                WHEN primary_filter = 'highlight' THEN (SELECT array_agg(id) FROM matched_highlights)
                WHEN primary_filter = 'playlist' THEN (
                    SELECT array_agg(highlight_id) FROM public.playlist_highlights WHERE playlist_id IN (SELECT id FROM matched_playlists)
                )
                ELSE (SELECT array_agg(id) FROM matched_highlights)
            END as filtered_highlight_ids,

            CASE 
                WHEN primary_filter = 'source' THEN (
                    SELECT array_agg(DISTINCT ph.playlist_id) 
                    FROM public.playlist_highlights ph
                    JOIN public.highlights h ON h.id = ph.highlight_id
                    WHERE h.source_id IN (SELECT id FROM matched_sources)
                )
                WHEN primary_filter = 'highlight' THEN (
                    SELECT array_agg(DISTINCT playlist_id) FROM public.playlist_highlights WHERE highlight_id IN (SELECT id FROM matched_highlights)
                )
                WHEN primary_filter = 'playlist' THEN (SELECT array_agg(id) FROM matched_playlists)
                ELSE (SELECT array_agg(id) FROM matched_playlists)
            END as filtered_playlist_ids
    )

    SELECT jsonb_build_object(
        'sources', (SELECT jsonb_agg(s.*) FROM public.sources s WHERE s.id = ANY(fe.filtered_source_ids)),
        'highlights', (SELECT jsonb_agg(h.*) FROM public.highlights h WHERE h.id = ANY(fe.filtered_highlight_ids)),
        'playlists', (SELECT jsonb_agg(p.*) FROM public.playlists p WHERE p.id = ANY(fe.filtered_playlist_ids))
    ) INTO result
    FROM final_entities fe;

    RETURN COALESCE(result, jsonb_build_object('sources', '[]'::jsonb, 'highlights', '[]'::jsonb, 'playlists', '[]'::jsonb));
END;
$$;
```

---

## Technical Notes

- **Relational Integrity**: The filters rely on the foreign key relationships:
  - `highlights.source_id` -> `sources.id`
  - `playlist_highlights.highlight_id` -> `highlights.id`
  - `playlist_highlights.playlist_id` -> `playlists.id`
