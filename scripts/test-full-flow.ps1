# ============================================================
# AI Ops Inbox - Full Flow Test Script
# Testa todo o fluxo CRUD com o novo padrão identifier
# ============================================================

$ErrorActionPreference = "Stop"

$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { "http://localhost:3000" }
$identifier = if ($env:IDENTIFIER) { $env:IDENTIFIER } else { "test-user@example.com" }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "AI Ops Inbox - Full Flow Test" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host "Identifier: $identifier" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

$passCount = 0
$failCount = 0

function Test-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    
    Write-Host "[$Name] " -NoNewline -ForegroundColor Yellow
    try {
        $result = & $Action
        Write-Host "PASS" -ForegroundColor Green
        $script:passCount++
        return $result
    } catch {
        Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
        $script:failCount++
        return $null
    }
}

# ============================================================
# 1. RESOLVE USER - Criar/buscar usuário pelo identifier
# ============================================================
$user = Test-Step "1. Resolve User" {
    $body = @{ identifier = $identifier } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/resolve-user" -ContentType "application/json" -Body $body
    if (-not $resp.user.id) { throw "Missing user.id" }
    Write-Host " (user_id: $($resp.user.id))" -NoNewline -ForegroundColor Gray
    return $resp.user
}

# ============================================================
# 2. CREATE TASK - Criar uma nova task
# ============================================================
$task1 = Test-Step "2. Create Task" {
    $body = @{
        identifier = $identifier
        request_raw = "Agendar reuniao com o time de produto para discutir roadmap Q2"
        source = "test-script"
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tasks" -ContentType "application/json" -Body $body
    if (-not $resp.task.id) { throw "Missing task.id" }
    Write-Host " (task_id: $($resp.task.id))" -NoNewline -ForegroundColor Gray
    return $resp.task
}

# ============================================================
# 3. LIST TASKS - Listar tasks do usuário
# ============================================================
$tasks = Test-Step "3. List Tasks" {
    $resp = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/tasks?identifier=$([uri]::EscapeDataString($identifier))"
    if (-not $resp.tasks) { throw "Missing tasks array" }
    $count = $resp.tasks.Count
    Write-Host " (count: $count)" -NoNewline -ForegroundColor Gray
    if ($count -eq 0) { throw "Expected at least 1 task" }
    return $resp.tasks
}

# ============================================================
# 4. GET TASK BY ID - Buscar task específica
# ============================================================
$taskDetail = Test-Step "4. Get Task by ID" {
    $resp = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/tasks/$($task1.id)?identifier=$([uri]::EscapeDataString($identifier))"
    if (-not $resp.task.id) { throw "Missing task.id" }
    return $resp.task
}

# ============================================================
# 5. UPDATE TASK - Atualizar texto da task
# ============================================================
$updatedTask = Test-Step "5. Update Task" {
    $body = @{
        identifier = $identifier
        request_raw = "Agendar reuniao URGENTE com o time de produto - Roadmap Q2"
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Put -Uri "$baseUrl/api/tasks/$($task1.id)" -ContentType "application/json" -Body $body
    if (-not $resp.task.id) { throw "Missing task.id" }
    if ($resp.task.request_raw -notlike "*URGENTE*") { throw "Update not applied" }
    return $resp.task
}

# ============================================================
# 6. ENRICHMENT - Enriquecer task com IA (simula n8n)
# ============================================================
$enrichedTask = Test-Step "6. Enrich Task (AI)" {
    $body = @{
        title_enhanced = "Reuniao Urgente: Roadmap Q2 com Time de Produto"
        priority = "high"
        tags = @("meeting", "product", "roadmap", "urgent")
        next_action = "Enviar convite no calendario para o time"
        steps = @(
            "Verificar disponibilidade do time no calendario",
            "Reservar sala de reuniao ou criar link do Meet",
            "Preparar pauta com topicos do roadmap",
            "Enviar convite com antecedencia de 24h"
        )
    } | ConvertTo-Json -Depth 4
    $resp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tasks/$($task1.id)/enrichment" -ContentType "application/json" -Body $body
    if (-not $resp.task.title_enhanced) { throw "Missing title_enhanced" }
    if (-not $resp.task.steps -or $resp.task.steps.Count -eq 0) { throw "Missing steps" }
    Write-Host " (steps: $($resp.task.steps.Count))" -NoNewline -ForegroundColor Gray
    return $resp.task
}

# ============================================================
# 7. TOGGLE DONE - Marcar task como concluída
# ============================================================
$doneTask = Test-Step "7. Toggle Done" {
    $body = @{ identifier = $identifier } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Patch -Uri "$baseUrl/api/tasks/$($task1.id)/done" -ContentType "application/json" -Body $body
    if (-not $resp.task.id) { throw "Missing task.id" }
    if ($resp.task.status -ne "done") { throw "Status should be 'done'" }
    return $resp.task
}

# ============================================================
# 8. TOGGLE UNDONE - Desmarcar task (voltar para open)
# ============================================================
$undoneTask = Test-Step "8. Toggle Undone" {
    $body = @{ identifier = $identifier } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Patch -Uri "$baseUrl/api/tasks/$($task1.id)/done" -ContentType "application/json" -Body $body
    if (-not $resp.task.id) { throw "Missing task.id" }
    if ($resp.task.status -ne "open") { throw "Status should be 'open'" }
    return $resp.task
}

# ============================================================
# 9. CREATE SECOND TASK - Para testar delete
# ============================================================
$task2 = Test-Step "9. Create Second Task" {
    $body = @{
        identifier = $identifier
        request_raw = "Task temporaria para teste de delete"
        source = "test-script"
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tasks" -ContentType "application/json" -Body $body
    if (-not $resp.task.id) { throw "Missing task.id" }
    return $resp.task
}

# ============================================================
# 10. DELETE TASK - Deletar a segunda task
# ============================================================
Test-Step "10. Delete Task" {
    $body = @{ identifier = $identifier } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Delete -Uri "$baseUrl/api/tasks/$($task2.id)" -ContentType "application/json" -Body $body
    if (-not $resp.success) { throw "Delete failed" }
}

# ============================================================
# 11. VERIFY DELETE - Confirmar que task foi deletada
# ============================================================
Test-Step "11. Verify Delete" {
    $resp = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/tasks?identifier=$([uri]::EscapeDataString($identifier))"
    $found = $resp.tasks | Where-Object { $_.id -eq $task2.id }
    if ($found) { throw "Task should have been deleted" }
}

# ============================================================
# 12. CHAT - Testar endpoint do chat
# ============================================================
Test-Step "12. Chat Endpoint" {
    $body = @{
        identifier = $identifier
        message = "list"
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/chat" -ContentType "application/json" -Body $body
    # Chat pode retornar reply ou processar via n8n
    Write-Host " (reply received)" -NoNewline -ForegroundColor Gray
}

# ============================================================
# 13. CASE INSENSITIVE - Testar normalização do identifier
# ============================================================
Test-Step "13. Case Insensitive Identifier" {
    $upperIdentifier = $identifier.ToUpper()
    $resp = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/tasks?identifier=$([uri]::EscapeDataString($upperIdentifier))"
    if (-not $resp.tasks) { throw "Missing tasks array" }
    $count = $resp.tasks.Count
    Write-Host " (UPPER works, count: $count)" -NoNewline -ForegroundColor Gray
    if ($count -eq 0) { throw "Case insensitive search failed" }
}

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
}
