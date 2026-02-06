-- Seed Script for HKS Database
-- Simplified Architecture: Direct GPS on Entities
-- ==========================================
-- 0. EXTENSIONS
-- ==========================================
create extension if not exists ltree;
-- ==========================================
-- 1. PROFILES
-- ==========================================
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    updated_at timestamp with time zone,
    username text unique,
    full_name text,
    avatar_url text,
    constraint username_length check (char_length(username) >= 3)
);
alter table
    public.profiles enable row level security;
do
$$
begin
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'profiles'
        and policyname = 'Public profiles are viewable by everyone.'
) then create policy "Public profiles are viewable by everyone." on public.profiles for
select
    using (true);
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'profiles'
        and policyname = 'Users can insert their own profile.'
) then create policy "Users can insert their own profile." on public.profiles for
insert
    with check (auth.uid() = id);
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'profiles'
        and policyname = 'Users can update own profile.'
) then create policy "Users can update own profile." on public.profiles for
update
    using (auth.uid() = id);
end if;
end
$$
;
-- ==========================================
-- 2. SOURCES
-- ==========================================
create table if not exists public.sources (
    id uuid not null default gen_random_uuid () primary key,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'pending',
    thumbnail_url text,
    metadata jsonb,
    duration float8 not null default 0,
    strikethroughs float8 [] not null default '{}',
    latitude float8,
    longitude float8,
    created_at timestamp with time zone not null default now()
);
alter table
    public.sources enable row level security;
do
$$
begin
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'sources'
        and policyname = 'Users can view their own sources.'
) then create policy "Users can view their own sources." on public.sources for
select
    using (auth.uid() = profile_id);
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'sources'
        and policyname = 'Users can insert their own sources.'
) then create policy "Users can insert their own sources." on public.sources for
insert
    with check (auth.uid() = profile_id);
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'sources'
        and policyname = 'Users can update their own sources.'
) then create policy "Users can update their own sources." on public.sources for
update
    using (auth.uid() = profile_id);
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'sources'
        and policyname = 'Users can delete their own sources.'
) then create policy "Users can delete their own sources." on public.sources for delete using (auth.uid() = profile_id);
end if;
end
$$
;
-- ==========================================
-- 3. HIGHLIGHTS
-- ==========================================
create table if not exists public.highlights (
    id uuid not null default gen_random_uuid() primary key,
    source_id uuid not null references public.sources(id) on delete cascade,
    alias text,
    start_time float8 not null,
    end_time float8 not null,
    is_strikethrough boolean not null default false,
    latitude float8,
    longitude float8,
    order_index int default 0,
    created_at timestamp with time zone not null default now(),
    constraint check_times check (start_time < end_time)
);
alter table
    public.highlights enable row level security;
do
$$
begin
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'highlights'
        and policyname = 'Users can view highlights for their sources'
) then create policy "Users can view highlights for their sources" on public.highlights for
select
    using (
        exists (
            select
                1
            from
                public.sources
            where
                sources.id = highlights.source_id
                and sources.profile_id = auth.uid()
        )
    );
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'highlights'
        and policyname = 'Users can insert highlights for their sources'
) then create policy "Users can insert highlights for their sources" on public.highlights for
insert
    with check (
        exists (
            select
                1
            from
                public.sources
            where
                sources.id = highlights.source_id
                and sources.profile_id = auth.uid()
        )
    );
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'highlights'
        and policyname = 'Users can update highlights for their sources'
) then create policy "Users can update highlights for their sources" on public.highlights for
update
    using (
        exists (
            select
                1
            from
                public.sources
            where
                sources.id = highlights.source_id
                and sources.profile_id = auth.uid()
        )
    );
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'highlights'
        and policyname = 'Users can delete highlights for their sources'
) then create policy "Users can delete highlights for their sources" on public.highlights for delete using (
    exists (
        select
            1
        from
            public.sources
        where
            sources.id = highlights.source_id
            and sources.profile_id = auth.uid()
    )
);
end if;
end
$$
;
create index if not exists highlights_source_id_idx on public.highlights(source_id);
-- ==========================================
-- 4. HIGHER KEYS
-- ==========================================
create table if not exists public.higherkeys (
    id uuid not null default gen_random_uuid() primary key,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    parent_id uuid references public.higherkeys(id) on delete cascade,
    source_id uuid references public.sources(id) on delete cascade,
    highlight_id uuid references public.highlights(id) on delete cascade,
    name text not null,
    description text,
    color text,
    order_index int default 0,
    path ltree,
    latitude float8,
    longitude float8,
    created_at timestamp with time zone not null default now(),
    constraint check_hk_type check (
        (highlight_id is null)
        or (source_id is not null)
    )
);
alter table
    public.higherkeys enable row level security;
