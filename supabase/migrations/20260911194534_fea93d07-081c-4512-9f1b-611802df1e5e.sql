ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_category_check;
ALTER TABLE public.requests ADD CONSTRAINT requests_category_check CHECK (
  category IS NULL OR category = ANY (ARRAY[
    'food','vehicles','outdoors','nightlife','transit','events','parking','weather','realestate','art','sports',
    'boats','aircraft','machinery',
    'Food','Nightlife','Nature','Transit','Events','Parking','Weather',
    '🚗 Cars & Vehicles','⛵ Boats & Marine','🛩️ Aircraft & RVs','🚜 Heavy Equipment'
  ])
);