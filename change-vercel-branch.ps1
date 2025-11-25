# Skrypt do zmiany Production Branch w Vercel
$PROJECT_NAME = "awa-project-frontend-fhka"
$TEAM_ID = "pali89s-projects"
$NEW_BRANCH = "main"

$token = vercel whoami --token
if (!$token) {
    Write-Host "Nie znaleziono tokena Vercel. Uruchom: vercel login" -ForegroundColor Red
    exit 1
}

Write-Host "Zmieniam production branch na: $NEW_BRANCH" -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    git = @{
        productionBranch = $NEW_BRANCH
    }
} | ConvertTo-Json

try {
    $uri = "https://api.vercel.com/v9/projects/$PROJECT_NAME`?teamId=$TEAM_ID"
    $response = Invoke-RestMethod -Uri $uri -Method PATCH -Headers $headers -Body $body
    Write-Host "OK: Production branch zmieniony na: $NEW_BRANCH" -ForegroundColor Green
    Write-Host "Projekt: $($response.name)" -ForegroundColor Cyan
    Write-Host "Branch: $($response.git.productionBranch)" -ForegroundColor Cyan
} catch {
    Write-Host "Blad: $_" -ForegroundColor Red
    Write-Host "Zmien to recznie w dashboardzie: https://vercel.com/dashboard" -ForegroundColor Yellow
}
