#Requires -Version 5.1
<#
.SYNOPSIS
  Eksportuje wybrane wiersze z participants do CSV (np. import do Google Sheets / Looker Studio).

.DESCRIPTION
  Wymaga DZIALAJACEGO Cloud SQL Auth Proxy na localhost (drugi terminal) lub tunelu na -Host/-Port.
  Zobacz: docs/gcp-data-verification/CLI.md

  PowerShell: uruchamiaj po jednej komendzie. Wklejony z terminala znak ">>" to kontynuacja linii — NIE
  wpisuj go recznie (blad "The term '>>' is not recognized").

  $env:PGPASSWORD = "haslo_awa_app"
  cd C:\sciezka\do\AWA-Project\infra\gcp\scripts
  .\cloud-sql-export-csv.ps1 -Port 15432 -OutFile "$HOME\Desktop\participants.csv"

  $env:PGPASSWORD = "haslo_awa_app"
  .\cloud-sql-export-csv.ps1 -OutFile ".\participants.csv"

  Po migracji kolumny JSONB (infra/gcp/sql/02_session_image_ratings.sql):
  .\cloud-sql-export-csv.ps1 -OutFile ".\participants.csv" -IncludeSessionImageRatings

  Po migracji 09/10 (research extensions + swipes dedupe):
  .\cloud-sql-export-csv.ps1 -OutFile ".\participants.csv" -IncludeResearchExtensions -IncludeMatrixEntries

  Pełny pakiet badawczy (participants + macierz + oceny obrazów + JSONB ankiety):
  .\cloud-sql-export-csv.ps1 -OutFile "$HOME\Desktop\participants-full.csv" -FullResearch

  Ta sama baza BEZ kolumny session_image_ratings (brak migracji 02_session_image_ratings.sql):
  .\cloud-sql-export-csv.ps1 -OutFile "$HOME\Desktop\participants-full.csv" -FullResearch -SkipSessionImageRatings

  Baza BEZ research extensions (brak m.in. room_preference_source — migracja 09_participant_research_extensions.sql):
  .\cloud-sql-export-csv.ps1 -OutFile "$HOME\Desktop\p.csv" -FullResearch -SkipSessionImageRatings -SkipResearchExtensions

  Stara baza: podstawowy participants + macierz (bez 02; kolumny z 09 jesli macierz wdrozona):
  .\cloud-sql-export-csv.ps1 -OutFile "$HOME\Desktop\p.csv" -FullResearch -SkipSessionImageRatings -SkipResearchExtensions -MatrixOutFile "$HOME\Desktop\matrix.csv"

  Brak tabeli participant_matrix_entries (nie wdrozono CREATE z 09_participant_research_extensions.sql):
  .\cloud-sql-export-csv.ps1 -OutFile "$HOME\Desktop\p.csv" -FullResearch -SkipSessionImageRatings -SkipResearchExtensions -SkipMatrixEntries

  Alternatywa bez -FullResearch (tylko rozszerzenia + macierz):
  .\cloud-sql-export-csv.ps1 -OutFile ".\p.csv" -IncludeResearchExtensions -IncludeMatrixEntries

  Jedna komenda na dowolna wersje schematu (kolumny participants z information_schema; macierz jesli tabela istnieje):
  .\cloud-sql-export-csv.ps1 -Port 15432 -AdaptiveSchema -OutFile "$HOME\Desktop\participants-export.csv" -MatrixOutFile "$HOME\Desktop\participant-matrix-entries.csv"
  Z -SkipMatrixEntries wylaczasz drugi plik nawet gdy tabela jest w bazie.
#>