do
$$
begin
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'higherkeys'
        and policyname = 'Users can manage their own higherkeys'
) then create policy "Users can manage their own higherkeys" on public.higherkeys for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
end if;
end
$$
;
create index if not exists higherkeys_path_gist_idx on public.higherkeys using gist (path);
-- ==========================================
-- ROOT HIGHER KEY MANAGEMENT
-- ==========================================
-- Helper to sanitize names for ltree labels
drop function if exists public.slugify_label(text);
create
or replace function public.slugify_label(txt text) returns text as
$$
declare
slug text;
begin
slug := regexp_replace(lower(txt), '[^a-z0-9]', '_', 'g');
slug := regexp_replace(slug, '_+', '_', 'g');
slug := trim(
    both '_'
    from
        slug
);
if slug = '' then slug := 'u';
end if;
return slug;
end;
$$
language plpgsql immutable;
create
or replace function public.handle_new_profile_root_hk() returns trigger as
$$
begin
insert into
    public.higherkeys (profile_id, name, parent_id, path)
values
    (
        new.id,
        new.username,
        null,
        text2ltree(public.slugify_label(new.username))
    );
return new;
end;
$$
language plpgsql;
drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
after
insert
    on public.profiles for each row execute procedure public.handle_new_profile_root_hk();
create
or replace function public.handle_update_profile_root_hk() returns trigger as
$$
begin
if (
    old.username is distinct
    from
        new.username
) then
update
    public.higherkeys
set
    name = new.username,
    path = text2ltree(public.slugify_label(new.username))
where
    profile_id = new.id
    and parent_id is null;
end if;
return new;
end;
$$
language plpgsql;
drop trigger if exists on_profile_updated_username on public.profiles;
create trigger on_profile_updated_username
after
update
    on public.profiles for each row execute procedure public.handle_update_profile_root_hk();
-- ==========================================
-- AUTO-HK FOR SOURCES
-- ==========================================
create
or replace function public.handle_source_auto_hk() returns trigger as
$$
declare
root_id uuid;
begin
-- Find root HK
select
    id into root_id
from
    public.higherkeys
where
    profile_id = new.profile_id
    and parent_id is null
limit
    1;
if root_id is not null then
insert into
    public.higherkeys (
        profile_id,
        parent_id,
        source_id,
        name,
        latitude,
        longitude
    )
values
    (
        new.profile_id,
        root_id,
        new.id,
        new.title,
        new.latitude,
        new.longitude
    );
end if;
return new;
end;
$$
language plpgsql;
drop trigger if exists on_source_created on public.sources;
create trigger on_source_created
after
insert
    on public.sources for each row execute procedure public.handle_source_auto_hk();
create
or replace function public.handle_source_updated() returns trigger as
$$
begin
if (
    old.title is distinct
    from
        new.title
) then
update
    public.higherkeys
set
    name = new.title
where
    source_id = new.id
    and highlight_id is null;
end if;
return new;
end;
$$
language plpgsql;
drop trigger if exists on_source_updated on public.sources;
create trigger on_source_updated
after
update
    on public.sources for each row execute procedure public.handle_source_updated();
-- ==========================================
-- AUTO-HK FOR HIGHLIGHTS
-- ==========================================
create
or replace function public.handle_highlight_auto_hk() returns trigger as
$$
declare
source_hk_id uuid;
s_profile_id uuid;
begin
-- Get profile_id from source
select
    profile_id into s_profile_id
from
    public.sources
where
    id = new.source_id;
-- Find the "Source Higher Key" for this source
select
    id into source_hk_id
from
    public.higherkeys
where
    source_id = new.source_id
    and highlight_id is null
limit
    1;
