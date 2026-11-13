
# Test series API with fresh data
$apiResp = Invoke-RestMethod -Uri "http://localhost:3001/api/series/agt?refresh=true" -Method Get -UseBasicParsing

Write-Host "API Response Status: Series Count = $($apiResp.series.Length)"
Write-Host "Source: $($apiResp.source)"

if ($apiResp.series.Length -gt 0) {
    Write-Host "`n✅ SERIES LOADED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "Sample series:"
    $apiResp.series[0..2] | Select-Object id, seriesCode, status | Format-Table -AutoSize
} else {
    Write-Host "`n❌ NO SERIES FOUND" -ForegroundColor Red
}
