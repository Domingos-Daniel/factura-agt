
# Test with 2-year date range
$resp = Invoke-RestMethod -Uri "http://localhost:3001/api/facturas/agt/listar?startDate=2025-01-01&endDate=2026-12-31&refresh=true" -Method Get
Write-Host "Document count: $($resp.facturas.Length)"
Write-Host "Source: $($resp.source)"
Write-Host "Full response length: $($resp | ConvertTo-Json | Measure-Object -Character | Select-Object -ExpandProperty Characters)"

if ($resp.facturas.Length -gt 0) {
    Write-Host "`nFirst document:"
    Write-Host ($resp.facturas[0] | ConvertTo-Json -Depth 2)
}
