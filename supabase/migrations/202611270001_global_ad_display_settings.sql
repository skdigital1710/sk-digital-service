-- SK DIGITAL SERVICE: persistent global ad display settings
-- Run once in Supabase SQL Editor. Adds a JSONB setting without changing existing rows or policies.
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS ad_display_settings jsonb NOT NULL
DEFAULT '{"speed":50,"width":190,"cardHeight":176,"imageHeight":110,"gap":12,"direction":"up","showMobile":true}'::jsonb;
