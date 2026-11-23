# Starts the full local stack: Hardhat node, WorkflowFactory deploy, API, frontend.
# Usage (from repo root):  .\scripts\dev.ps1
# Each long-running service opens in its own PowerShell window; close the windows to stop.
# Requires apps/api/.env (copy from .env.example) and `npm install` in each package.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$contracts = Join-Path $root "contracts"
$api = Join-Path $root "apps\api"
$frontend = Join-Path $root "apps\frontend\TraceBlock"
$envFile = Join-Path $api ".env"
$rpcPort = 8545

if (-not (Test-Path $envFile)) {
    throw "Missing $envFile - copy apps/api/.env.example to apps/api/.env and fill it in first."
}

function Start-Service($title, $dir, $command) {
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "`$Host.UI.RawUI.WindowTitle = '$title'; Set-Location '$dir'; $command"
    ) | Out-Null
}

function Test-Port($port) {
    $client = New-Object Net.Sockets.TcpClient
    try { $client.Connect("127.0.0.1", $port); return $true } catch { return $false } finally { $client.Dispose() }
}

# 1. Hardhat node (a fresh chain every run - state is not persisted)
if (Test-Port $rpcPort) {
    throw "Port $rpcPort is already in use. Stop the running Hardhat node first so the chain starts clean."
}
Write-Host "Starting Hardhat node..."
Start-Service "hardhat node" $contracts "npm run node"

$deadline = (Get-Date).AddSeconds(60)
while (-not (Test-Port $rpcPort)) {
    if ((Get-Date) -gt $deadline) { throw "Hardhat node did not open port $rpcPort within 60s." }
    Start-Sleep -Milliseconds 500
}
Start-Sleep -Seconds 2

# 2. Deploy WorkflowFactory (--reset discards the previous deployment record of the old chain)
Write-Host "Deploying WorkflowFactory..."
Push-Location $contracts
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Contracts build failed." }
    npx hardhat ignition deploy ignition/modules/WorkflowFactory.ts --network localhost --reset
    if ($LASTEXITCODE -ne 0) { throw "Factory deploy failed." }
} finally {
    Pop-Location
}

$deployed = Get-Content (Join-Path $contracts "ignition\deployments\chain-31337\deployed_addresses.json") -Raw | ConvertFrom-Json
$factory = $deployed.PSObject.Properties | Where-Object { $_.Name -like "*WorkflowFactory" } | Select-Object -First 1 -ExpandProperty Value
if (-not $factory) { throw "Could not read the WorkflowFactory address from deployed_addresses.json." }
Write-Host "WorkflowFactory: $factory"

# 3. Sync the address into apps/api/.env
$text = [IO.File]::ReadAllText($envFile)
if ($text -match "(?m)^WORKFLOW_FACTORY_ADDRESS=.*$") {
    $text = $text -replace "(?m)^WORKFLOW_FACTORY_ADDRESS=.*$", "WORKFLOW_FACTORY_ADDRESS=$factory"
} else {
    $text = $text.TrimEnd() + "`r`nWORKFLOW_FACTORY_ADDRESS=$factory`r`n"
}
[IO.File]::WriteAllText($envFile, $text, (New-Object Text.UTF8Encoding($false)))

# 4. API and frontend
Write-Host "Starting API (http://localhost:3000)..."
Start-Service "api" $api "npm run dev"

Write-Host "Starting frontend (http://localhost:5173)..."
Start-Service "frontend" $frontend "npm run dev"

Write-Host ""
Write-Host "All services launched. Close their windows to stop them."
