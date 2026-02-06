-- Comprehensive Backfill & Hierarchy Repair Script
-- This ensures all profiles, sources, and highlights have their required mirrored Higher Keys.
DO
$$
DECLARE
rec RECORD;
v_root_id UUID;
v_source_hk_id UUID;
v_count_roots INT := 0;
v_count_sources INT := 0;
v_count_highlights INT := 0;
v_username TEXT;
BEGIN
RAISE NOTICE 'Starting Higher Keys backfill...';
-- 1. STAGE: Profile Roots (Inboxes)
-- Every profile must have exactly one root key (parent_id IS NULL)
FOR rec IN
SELECT
    id,
    username
FROM
    public.profiles LOOP
    -- Get or create root
SELECT
    id INTO v_root_id
FROM
    public.higherkeys
WHERE
    profile_id = rec.id
    AND parent_id IS NULL
LIMIT
    1;
IF v_root_id IS NULL THEN v_username := COALESCE(
    rec.username,
    'user_' || substr(rec.id::text, 1, 8)
);
RAISE NOTICE 'Creating missing root for user % (%)',
v_username,
rec.id;
INSERT INTO
    public.higherkeys (profile_id, name, parent_id)
VALUES
    (rec.id, v_username, NULL)
RETURNING
    id INTO v_root_id;
v_count_roots := v_count_roots + 1;
END IF;
END LOOP;
-- 2. STAGE: Source Folders
-- Every Source must have a Higher Key (folder) parented by the User's Root.
FOR rec IN
SELECT
    id,
    profile_id,
    title,
    latitude,
    longitude
FROM
    public.sources LOOP
    -- Identify Root for this owner
SELECT
    id INTO v_root_id
FROM
    public.higherkeys
WHERE
    profile_id = rec.profile_id
    AND parent_id IS NULL
LIMIT
    1;
IF v_root_id IS NOT NULL THEN
-- Check if a source folder already exists
SELECT
    id INTO v_source_hk_id
FROM
    public.higherkeys
WHERE
    source_id = rec.id
    AND highlight_id IS NULL
LIMIT
    1;
IF v_source_hk_id IS NULL THEN RAISE NOTICE 'Creating missing Source folder for: %',
rec.title;
INSERT INTO
    public.higherkeys (
        profile_id,
        parent_id,
        source_id,
        name,
        latitude,
        longitude
    )
VALUES
    (
        rec.profile_id,
        v_root_id,
        rec.id,
        rec.title,
        rec.latitude,
        rec.longitude
    );
v_count_sources := v_count_sources + 1;
ELSE
-- Fix parenting if the source folder isn't in root
IF EXISTS (
    SELECT
        1
    FROM
        public.higherkeys
    WHERE
        id = v_source_hk_id
        AND (
            parent_id != v_root_id
            OR parent_id IS NULL
        )
) THEN
UPDATE
    public.higherkeys
SET
    parent_id = v_root_id
WHERE
    id = v_source_hk_id;
END IF;
END IF;
END IF;
END LOOP;
-- 3. STAGE: Highlight Shadow Keys
-- Every Highlight must have exactly one Shadow Key parented by its parent Source Folder.
FOR rec IN
SELECT
    h.id as h_id,
    h.source_id,
    h.alias,
    h.order_index,
    h.latitude,
    h.longitude,
    s.profile_id
FROM
    public.highlights h
    JOIN public.sources s ON s.id = h.source_id LOOP
    -- Find the "Source Folder" Higher Key (the container)
SELECT
    id INTO v_source_hk_id
FROM
    public.higherkeys
WHERE
    source_id = rec.source_id
    AND highlight_id IS NULL
LIMIT
    1;
IF v_source_hk_id IS NOT NULL THEN
-- Check if shadow key exists in that specific folder
IF NOT EXISTS (
    SELECT
        1
    FROM
        public.higherkeys
    WHERE
        highlight_id = rec.h_id
        AND parent_id = v_source_hk_id
) THEN RAISE NOTICE 'Creating Shadow Key for highlight: %',
COALESCE(rec.alias, 'Highlight ' || rec.h_id);
INSERT INTO
    public.higherkeys (
        profile_id,
        parent_id,
        highlight_id,
        source_id,
        name,
        order_index,
        latitude,
        longitude
    )
VALUES
    (
        rec.profile_id,
        v_source_hk_id,
        rec.h_id,
        rec.source_id,
        COALESCE(rec.alias, 'Highlight'),
        rec.order_index,
        rec.latitude,
        rec.longitude
    );
v_count_highlights := v_count_highlights + 1;
END IF;
END IF;
END LOOP;
-- 4. STAGE: Path Synchronization
-- If triggers were skipped, force a path update by touching the names
UPDATE
    public.higherkeys
SET
    name = name
WHERE
    path IS NULL;
RAISE NOTICE 'Backfill complete: % Roots, % Sources, % Highlights corrected.',
v_count_roots,
v_count_sources,
v_count_highlights;
END
$$
;