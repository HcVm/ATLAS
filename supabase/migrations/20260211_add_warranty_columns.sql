-- Migration to add warranty columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS warranty_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS linked_warranty_number VARCHAR(100);

-- Make warranty_number unique if needed, though for safety we could just index it
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_warranty_number ON public.sales(warranty_number);

-- Index for linked warranties lookup
CREATE INDEX IF NOT EXISTS idx_sales_linked_warranty_number ON public.sales(linked_warranty_number);
