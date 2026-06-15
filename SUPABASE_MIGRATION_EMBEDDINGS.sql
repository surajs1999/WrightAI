-- =============================================================================
-- Code embeddings table — Supabase pgvector backup for local Chroma stores
-- Run this in Supabase SQL editor (Project → SQL Editor → New query)
-- =============================================================================

-- Bidirectional backup of each repo's vector index. Every chunk upserted into
-- a repo's local Chroma collection during indexing is mirrored here, keyed by
-- the same (user_id, repo_slug) used for repo storage paths and Redis keys
-- (see user_id_from_api_key / _user_id_from_request). On a cold container
-- start (empty local Chroma), this table is the source of truth used to
-- rebuild the local collection. chat/generate/fix_pr retrieval queries this
-- table first via match_code_chunks(), falling back to local Chroma.
--
-- chunk_id = sha256(f"{file_path}:{start_line}:{source}") (core/parser/ast_chunker.py)
-- is unique per file/line/source but NOT scoped to a user or repo, so this
-- shared table needs the composite primary key below to avoid cross-user
-- collisions.
--
-- embedding is vector(1024) — voyage-code-3's default output dimension
-- (core/embeddings/voyage_embeddings.py does not pass output_dimension).
create extension if not exists vector;

create table if not exists code_embeddings (
  user_id     text not null,
  repo_slug   text not null,
  chunk_id    text not null,
  file_path   text not null,
  language    text,
  chunk_type  text,
  name        text,
  source      text,
  start_line  int,
  end_line    int,
  token_count int,
  embedding   vector(1024),
  updated_at  timestamptz not null default now(),
  primary key (user_id, repo_slug, chunk_id)
);

create index if not exists code_embeddings_embedding_idx
  on code_embeddings using hnsw (embedding vector_cosine_ops);

create index if not exists code_embeddings_user_repo_idx
  on code_embeddings (user_id, repo_slug);

-- supabase-py's .table() can't express the <=> distance operator, so
-- similarity search goes through this RPC (see PgVectorStore.search in
-- core/embeddings/pgvector_store.py).
create or replace function match_code_chunks(
  query_embedding vector(1024),
  match_user_id text,
  match_repo_slug text,
  match_count int default 10,
  filter_file_path text default null
) returns table (
  chunk_id text, file_path text, language text, chunk_type text, name text,
  source text, start_line int, end_line int, token_count int, distance float
) language sql stable as $$
  select chunk_id, file_path, language, chunk_type, name, source, start_line, end_line, token_count,
         embedding <=> query_embedding as distance
  from code_embeddings
  where user_id = match_user_id and repo_slug = match_repo_slug
    and (filter_file_path is null or file_path = filter_file_path)
  order by embedding <=> query_embedding
  limit match_count;
$$;
