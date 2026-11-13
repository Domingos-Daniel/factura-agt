
$resp = Invoke-WebRequest -Uri "http://localhost:3001/series/lista" -UseBasicParsing
$content = $resp.Content

# Search for error messages
if ($content -match "E08") {
    Write-Host "❌ FOUND E08 ERROR IN PAGE" -ForegroundColor Red
    Write-Host ($content -match 'Erro.*E08.*' | Select-Object -First 3)
} elseif ($content -match "Erro") {
    Write-Host "❌ FOUND ERROR MESSAGE" -ForegroundColor Red
    $content | Select-String "Erro"
} elseif ($content -match "FT8626S") {
    Write-Host "✅ FOUND SERIES DATA IN PAGE" -ForegroundColor Green
    $content | Select-String "FT8626S" | Select-Object -First 3
} else {
    Write-Host "⚠️ PAGE CONTENT SAMPLE:" -ForegroundColor Yellow
    $content.Substring(0, 500)
}
