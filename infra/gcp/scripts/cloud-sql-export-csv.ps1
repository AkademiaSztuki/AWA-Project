#Requires -Version 5.1
<#
.SYNOPSIS
  Eksportuje wybrane wiersze z participants do CSV (np. import do Google Sheets / Looker Studio).

.DESCRIPTION
  Wymaga DZIALAJACEGO Cloud SQL Auth Proxy na localhost (drugi terminal) lub tunelu na -Host/-Port.
  Zobacz: docs/gcp-data-verification/CLI.md

  $env:PGPASSWORD = "haslo_awa_app"
  .\cloud-sql-export-csv.ps1 -OutFile ".\participants.csv"
#>

param(
  [string] $OutFile = ".\participants-research-export.csv",
  [string] $DbHost = "127.0.0.1",
  [int] $Port = 5432,
  [string] $User = "awa_app",
  [string] $Database = "awa_db",
  [int] $Limit = 5000
)

$ErrorActionPreference = "Stop"

if (-not $env:PGPASSWORD) {
  Write-Error "Ustaw PGPASSWORD (haslo uzytkownika bazy)."
  exit 1
}

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
  $candidates = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
  )
  $found = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $found) {
    Write-Error "Brak psql w PATH i nie znaleziono psql.exe w domyslnych lokalizacjach PostgreSQL."
    exit 1
  }
  $psqlCmd = $found
}

# Jedna linia — meta-polecenie \copy dziala w psql -c
# Szerszy zestaw kolumn weryfikacyjnych (implicit_dominant_style, swipe’y itd. — wcześniej „puste” w CSV mogły być tylko w innych kolumnach).
# Uwaga: session_image_ratings wymaga migracji infra/gcp/sql/02_session_image_ratings.sql — nie dodawaj tu kolumny dopóki nie jest w prod DB.
$sql = '\copy (SELECT user_hash, path_type, auth_user_id::text AS auth_user_id, current_step, consent_timestamp, updated_at, implicit_warmth, implicit_brightness, implicit_complexity, implicit_dominant_style, implicit_style_1, explicit_warmth, explicit_brightness, explicit_complexity, explicit_style, explicit_palette, explicit_material_1, explicit_material_2, explicit_material_3, big5_openness, big5_conscientiousness, big5_extraversion, big5_agreeableness, big5_neuroticism, big5_completed_at, sus_score, clarity_score, core_profile_complete, room_type, room_name, room_usage_type, tinder_total_swipes, tinder_likes, tinder_dislikes, generations_count FROM public.participants ORDER BY updated_at DESC LIMIT ' + $Limit + ') TO STDOUT WITH CSV HEADER'

Write-Host "[cloud-sql-export-csv] Eksport (limit $Limit) -> $OutFile"
& $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -c $sql | Set-Content -Path $OutFile -Encoding utf8
if ($LASTEXITCODE -ne 0) {
  Write-Error "Eksport nieudany (psql exit code: $LASTEXITCODE). Sprawdz haslo, port proxy i dane polaczenia."
  exit $LASTEXITCODE
}
Write-Host "[cloud-sql-export-csv] Gotowe."
