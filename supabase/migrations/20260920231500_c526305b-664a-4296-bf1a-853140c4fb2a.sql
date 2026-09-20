ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_category_check;
ALTER TABLE public.requests ADD CONSTRAINT requests_category_check CHECK (
  category IS NULL OR category = ANY (ARRAY[
    -- current app category ids
    'breaking-incidents','traffic-updates','arts-performances','food-dining','car-culture',
    'street-fashion','events-sports','nature-wildlife','real-estate','nightlife',
    'tech-innovation','shopping-retail','fitness-outdoors','pets-animals','community-culture',
    'casual-irl','strange-sightings-ufo',
    -- legacy values kept for existing rows
    'food','vehicles','outdoors','nightlife','transit','events','parking','weather','realestate','art','sports',
    'boats','aircraft','machinery',
    'Food','Nightlife','Nature','Transit','Events','Parking','Weather',
    '🚗 Cars & Vehicles','⛵ Boats & Marine','🛩️ Aircraft & RVs','🚜 Heavy Equipment'
  ])
);