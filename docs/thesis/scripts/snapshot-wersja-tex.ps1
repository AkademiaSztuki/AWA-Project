# Snapshot live LaTeX sources to wersje-tex/robocza-NN/.
# Usage: .\scripts\snapshot-wersja-tex.ps1 -Number 3
# Optional: -UpdateWersjaMd

param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 9999)]
    [int]$Number,

    [switch]$UpdateWersjaMd
)

$ErrorActionPreference = 'Stop'
$ThesisRoot = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'wersja-names.ps1')

if (-not (Test-Path (Join-Path $ThesisRoot 'main.tex'))) {
    Write-Error "Cannot find main.tex in thesis root: $ThesisRoot"
}

$paths = Get-WersjaPaths -Number $Number -ThesisRoot $ThesisRoot
$destRoot = $paths.TexDir

$excludeDirNames = @('node_modules', '.git')
$excludeFilePatterns = @('*.aux', '*.log', '*.pdf', '*.fdb_latexmk', '*.fls', '*.synctex.gz')

function Copy-TexTree {
    param(
        [string]$SourceDir,
        [string]$DestDir
    )
    if (-not (Test-Path $SourceDir)) { return }
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    Get-ChildItem -LiteralPath $SourceDir -Force | ForEach-Object {
        if ($excludeDirNames -contains $_.Name) { return }
        if ($_.PSIsContainer) {
            Copy-TexTree -SourceDir $_.FullName -DestDir (Join-Path $DestDir $_.Name)
            return
        }
        foreach ($pat in $excludeFilePatterns) {
            if ($_.Name -like $pat) { return }
        }
        if ($_.Extension -eq '.tex' -or $_.Name -eq 'references.bib') {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $DestDir $_.Name) -Force
        }
    }
}

function Write-SnapshotTree {
    param([string]$DestRoot)
    New-Item -ItemType Directory -Path (Join-Path $ThesisRoot 'wersje-tex') -Force | Out-Null

    $rootFiles = @('main.tex', 'metadata.tex', 'preamble.tex')
    foreach ($f in $rootFiles) {
        $src = Join-Path $ThesisRoot $f
        if (-not (Test-Path $src)) {
            Write-Error "Missing $src"
        }
        New-Item -ItemType Directory -Path $DestRoot -Force | Out-Null
        Copy-Item -LiteralPath $src -Destination (Join-Path $DestRoot $f) -Force
    }

    foreach ($dir in @('chapters', 'frontmatter', 'backmatter')) {
        Copy-TexTree -SourceDir (Join-Path $ThesisRoot $dir) -DestDir (Join-Path $DestRoot $dir)
    }

    $bibSrc = Join-Path $ThesisRoot 'bibliography\references.bib'
    if (Test-Path $bibSrc) {
        $bibDest = Join-Path $DestRoot 'bibliography'
        New-Item -ItemType Directory -Path $bibDest -Force | Out-Null
        Copy-Item -LiteralPath $bibSrc -Destination (Join-Path $bibDest 'references.bib') -Force
    }

    $stylesSrc = Join-Path $ThesisRoot 'styles'
    if (Test-Path $stylesSrc) {
        $stylesDest = Join-Path $DestRoot 'styles'
        New-Item -ItemType Directory -Path $stylesDest -Force | Out-Null
        Get-ChildItem -LiteralPath $stylesSrc -File | ForEach-Object {
            if (@('.sty', '.lua', '.tex', '.cfg') -contains $_.Extension) {
                Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $stylesDest $_.Name) -Force
            }
        }
    }

    $readme = @"
# Snapshot $($paths.LegacyName) ($($paths.Id))

Kopia źródeł ``.tex``, ``bibliography/references.bib`` i ``styles/`` z chwili utworzenia snapshotu.
Figury: współdzielone z katalogu roboczego ``figures/`` w ``docs/thesis/`` (nie kopiowane).
Kompilacja PDF: ``scripts/build-wersja-tex-pdf.ps1 -Number $Number``
"@
    $utf8Bom = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText((Join-Path $DestRoot 'README-SNAPSHOT.md'), $readme.Replace("`n", "`r`n"), $utf8Bom)
}

if (Test-Path (Join-Path $destRoot 'main.tex')) {
    Write-Error "Snapshot already exists ($destRoot). Refusing to overwrite; use the next robocza-NN."
}

Write-SnapshotTree -DestRoot $destRoot
Write-Host "Snapshot saved to wersje-tex\$($paths.LegacyName)"

if ($UpdateWersjaMd) {
    $wersjaMd = Join-Path $ThesisRoot 'notes\WERSJA.md'
    $content = Get-Content -LiteralPath $wersjaMd -Raw -Encoding UTF8
    $row = "| $($paths.Id) | ``wersje-tex/$($paths.Id)/`` |"
    if ($content -notmatch "\| $($paths.Id) \|") {
        Write-Host "Note: add row for $($paths.Id) manually in notes/WERSJA.md (mapping table)"
    }
}