param(
  [string] $OutFile = ".\participants-research-export.csv",
  [string] $DbHost = "127.0.0.1",
  [int] $Port = 5432,
  [string] $User = "awa_app",
  [string] $Database = "awa_db",
  [int] $Limit = 5000,
  # Buduje SELECT z kolumn faktycznie obecnych w DB (json/jsonb jako ::text). Macierz tylko gdy jest tabela (chyba ze -SkipMatrixEntries).
  [switch] $AdaptiveSchema = $false,
  [switch] $IncludeSessionImageRatings = $false,
  [switch] $IncludeResearchExtensions = $false,
  [switch] $IncludeMatrixEntries = $false,
  [string] $MatrixOutFile = ".\participant-matrix-entries.csv",
  [switch] $FullResearch = $false,
  # Gdy baza nie ma jeszcze session_image_ratings — uzyj z -FullResearch
  [switch] $SkipSessionImageRatings = $false,
  # Gdy baza nie ma kolumn z infra/gcp/sql/09_participant_research_extensions.sql — uzyj z -FullResearch
  [switch] $SkipResearchExtensions = $false,
  # Gdy nie ma tabeli participant_matrix_entries (ta sama migracja 09) — uzyj z -FullResearch
  [switch] $SkipMatrixEntries = $false,
  # Opcjonalnie: inspiracje z participant_images (deduplikacja / weryfikacja zapisu)
  [string] $ParticipantImagesOutFile = ""
)

if ($FullResearch) {
  $IncludeSessionImageRatings = -not $SkipSessionImageRatings
  $IncludeResearchExtensions = -not $SkipResearchExtensions
  $IncludeMatrixEntries = -not $SkipMatrixEntries
}

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

function Get-ParticipantSelectSqlAdaptive {
  param(
    [string] $PsqlExe,
    [string] $SqlHost,
    [int] $SqlPort,
    [string] $SqlUser,
    [string] $SqlDb
  )
  $meta = & $PsqlExe -h $SqlHost -p $SqlPort -U $SqlUser -d $SqlDb -t -A -F '|' -v ON_ERROR_STOP=1 -c @"
SELECT column_name, udt_name::text
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'participants'
ORDER BY ordinal_position;
"@
  if ($LASTEXITCODE -ne 0) {
    throw 'Nie udalo sie odczytac kolumn participants (information_schema).'
  }
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($meta -split "`r?`n")) {
    $t = $line.Trim()
    if (-not $t) { continue }
    $pair = $t -split '\|', 2
    $cname = $pair[0].Trim()
    $udt = if ($pair.Count -gt 1) { $pair[1].Trim() } else { '' }
    if (-not $cname) { continue }
    if ($udt -eq 'json' -or $udt -eq 'jsonb') {
      [void]$parts.Add("$cname::text AS $cname")
    }
    elseif ($cname -eq 'auth_user_id') {
      [void]$parts.Add('auth_user_id::text AS auth_user_id')
    }
    else {
      [void]$parts.Add($cname)
    }
  }
  if ($parts.Count -eq 0) {
    throw 'Brak kolumn dla public.participants.'
  }
  return 'SELECT ' + ($parts -join ', ')
}

function Test-PostgresRelationExists {
  param(
    [string] $PsqlExe,
    [string] $SqlHost,
    [int] $SqlPort,
    [string] $SqlUser,
    [string] $SqlDb,
    [string] $QualifiedName
  )
  $v = & $PsqlExe -h $SqlHost -p $SqlPort -U $SqlUser -d $SqlDb -t -A -v ON_ERROR_STOP=1 -c @"
SELECT COALESCE(to_regclass('$QualifiedName')::text, '') <> '';
"@
  if ($LASTEXITCODE -ne 0) { return $false }
  return ($v.Trim() -eq 't')
}

