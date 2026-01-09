$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { "http://localhost:3000" }
$identifier = if ($env:IDENTIFIER) { $env:IDENTIFIER } else { "smoke-user@test.com" }

Write-Host "Testing Enrichment (Invalid - should fail validation)" -ForegroundColor Cyan

$createBody = @{
  identifier = $identifier
  request_raw = "Pay utility bills"
  source = "smoke"
} | ConvertTo-Json

Write-Host "Creating task..." -ForegroundColor Yellow
$createResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tasks" -ContentType "application/json" -Body $createBody
$taskId = $createResp.task.id

if (-not $taskId) {
  throw "Task creation failed: missing id"
}
Write-Host "Task created: $taskId" -ForegroundColor Green

# Invalid body - priority "urgent" is not valid (should be low/medium/high)
$invalidBody = @{
  title_enhanced = "Pay utility bills"
  priority = "urgent"  # Invalid! Should be low/medium/high
  tags = @("finance")
  next_action = "Open the billing portal"
  steps = @("")  # Invalid! Empty step
} | ConvertTo-Json -Depth 4

Write-Host "Sending invalid enrichment (expecting 400)..." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tasks/$taskId/enrichment" -ContentType "application/json" -Body $invalidBody
  Write-Host "FAIL: Expected 400 but request succeeded" -ForegroundColor Red
  exit 1
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 400) {
    Write-Host "PASS: Got expected 400 error" -ForegroundColor Green
  } else {
    Write-Host "FAIL: Expected 400 but got $statusCode" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
  }
}
