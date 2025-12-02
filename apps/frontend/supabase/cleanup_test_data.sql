-- ============================================
-- CLEANUP TEST DATA - USUŃ WSZYSTKIE DANE
-- ============================================
-- Ten skrypt usuwa WSZYSTKIE dane testowe, ale ZACHOWUJE struktury tabel
-- Tabele pozostaną puste, gotowe do użycia
-- 
-- Uruchom w Supabase SQL Editor
-- 
-- UWAGA: To usunie WSZYSTKIE dane z tych tabel!
-- Tabele pozostaną, ale będą puste.

-- ============================================
-- USUŃ WSZYSTKIE DANE (zachowaj puste tabele)
-- ============================================
-- Skrypt bezpiecznie usuwa dane tylko z tabel, które istnieją

DO $$
BEGIN
  -- 1. Usuń wygenerowane obrazy (zajmują najwięcej miejsca)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generated_images') THEN
    DELETE FROM public.generated_images;
    RAISE NOTICE 'Usunięto dane z generated_images';
  END IF;

  -- 2. Usuń zestawy generacji (cascade usunie też powiązane obrazy)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generation_sets') THEN
    DELETE FROM public.generation_sets;
    RAISE NOTICE 'Usunięto dane z generation_sets';
  END IF;

  -- 3. Usuń feedback z generacji (może nie istnieć)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generation_feedback') THEN
    DELETE FROM public.generation_feedback;
    RAISE NOTICE 'Usunięto dane z generation_feedback';
  END IF;

  -- 4. Usuń eventy regeneracji (może nie istnieć)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regeneration_events') THEN
    DELETE FROM public.regeneration_events;
    RAISE NOTICE 'Usunięto dane z regeneration_events';
  END IF;

  -- 5. Usuń joby generacji
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generation_jobs') THEN
    DELETE FROM public.generation_jobs;
    RAISE NOTICE 'Usunięto dane z generation_jobs';
  END IF;

  -- 6. Usuń logi behawioralne
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'behavioral_logs') THEN
    DELETE FROM public.behavioral_logs;
    RAISE NOTICE 'Usunięto dane z behavioral_logs';
  END IF;

  -- 7. Usuń historię ocen obrazów
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'image_ratings_history') THEN
    DELETE FROM public.image_ratings_history;
    RAISE NOTICE 'Usunięto dane z image_ratings_history';
  END IF;

  -- 8. Usuń page views
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_views') THEN
    DELETE FROM public.page_views;
    RAISE NOTICE 'Usunięto dane z page_views';
  END IF;

  -- 9. Usuń swipe'y z tindera
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tinder_swipes') THEN
    DELETE FROM public.tinder_swipes;
    RAISE NOTICE 'Usunięto dane z tinder_swipes';
  END IF;

  -- 10. Usuń ekspozycje tindera
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tinder_exposures') THEN
    DELETE FROM public.tinder_exposures;
    RAISE NOTICE 'Usunięto dane z tinder_exposures';
  END IF;

  -- 11. Usuń snapshoty DNA
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dna_snapshots') THEN
    DELETE FROM public.dna_snapshots;
    RAISE NOTICE 'Usunięto dane z dna_snapshots';
  END IF;

  -- 12. Usuń ścieżki laddering
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ladder_paths') THEN
    DELETE FROM public.ladder_paths;
    RAISE NOTICE 'Usunięto dane z ladder_paths';
  END IF;

  -- 13. Usuń podsumowania laddering
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ladder_summary') THEN
    DELETE FROM public.ladder_summary;
    RAISE NOTICE 'Usunięto dane z ladder_summary';
  END IF;

  -- 14. Usuń sesje discovery
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discovery_sessions') THEN
    DELETE FROM public.discovery_sessions;
    RAISE NOTICE 'Usunięto dane z discovery_sessions';
  END IF;

  -- 15. Usuń snapshoty kontekstu urządzenia
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_context_snapshots') THEN
    DELETE FROM public.device_context_snapshots;
    RAISE NOTICE 'Usunięto dane z device_context_snapshots';
  END IF;

  -- 16. Usuń wyniki ankiet
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_results') THEN
    DELETE FROM public.survey_results;
    RAISE NOTICE 'Usunięto dane z survey_results';
  END IF;

  -- 17. Usuń health checks
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_checks') THEN
    DELETE FROM public.health_checks;
    RAISE NOTICE 'Usunięto dane z health_checks';
  END IF;

  -- 18. Usuń logi błędów
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'errors') THEN
    DELETE FROM public.errors;
    RAISE NOTICE 'Usunięto dane z errors';
  END IF;

  -- 19. Wyczyść sesje (zachowaj tylko userHash)
  -- To wyczyści JSON z sesji (w tym obrazy i inspiracje w base64)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
    UPDATE public.sessions 
    SET session_json = jsonb_build_object(
      'userHash', session_json->'userHash'
    )
    WHERE session_json IS NOT NULL;
    RAISE NOTICE 'Wyczyszczono sesje (zachowano userHash)';
  END IF;

  -- 20. Usuń projekty (opcjonalnie - odkomentuj jeśli chcesz)
  -- IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
  --   DELETE FROM public.projects;
  --   RAISE NOTICE 'Usunięto dane z projects';
  -- END IF;

  RAISE NOTICE 'Czyszczenie zakończone!';
END $$;

-- ============================================
-- PODSUMOWANIE
-- ============================================
-- Po uruchomieniu tego skryptu:
-- ✅ Wszystkie tabele pozostaną (struktura zachowana)
-- ✅ Wszystkie tabele będą puste (gotowe do użycia)
-- ✅ Zwolnione miejsce w bazie danych
-- ✅ Możesz od razu zacząć testować od nowa

-- ============================================
-- WYCZYŚĆ STORAGE BUCKET (opcjonalnie)
-- ============================================
-- Jeśli bucket aura-assets istnieje i zawiera obrazy inspirations:

-- Usuń wszystkie pliki z bucketa
DELETE FROM storage.objects 
WHERE bucket_id = 'aura-assets';
-- Wynik: Wszystkie obrazy inspirations usunięte z storage

-- ============================================
-- SPRAWDŹ ZWOLNIONE MIEJSCE
-- ============================================
-- Po czyszczeniu, sprawdź rozmiary tabel (powinny być małe):
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS rozmiar,
  (SELECT COUNT(*) FROM information_schema.tables t2 
   WHERE t2.table_schema = 'public' AND t2.table_name = tablename) AS istnieje
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- Sprawdź ile wierszy zostało (powinno być 0 lub bardzo mało):
-- Używa bezpiecznych zapytań dla tabel, które mogą nie istnieć
DO $$
DECLARE
  result_text text := '';
BEGIN
  -- Sprawdź każdą tabelę osobno
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generated_images') THEN
    SELECT result_text || 'generated_images: ' || COUNT(*)::text || E'\n' INTO result_text FROM public.generated_images;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generation_sets') THEN
    SELECT result_text || 'generation_sets: ' || COUNT(*)::text || E'\n' INTO result_text FROM public.generation_sets;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generation_feedback') THEN
    SELECT result_text || 'generation_feedback: ' || COUNT(*)::text || E'\n' INTO result_text FROM public.generation_feedback;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'behavioral_logs') THEN
    SELECT result_text || 'behavioral_logs: ' || COUNT(*)::text || E'\n' INTO result_text FROM public.behavioral_logs;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
    SELECT result_text || 'sessions: ' || COUNT(*)::text || E'\n' INTO result_text FROM public.sessions;
  END IF;
  
  RAISE NOTICE 'Pozostałe wiersze:%', E'\n' || result_text;
END $$;

