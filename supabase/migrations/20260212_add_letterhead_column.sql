-- Add letterhead_url column to companies and brands tables
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS letterhead_url TEXT;

ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS letterhead_url TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.companies.letterhead_url IS 'URL to the company letterhead image (hoja membretada)';
COMMENT ON COLUMN public.brands.letterhead_url IS 'URL to the brand letterhead image (hoja membretada)';