-- 1. Create the Shadow Key (Structural link under Source Key)
if source_hk_id is not null then
insert into
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
values
    (
        s_profile_id,
        source_hk_id,
        new.id,
        new.source_id,
        coalesce(new.alias, 'Highlight'),
        new.order_index,
        new.latitude,
        new.longitude
    );
end if;
return new;
end;
$$
language plpgsql;
drop trigger if exists on_highlight_created on public.highlights;
create trigger on_highlight_created
after
insert
    on public.highlights for each row execute procedure public.handle_highlight_auto_hk();
create
or replace function public.handle_highlight_updated() returns trigger as
$$
begin
if (
    old.alias is distinct
    from
        new.alias
        or old.order_index is distinct
    from
        new.order_index
) then
update
    public.higherkeys
set
    name = coalesce(new.alias, 'Highlight'),
    order_index = new.order_index
where
    highlight_id = new.id;
end if;
return new;
end;
$$
language plpgsql;
drop trigger if exists on_highlight_updated on public.highlights;
create trigger on_highlight_updated
after
update
    on public.highlights for each row execute procedure public.handle_highlight_updated();
-- ==========================================
-- HIGHER KEY IMMUTABILITY & PROTECTION
-- ==========================================
create
or replace function public.check_higherkey_immutability() returns trigger as
$$
declare
current_parent_is_source boolean := false;
target_parent_is_source boolean := false;
begin
-- 1. INSERT Protection
if (TG_OP = 'INSERT') then if (new.parent_id is not null) then
select
    (
        source_id is not null
        and highlight_id is null
    ) into target_parent_is_source
from
    public.higherkeys
where
    id = new.parent_id;
-- If trying to insert into a Source Key manually (without proper media IDs)
if (
    target_parent_is_source = true
    and (
        new.highlight_id is null
        or new.source_id is null
    )
) then raise exception 'Cannot manually add items to a deterministic Source folder.';
end if;
end if;
return new;
end if;
-- 2. UPDATE Protection
if (TG_OP = 'UPDATE') then
-- A. Source Key mobility (always permitted to move the folder itself)
if (
    old.source_id is not null
    and old.highlight_id is null
) then return new;
end if;
-- B. Shadow Key protection (prevent moving/reordering children of source keys)
if (old.parent_id is not null) then
select
    (
        source_id is not null
        and highlight_id is null
    ) into current_parent_is_source
from
    public.higherkeys
where
    id = old.parent_id;
if (current_parent_is_source = true) then if (
    new.parent_id is distinct
    from
        old.parent_id
) then raise exception 'Shadow Keys cannot be moved out of their parent Source.';
end if;
if (
    new.order_index is distinct
    from
        old.order_index
) then raise exception 'Reordering within a deterministic Source folder is not permitted.';
end if;
end if;
end if;
-- C. Target folder protection (prevent moving things INTO a source key)
if (
    new.parent_id is distinct
    from
        old.parent_id
        and new.parent_id is not null
) then
select
    (
        source_id is not null
        and highlight_id is null
    ) into target_parent_is_source
from
    public.higherkeys
where
    id = new.parent_id;
if (target_parent_is_source = true) then raise exception 'Cannot move items into a deterministic Source folder.';
end if;
end if;
end if;
-- 3. DELETE Protection
if (TG_OP = 'DELETE') then
-- We ONLY block deletion if the media entity still exists in its primary table.
-- This allows ON DELETE CASCADE to work when the video or highlight is deleted.
-- Source keys
if (
    old.source_id is not null
    and old.highlight_id is null
) then if exists (
    select
        1
    from
        public.sources
    where
        id = old.source_id
) then raise exception 'Source folders are deterministic and cannot be deleted manually.';
end if;
end if;
-- Shadow keys
if (old.highlight_id is not null) then
-- If it's inside a source folder, check if highlight still exists
select
    (
        source_id is not null
        and highlight_id is null
    ) into current_parent_is_source
from
    public.higherkeys
where
    id = old.parent_id;
