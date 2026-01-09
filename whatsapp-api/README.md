# WhatsApp API - Evolution API

Este diretório contém a configuração Docker para a Evolution API, que permite integrar WhatsApp com o n8n.

## Pré-requisitos

- Docker Desktop instalado e rodando

## Como usar

### 1. Subir o container

```powershell
cd c:\n8n-desafio\whatsapp-api
docker-compose up -d
```

### 2. Verificar se está rodando

```powershell
docker ps
```

Deve mostrar o container `evolution-api` na porta 8080.

### 3. Acessar a API

- **URL Base:** http://localhost:8080
- **API Key:** `secreta123`

### 4. Criar instância do WhatsApp

```powershell
$headers = @{
    "apikey" = "secreta123"
    "Content-Type" = "application/json"
}

$body = @{
    instanceName = "ai-ops-inbox"
    qrcode = $true
    integration = "WHATSAPP-BAILEYS"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/instance/create" -Method Post -Headers $headers -Body $body
```

### 5. Obter QR Code

```powershell
$headers = @{ "apikey" = "secreta123" }
Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/ai-ops-inbox" -Method Get -Headers $headers
```

Escaneie o QR Code com o WhatsApp do celular.

### 6. Configurar Webhook no n8n

Na Evolution API, configure o webhook para apontar para o n8n:

```powershell
$headers = @{
    "apikey" = "secreta123"
    "Content-Type" = "application/json"
}

$body = @{
    webhook = @{
        url = "https://lipeamarok.app.n8n.cloud/webhook/whatsapp-incoming"
        events = @("MESSAGES_UPSERT")
    }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Uri "http://localhost:8080/webhook/set/ai-ops-inbox" -Method Post -Headers $headers -Body $body
```

## Comandos úteis

```powershell
# Ver logs
docker logs evolution-api -f

# Parar
docker-compose down

# Reiniciar
docker-compose restart

# Remover tudo (volumes inclusos)
docker-compose down -v
```

## Integração com n8n

1. Crie um Workflow C no n8n com trigger Webhook
2. O webhook recebe mensagens do WhatsApp
3. Processe a mensagem e chame a API do Next.js
4. Responda via Evolution API

### Enviar mensagem pelo n8n

Use um nó HTTP Request:

```
POST http://localhost:8080/message/sendText/ai-ops-inbox

Headers:
  apikey: secreta123
  Content-Type: application/json

Body:
{
  "number": "5511999999999",
  "text": "Sua task foi criada com sucesso!"
}
```
