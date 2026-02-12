-- Enable RLS on storage.objects if not already enabled
-- (This is usually enabled by default on new Supabase projects)
-- alter table storage.objects enable row level security;

-- Policy to allow authenticated users (like admins) to upload/update images in the 'images' bucket
create policy "Allow authenticated uploads to images bucket"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'images' );

-- Policy to allow authenticated users to update existing images (overwrite)
create policy "Allow authenticated updates to images bucket"
on storage.objects for update
to authenticated
using ( bucket_id = 'images' )
with check ( bucket_id = 'images' );

-- Policy to allow public read access (usually already exists, but good to ensure)
create policy "Allow public read access to images bucket"
on storage.objects for select
to public
using ( bucket_id = 'images' );

-- Policy to allow authenticated users to delete images (optional, but good for management)
create policy "Allow authenticated deletes to images bucket"
on storage.objects for delete
to authenticated
using ( bucket_id = 'images' );