if (current_parent_is_source = true) then if exists (
    select
        1
    from
        public.highlights
    where
        id = old.highlight_id
) then raise exception 'Items inside deterministic Source folders cannot be deleted manually.';
end if;
end if;
end if;
return old;
end if;
return new;
end;
$$
language plpgsql;
-- Note: We'll apply this trigger after updating the schema for better cascading.
-- Path maintenance functions
drop function if exists public.update_higherkeys_path() cascade;
create
or replace function public.update_higherkeys_path() returns trigger as
$$
declare
v_parent_path ltree;
begin
if NEW.parent_id IS NULL THEN NEW.path = public.slugify_label(NEW.name)::ltree;
ELSE
SELECT
    path INTO v_parent_path
FROM
    public.higherkeys
WHERE
    id = NEW.parent_id;
NEW.path = v_parent_path || public.slugify_label(NEW.name)::ltree;
END IF;
RETURN NEW;
end;
$$
language plpgsql;
drop function if exists public.update_higherkeys_children_path() cascade;
create
or replace function public.update_higherkeys_children_path() returns trigger as
$$
begin
if (TG_OP = 'UPDATE')
and (
    OLD.path IS DISTINCT
    FROM
        NEW.path
) then
update
    public.higherkeys
set
    path = NEW.path || subpath(path, nlevel(OLD.path))
where
    path <@ OLD.path
    and id != NEW.id;
end if;
return null;
end;
$$
language plpgsql;
-- Triggers for path maintenance
drop trigger if exists trig_update_higherkeys_path on public.higherkeys;
create trigger trig_update_higherkeys_path before
insert
    or
update
    of name,
    parent_id on public.higherkeys for each row execute function public.update_higherkeys_path();
drop trigger if exists trig_update_higherkeys_children_path on public.higherkeys;
create trigger trig_update_higherkeys_children_path
after
update
    of path on public.higherkeys for each row execute function public.update_higherkeys_children_path();
-- Apply Immutability Protection
drop trigger if exists trig_higherkey_immutability on public.higherkeys;
create trigger trig_higherkey_immutability before
insert
    or
update
    of parent_id,
    order_index on public.higherkeys for each row execute function public.check_higherkey_immutability();
-- ==========================================
-- 5. AUTH TRIGGERS
-- ==========================================
drop function if exists public.handle_new_user() cascade;
create
or replace function public.handle_new_user() returns trigger as
$$
declare
v_username text;
begin
v_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    'user_' || substr(new.id::text, 1, 8)
);
insert into
    public.profiles (id, full_name, avatar_url, username)
values
    (
        new.id,
        COALESCE(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            'New User'
        ),
        new.raw_user_meta_data ->> 'avatar_url',
        v_username
    ) on conflict (id) do
update
set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    username = excluded.username;
-- Create Root Higher Key
begin
insert into
    public.higherkeys (profile_id, name, path)
values
    (
        new.id,
        v_username,
        public.slugify_label(v_username)::ltree
    );
exception
when others then null;
end;
return new;
end;
$$
language plpgsql security definer
set
    search_path = public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after
insert
    on auth.users for each row execute procedure public.handle_new_user();
-- ==========================================
-- 6. STORAGE
-- ==========================================
insert into
    storage.buckets (id, name, public, file_size_limit)
values
    ('avatars', 'avatars', true, 52428800) on conflict (id) do nothing;
insert into
    storage.buckets (id, name, public, file_size_limit)
values
    ('sources', 'sources', true, 5368709120) on conflict (id) do
update
set
    file_size_limit = 5368709120;
do
$$
begin
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'objects'
        and policyname = 'Avatar images are publicly accessible.'
) then create policy "Avatar images are publicly accessible." on storage.objects for
select
    using (bucket_id = 'avatars');
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'objects'
        and policyname = 'Anyone can upload an avatar.'
) then create policy "Anyone can upload an avatar." on storage.objects for
insert
    with check (bucket_id = 'avatars');
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'objects'
        and policyname = 'Users can view their own source files.'
) then create policy "Users can view their own source files." on storage.objects for
select
    using (
        bucket_id = 'sources'
        and auth.uid() = owner
    );
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'objects'
        and policyname = 'Users can upload source files.'
) then create policy "Users can upload source files." on storage.objects for
insert
    with check (
        bucket_id = 'sources'
        and auth.role() = 'authenticated'
    );
