
-- Change function to SECURITY DEFINER to bypass RLS on companies table
-- This fixes the "Company not found" error when normal users (who might not have direct RLS access to companies) call this function.

ALTER FUNCTION public.generate_document_number(uuid, uuid, uuid) SECURITY DEFINER;
