-- Storage bucket for reward images
-- Run in Supabase SQL editor

insert into storage.buckets (id, name, public)
values ('reward-images', 'reward-images', true)
on conflict (id) do nothing;

create policy "public can view reward images" on storage.objects
  for select using (bucket_id = 'reward-images');

create policy "admin can upload reward images" on storage.objects
  for insert with check (bucket_id = 'reward-images' and is_admin());

create policy "admin can update reward images" on storage.objects
  for update using (bucket_id = 'reward-images' and is_admin());

create policy "admin can delete reward images" on storage.objects
  for delete using (bucket_id = 'reward-images' and is_admin());