$matrixExportWanted = $false
if ($AdaptiveSchema) {
  Write-Host '[cloud-sql-export-csv] Tryb AdaptiveSchema: participants = wszystkie kolumny obecne w bazie.'
  $baseSelect = Get-ParticipantSelectSqlAdaptive -PsqlExe $psqlCmd -SqlHost $DbHost -SqlPort $Port -SqlUser $User -SqlDb $Database
  $matrixExportWanted = (-not $SkipMatrixEntries) -and (Test-PostgresRelationExists -PsqlExe $psqlCmd -SqlHost $DbHost -SqlPort $Port -SqlUser $User -SqlDb $Database -QualifiedName 'public.participant_matrix_entries')
  if (-not $matrixExportWanted -and -not $SkipMatrixEntries) {
    Write-Host '[cloud-sql-export-csv] AdaptiveSchema: brak tabeli public.participant_matrix_entries — pomijam eksport macierzy.'
  }
}
else {
  # Jedna linia — meta-polecenie \copy dziala w psql -c
  # Domyslnie BEZ session_image_ratings (stare bazy bez migracji). Po ADD COLUMN uzyj -IncludeSessionImageRatings.
  $baseSelect = 'SELECT user_hash, path_type, auth_user_id::text AS auth_user_id, current_step, consent_timestamp, updated_at, implicit_warmth, implicit_brightness, implicit_complexity, implicit_dominant_style, implicit_style_1, explicit_warmth, explicit_brightness, explicit_complexity, explicit_style, explicit_palette, explicit_material_1, explicit_material_2, explicit_material_3, big5_openness, big5_conscientiousness, big5_extraversion, big5_agreeableness, big5_neuroticism, big5_completed_at, sus_score, clarity_score, core_profile_complete, room_type, room_name, room_usage_type, tinder_total_swipes, tinder_likes, tinder_dislikes, generations_count'
  if ($IncludeSessionImageRatings) {
    $baseSelect += ', session_image_ratings::text AS session_image_ratings'
  }
  if ($IncludeResearchExtensions) {
    $baseSelect += ', room_preference_source, room_activity_context::text AS room_activity_context, final_survey::text AS final_survey, ladder_prompt_elements::text AS ladder_prompt_elements, ladder_completed_at, room_analysis_comment, room_analysis_human_comment, room_photo_image_id::text AS room_photo_image_id'
  }
  $matrixExportWanted = $IncludeMatrixEntries
}
$sql = '\copy (' + $baseSelect + ' FROM public.participants ORDER BY updated_at DESC LIMIT ' + $Limit + ') TO STDOUT WITH CSV HEADER'

Write-Host "[cloud-sql-export-csv] Eksport (limit $Limit, AdaptiveSchema=$AdaptiveSchema, FullResearch=$FullResearch, IncludeSessionImageRatings=$IncludeSessionImageRatings, IncludeResearchExtensions=$IncludeResearchExtensions, matrixExport=$matrixExportWanted) -> $OutFile"
& $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -c $sql | Set-Content -Path $OutFile -Encoding utf8
if ($LASTEXITCODE -ne 0) {
  Write-Error "Eksport nieudany (psql exit code: $LASTEXITCODE). Sprawdz haslo, port proxy i dane polaczenia."
  exit $LASTEXITCODE
}

if ($matrixExportWanted) {
  $matrixSql = '\copy (SELECT id, user_hash, step_index, client_id, label, source, is_selected, image_url, extra::text AS extra, created_at FROM public.participant_matrix_entries ORDER BY user_hash, step_index LIMIT ' + $Limit + ') TO STDOUT WITH CSV HEADER'
  Write-Host "[cloud-sql-export-csv] Eksport macierzy -> $MatrixOutFile"
  & $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -c $matrixSql | Set-Content -Path $MatrixOutFile -Encoding utf8
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Eksport macierzy nieudany (psql exit code: $LASTEXITCODE)."
    exit $LASTEXITCODE
  }
}

if ($ParticipantImagesOutFile -and $ParticipantImagesOutFile.Trim().Length -gt 0) {
  $piSql = '\copy (SELECT id, user_hash, type, public_url, storage_path, created_at FROM public.participant_images WHERE type = ''inspiration'' ORDER BY created_at DESC LIMIT ' + $Limit + ') TO STDOUT WITH CSV HEADER'
  Write-Host "[cloud-sql-export-csv] Eksport participant_images (inspiration) -> $ParticipantImagesOutFile"
  & $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -c $piSql | Set-Content -Path $ParticipantImagesOutFile -Encoding utf8
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Eksport participant_images nieudany (psql exit code: $LASTEXITCODE)."
    exit $LASTEXITCODE
  }
}

Write-Host "[cloud-sql-export-csv] Gotowe."
