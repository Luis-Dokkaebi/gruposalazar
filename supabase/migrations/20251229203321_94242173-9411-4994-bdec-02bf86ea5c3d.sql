-- Create storage bucket for estimations
INSERT INTO storage.buckets (id, name, public)
VALUES ('estimations', 'estimations', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload estimation files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'estimations' AND auth.uid() IS NOT NULL);

-- Create policy for anyone to view estimation files (public bucket)
CREATE POLICY "Anyone can view estimation files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'estimations');

-- Create policy for authenticated users to delete their files
CREATE POLICY "Authenticated users can delete estimation files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'estimations' AND auth.uid() IS NOT NULL);