end if;
if not exists (
    select
        1
    from
        pg_policies
    where
        tablename = 'objects'
        and policyname = 'Users can delete their own source files.'
) then create policy "Users can delete their own source files." on storage.objects for delete using (
    bucket_id = 'sources'
    and auth.uid() = owner
);
end if;
end
$$
;
-- ==========================================
-- 7. REALTIME
-- ==========================================
begin
;
drop publication if exists supabase_realtime;
create publication supabase_realtime;
commit;
alter publication supabase_realtime
add
    table public.profiles;
alter publication supabase_realtime
add
    table public.sources;
alter publication supabase_realtime
add
    table public.highlights;
alter publication supabase_realtime
add
    table public.higherkeys;
-- ==========================================
-- 8. SEARCH & FILTERING LOGIC
-- ==========================================
-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sources_fts ON public.sources USING GIN (
    to_tsvector(
        'english',
        title || ' ' || COALESCE(description, '')
    )
);
CREATE INDEX IF NOT EXISTS idx_highlights_fts ON public.highlights USING GIN (to_tsvector('english', COALESCE(alias, '')));
-- Unified Cascading Search Function
drop function if exists public.search_content(text, text);
CREATE
OR REPLACE FUNCTION public.search_content(
    search_term TEXT,
    primary_filter TEXT DEFAULT 'all' -- Options: 'source', 'highlight', 'all'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS
$$
DECLARE
result JSONB;
BEGIN
WITH
-- 1. Initial filtered sets based on text search
matched_sources AS (
    SELECT
        id
    FROM
        public.sources
    WHERE
        (
            search_term = ''
            OR title ILIKE '%' || search_term || '%'
            OR COALESCE(description, '') ILIKE '%' || search_term || '%'
            OR to_tsvector(
                'english',
                title || ' ' || COALESCE(description, '')
            ) @@ plainto_tsquery('english', search_term)
        )
        AND profile_id = auth.uid()
),
matched_highlights AS (
    SELECT
        id,
        source_id
    FROM
        public.highlights
    WHERE
        (
            search_term = ''
            OR alias ILIKE '%' || search_term || '%'
            OR to_tsvector('english', COALESCE(alias, '')) @@ plainto_tsquery('english', search_term)
        )
        AND source_id IN (
            SELECT
                id
            FROM
                public.sources
            WHERE
                profile_id = auth.uid()
        )
),
-- 2. Apply Cascading Logic based on Primary Filter
final_entities AS (
    SELECT
        CASE
            WHEN primary_filter = 'source' THEN (
                SELECT
                    array_agg(id)
                FROM
                    matched_sources
            )
            WHEN primary_filter = 'highlight' THEN (
                SELECT
                    array_agg(DISTINCT source_id)
                FROM
                    public.highlights
                WHERE
                    id IN (
                        SELECT
                            id
                        FROM
                            matched_highlights
                    )
            )
            ELSE (
                SELECT
                    array_agg(id)
                FROM
                    matched_sources
            )
        END as filtered_source_ids,
        CASE
            WHEN primary_filter = 'source' THEN (
                SELECT
                    array_agg(id)
                FROM
                    public.highlights
                WHERE
                    source_id IN (
                        SELECT
                            id
                        FROM
                            matched_sources
                    )
            )
            WHEN primary_filter = 'highlight' THEN (
                SELECT
                    array_agg(id)
                FROM
                    matched_highlights
            )
            ELSE (
                SELECT
                    array_agg(id)
                FROM
                    matched_highlights
            )
        END as filtered_highlight_ids
)
SELECT
    jsonb_build_object(
        'sources',
        (
            SELECT
                COALESCE(jsonb_agg(s.*), '[]'::jsonb)
            FROM
                public.sources s
            WHERE
                s.id = ANY(fe.filtered_source_ids)
        ),
        'highlights',
        (
            SELECT
                COALESCE(jsonb_agg(h.*), '[]'::jsonb)
            FROM
                public.highlights h
            WHERE
                h.id = ANY(fe.filtered_highlight_ids)
        )
    ) INTO result
FROM
    final_entities fe;
RETURN COALESCE(
    result,
    jsonb_build_object(
        'sources',
        '[]'::jsonb,
        'highlights',
        '[]'::jsonb
    )
);
END;
$$
;
-- Function to get all highlights under a specific Higherkey path (recursive)
drop function if exists public.get_higherkey_playlist(uuid);
drop function if exists public.get_higherkey_playlist(uuid, uuid);
drop function if exists public.fetch_playlist_highlights(uuid);
CREATE
OR REPLACE FUNCTION public.fetch_playlist_highlights(target_key_id UUID) RETURNS TABLE (
    id UUID,
    source_id UUID,
    profile_id UUID,
    alias TEXT,
    start_time FLOAT8,
    end_time FLOAT8,
    is_strikethrough BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS
$$
DECLARE
target_path ltree;
BEGIN
SELECT
    path INTO target_path
FROM
    public.higherkeys
WHERE
    public.higherkeys.id = target_key_id
    AND public.higherkeys.profile_id = auth.uid();
IF target_path IS NULL THEN RETURN;
END IF;
RETURN QUERY
SELECT
    h.id,
    h.source_id,
    s.profile_id,
    h.alias,
    h.start_time,
    h.end_time,
    h.is_strikethrough,
    h.created_at
FROM
    public.higherkeys k
    JOIN public.highlights h ON k.highlight_id = h.id
    JOIN public.sources s ON h.source_id = s.id
WHERE
    k.path <@ target_path
    AND s.profile_id = auth.uid()
ORDER BY
    k.path,
    k.order_index;
END;
$$
;
-- ==========================================
-- 8. IDEMPOTENT EVENT STORE (FSM)
-- ==========================================

-- Table 1: Source Submissions (The Intent)
CREATE TABLE IF NOT EXISTS public.source_form_submissions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id uuid REFERENCES public.sources(id) ON DELETE CASCADE,
    external_id text UNIQUE, -- Client-side generated UUID to prevent double-submits
    payload jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table 2: Source Events (The Log)
CREATE TABLE IF NOT EXISTS public.source_form_submission_events (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id uuid REFERENCES public.source_form_submissions(id) ON DELETE CASCADE,
    source_id uuid REFERENCES public.sources(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'UPLOADED', 'PROCESSING', 'TRANSCRIPTION_READY', 'FAILED', 'COMPLETED'
    metadata jsonb DEFAULT '{}',
    display_metadata jsonb DEFAULT '{}', -- Chat UI: { role, content, icon, color }
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for Events
ALTER TABLE public.source_form_submission_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view events for their own sources" ON public.source_form_submission_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.sources WHERE id = source_form_submission_events.source_id AND profile_id = auth.uid())
    );

-- ==========================================
-- 9. STATEFUL FSM VIEWS
-- ==========================================

CREATE OR REPLACE VIEW public.stateful_source_fsm_wf AS
SELECT DISTINCT ON (source_id)
    s.id as source_id,
    s.title,
    e.event_type as current_status,
    e.created_at as last_transition_at,
    e.metadata as last_event_metadata
FROM public.sources s
LEFT JOIN public.source_form_submission_events e ON s.id = e.source_id
ORDER BY source_id, e.created_at DESC;

-- View for tracking the lifecycle of specific form submissions
CREATE OR REPLACE VIEW public.stateful_source_form_submission_fsm_wf AS
SELECT DISTINCT ON (submission_id)
    submission_id,
    source_id,
    event_type as submission_status,
    created_at as status_updated_at
FROM public.source_form_submission_events
ORDER BY submission_id, created_at DESC;

-- ==========================================
-- 10. HIGHER KEYS STATE SYNC (BACKWARD COMPATIBILITY)
-- ==========================================

CREATE OR REPLACE FUNCTION public.sync_source_state_from_event() 
RETURNS TRIGGER AS $$
BEGIN
    -- Sync main status
    UPDATE public.sources 
    SET status = NEW.event_type
    WHERE id = NEW.source_id;

    -- Sync specific metadata when completed
    IF NEW.event_type = 'completed' THEN
        UPDATE public.sources 
        SET 
            duration = COALESCE((NEW.metadata->>'duration')::float8, duration),
            thumbnail_url = COALESCE(NEW.metadata->>'thumbnail_url', thumbnail_url)
        WHERE id = NEW.source_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_sync_state
AFTER INSERT ON public.source_form_submission_events
FOR EACH ROW EXECUTE PROCEDURE public.sync_source_state_from_event();

-- ==========================================
-- 11. IMPROVED TRIGGER (HANDLES ALL FIELDS)
-- ==========================================

CREATE OR REPLACE FUNCTION public.sync_source_state_from_event() 
RETURNS TRIGGER AS $$
BEGIN
    -- Sync main status and other potential updates
    UPDATE public.sources 
    SET 
        status = NEW.event_type,
        title = COALESCE(NEW.metadata->>'title', title),
        description = COALESCE(NEW.metadata->>'description', description),
        thumbnail_url = COALESCE(NEW.metadata->>'thumbnail_url', thumbnail_url),
        duration = COALESCE((NEW.metadata->>'duration')::float8, duration),
        metadata = CASE 
            WHEN (NEW.metadata ? 'metadata') THEN (NEW.metadata->'metadata') 
            ELSE metadata 
        END
    WHERE id = NEW.source_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 12. HIGHLIGHT FSM WORKFLOW
-- ==========================================

-- Table 1: Highlight Submissions
CREATE TABLE IF NOT EXISTS public.highlight_form_submissions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id uuid REFERENCES public.sources(id) ON DELETE CASCADE,
    external_id text UNIQUE, 
    payload jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table 2: Highlight Events
CREATE TABLE IF NOT EXISTS public.highlight_form_submission_events (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id uuid REFERENCES public.highlight_form_submissions(id) ON DELETE CASCADE,
    source_id uuid REFERENCES public.sources(id) ON DELETE CASCADE,
    highlight_id uuid REFERENCES public.highlights(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'CREATED', 'UPDATED', 'DELETED'
    metadata jsonb DEFAULT '{}',
    display_metadata jsonb DEFAULT '{}', -- Chat UI: { role, content, icon, color }
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.highlight_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert submissions for their sources" ON public.highlight_form_submissions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.sources WHERE id = source_id AND profile_id = auth.uid())
    );
    
ALTER TABLE public.highlight_form_submission_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view events for their highlights" ON public.highlight_form_submission_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.sources WHERE id = source_id AND profile_id = auth.uid())
    );

-- Views
CREATE OR REPLACE VIEW public.stateful_highlight_fsm_wf AS
SELECT DISTINCT ON (highlight_id)
    h.id as highlight_id,
    h.source_id,
    h.alias,
    e.event_type as current_status,
    e.created_at as last_transition_at
FROM public.highlights h
LEFT JOIN public.highlight_form_submission_events e ON h.id = e.highlight_id
ORDER BY highlight_id, e.created_at DESC;

CREATE OR REPLACE VIEW public.stateful_highlight_form_submission_fsm_wf AS
SELECT DISTINCT ON (submission_id)
    submission_id,
    highlight_id,
    event_type as submission_status,
    created_at as status_updated_at
FROM public.highlight_form_submission_events
ORDER BY submission_id, created_at DESC;

-- Sync Trigger (Event -> Table)
CREATE OR REPLACE FUNCTION public.sync_highlight_state_from_event() 
RETURNS TRIGGER AS $$
DECLARE
    v_alias text;
    v_start float8;
    v_end float8;
    v_lat float8;
    v_lng float8;
BEGIN
    -- Extract values from metadata
    v_alias := NEW.metadata->>'alias';
    v_start := (NEW.metadata->>'start_time')::float8;
    v_end := (NEW.metadata->>'end_time')::float8;
    v_lat := (NEW.metadata->>'latitude')::float8;
    v_lng := (NEW.metadata->>'longitude')::float8;

    IF NEW.event_type = 'CREATED' THEN
        INSERT INTO public.highlights (
            id, source_id, alias, start_time, end_time, latitude, longitude
        ) VALUES (
            NEW.highlight_id, NEW.source_id, v_alias, v_start, v_end, v_lat, v_lng
        ) ON CONFLICT (id) DO NOTHING;
        
    ELSIF NEW.event_type = 'UPDATED' THEN
        UPDATE public.highlights
        SET
            alias = COALESCE(v_alias, alias),
            start_time = COALESCE(v_start, start_time),
            end_time = COALESCE(v_end, end_time),
            latitude = COALESCE(v_lat, latitude),
            longitude = COALESCE(v_lng, longitude)
        WHERE id = NEW.highlight_id;
        
    ELSIF NEW.event_type = 'DELETED' THEN
        DELETE FROM public.highlights WHERE id = NEW.highlight_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_highlight_event_sync_state
AFTER INSERT ON public.highlight_form_submission_events
FOR EACH ROW EXECUTE PROCEDURE public.sync_highlight_state_from_event();

-- Auto-Process Submission Trigger (Submission -> Event)
CREATE OR REPLACE FUNCTION public.process_highlight_submission() 
RETURNS TRIGGER AS $$
DECLARE
    v_highlight_id uuid;
    v_event_type text;
BEGIN
    -- Determine Event Type and Highlight ID from payload
    v_highlight_id := COALESCE((NEW.payload->>'id')::uuid, gen_random_uuid());
    v_event_type := COALESCE(NEW.payload->>'event_type', 'CREATED');
    
    -- Insert Event
    INSERT INTO public.highlight_form_submission_events (
        submission_id, source_id, highlight_id, event_type, metadata
    ) VALUES (
        NEW.id, NEW.source_id, v_highlight_id, v_event_type, NEW.payload
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_highlight_submission_process
AFTER INSERT ON public.highlight_form_submissions
FOR EACH ROW EXECUTE PROCEDURE public.process_highlight_submission();


-- ==========================================
-- 13. ESI PATTERN: AUTO DISPLAY METADATA
-- ==========================================

CREATE OR REPLACE FUNCTION public.enrich_event_display_metadata() 
RETURNS TRIGGER AS $$
DECLARE
    v_role text := 'system';
    v_content text := '';
BEGIN
    -- Default Display Logic if not provided
    IF NEW.display_metadata IS NULL OR NEW.display_metadata = '{}'::jsonb THEN
        
        -- Source Events
        IF TG_TABLE_NAME = 'source_form_submission_events' THEN
            IF NEW.event_type = 'processing' THEN
                v_role := 'assistant';
                v_content := 'Processing started...';
            ELSIF NEW.event_type = 'completed' THEN
                v_role := 'assistant';
                v_content := 'Processing completed successfully.';
            ELSIF NEW.event_type = 'failed' THEN
                v_role := 'assistant';
                v_content := 'Processing failed.';
            ELSE 
                v_role := 'system';
                v_content := 'System Event: ' || NEW.event_type;
            END IF;
            
        -- Highlight Events  
        ELSIF TG_TABLE_NAME = 'highlight_form_submission_events' THEN
             IF NEW.event_type = 'CREATED' THEN
                v_role := 'user';
                v_content := 'Created highlight segment.';
            ELSIF NEW.event_type = 'UPDATED' THEN
                v_role := 'user';
                v_content := 'Updated highlight details.';
            ELSIF NEW.event_type = 'DELETED' THEN
                v_role := 'user';
                v_content := 'Deleted highlight segment.';
            END IF;
        END IF;
        
        NEW.display_metadata := jsonb_build_object(
            'role', v_role,
            'content', v_content
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_source_event_enrich_display
BEFORE INSERT ON public.source_form_submission_events
FOR EACH ROW EXECUTE PROCEDURE public.enrich_event_display_metadata();

CREATE TRIGGER on_highlight_event_enrich_display
BEFORE INSERT ON public.highlight_form_submission_events
FOR EACH ROW EXECUTE PROCEDURE public.enrich_event_display_metadata();

-- ==========================================
-- 14. RBAC: ROLES & PERMISSIONS
-- ==========================================

-- Table 1: Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE, -- e.g. 'admin', 'editor', 'viewer'
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table 2: Profile Roles (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.profile_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(profile_id, role_id)
);

-- RLS for Roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles are viewable by everyone" ON public.roles
    FOR SELECT USING (true); -- Publicly viewable roles (for UI dropdowns etc)

-- RLS for Profile Roles
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.profile_roles
    FOR SELECT USING (auth.uid() = profile_id);

-- 2. Service Role (or Admins) can manage roles (Supabase Service Role bypasses RLS, but explicit policy helps if using admin user)
-- For now, restricting INSERT/UPDATE/DELETE to service role implicitly by not adding policies for them.

-- Seed default roles
INSERT INTO public.roles (name, description) VALUES 
    ('admin', 'Full system access'),
    ('member', 'Standard user access')
ON CONFLICT (name) DO NOTHING;

