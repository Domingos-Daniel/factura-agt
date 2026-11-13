
$resp = Invoke-RestMethod -Uri "http://localhost:3001/api/facturas/agt/listar?debug=true&refresh=true" -Method Get

Write-Host "===== FULL AGT RESPONSE =====" -ForegroundColor Green
Write-Host ($resp._debug.agtFullResponse | ConvertTo-Json -Depth 10)

Write-Host "`n===== STATUS RESULT =====" -ForegroundColor Green  
Write-Host ($resp._debug.agtStatusResult | ConvertTo-Json -Depth 10)

Write-Host "`n===== FIRST RAW ENTRY =====" -ForegroundColor Green
Write-Host ($resp._debug.firstRawEntry | ConvertTo-Json -Depth 10)

Write-Host "`n===== FIRST LIST ENTRY =====" -ForegroundColor Green
Write-Host ($resp._debug.firstListEntry | ConvertTo-Json -Depth 10)
