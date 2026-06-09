-- Remove any MIME-type restriction on the document-files bucket so users can
-- upload any file type (Office docs, images, text files, archives, etc.).
-- The file_size_limit of 50 MB stays in place.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'document-files';
