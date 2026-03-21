#Requires -Version 5.1
<#
.SYNOPSIS
  Interaktywne polaczenie z Cloud SQL (PostgreSQL) przez `gcloud sql connect`.

.DESCRIPTION
  Wymaga: zainstalowanego gcloud CLI, klienta `psql` (PostgreSQL), uprawnien Cloud SQL Client.
  Jezeli nie podasz nazwy instancji, skrypt probuje pobrac pierwsza z listy w projekcie.

  Uzycie:
    cd infra/gcp/scripts
    $env:GCP_SQL_INSTANCE_NAME = "awa-research-sql"
    .\cloud-sql-connect.ps1

    .\cloud-sql-connect.ps1 -InstanceName "awa-research-sql" -User "awa_app" -Database "awa_db"
#>

param(
  [string] $InstanceName = $env:GCP_SQL_INSTANCE_NAME,
  [string] $User = "awa_app",
  [string] $Database = "awa_db"
)

$ErrorActionPreference = "Stop"

if (-not $InstanceName) {
  Write-Host "[cloud-sql-connect] GCP_SQL_INSTANCE_NAME nie ustawione — pobieram pierwsza instancje..."
  $InstanceName = gcloud sql instances list --format="value(name)" --limit=1
}

if (-not $InstanceName) {
  Write-Error "Brak instancji Cloud SQL w projekcie lub brak nazwy. Ustaw GCP_SQL_INSTANCE_NAME lub -InstanceName."
  exit 1
}

Write-Host "[cloud-sql-connect] Instancja: $InstanceName | user: $User | baza: $Database"
Write-Host "[cloud-sql-connect] Uruchamiam: gcloud sql connect ..."
gcloud sql connect $InstanceName --user=$User --database=$Database
