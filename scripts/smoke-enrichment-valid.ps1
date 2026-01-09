$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { "http://localhost:3000" }
$identifier = if ($env:IDENTIFIER) { $env:IDENTIFIER } else { "smoke-user@test.com" }

Write-Host "Testing Enrichment (Valid) - $baseUrl" -ForegroundColor Cyan

$createBody = @{
  identifier = $identifier
  request_raw = "Schedule a dentist appointment"
  source = "smoke"
} | ConvertTo-Json

Write-Host "Creating task..." -ForegroundColor Yellow
$createResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tasks" -ContentType "application/json" -Body $createBody
$taskId = $createResp.task.id

if (-not $taskId) {
  throw "Task creation failed: missing id"
}
Write-Host "Task created: $taskId" -ForegroundColor Green

$enrichBody = @{
  title_enhanced = "Schedule a dentist appointment"
  priority = "medium"
  tags = @("health", "calendar")
  next_action = "Find the dentist contact info and call to book a slot"
  steps = @(
    "Find the dentist contact info",
    "Call the office to check availability",
    "Book an appointment that fits your schedule"
  )
} | ConvertTo-Json -Depth 4

Write-Host "Enriching task..." -ForegroundColor Yellow
$enrichResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tasks/$taskId/enrichment" -ContentType "application/json" -Body $enrichBody

Write-Host "Enrichment successful!" -ForegroundColor Green
$enrichResp | ConvertTo-Json -Depth 6
