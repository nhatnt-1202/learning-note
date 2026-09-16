-- Chỉ dùng để test schema bằng Postgres thuần (docker). Trên project Supabase
-- những thứ này đã có sẵn — KHÔNG chạy file này lên DB thật.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Bản rút gọn của auth.uid() thật: đọc "sub" trong JWT claims. Phải lọc chuỗi
-- rỗng TRƯỚC khi cast sang jsonb — một GUC đã từng được SET rồi rollback sẽ còn
-- lại giá trị '' chứ không phải NULL, và ''::jsonb là lỗi cú pháp.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid;
$$;
