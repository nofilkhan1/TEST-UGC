param(
  [Parameter(Mandatory = $true)][ValidateSet("PROMPT", "RESPONSE")][string]$Type,
  [Parameter(Mandatory = $true)][string]$Text,
  [string]$Model = "opencode/hy3-free",
  [string]$Tool = "opencode",
  [string]$Project = "sideshift",
  [string]$Author = "SideShift Builder"
)

# .agent-logs/ lives at the repo root (parent of scripts/).
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsDir  = Join-Path $repoRoot ".agent-logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

$sessionId = if ($env:AGENT_SESSION_ID) { $env:AGENT_SESSION_ID } else { "session-" + (Get-Date -Format "yyyyMMdd-HHmmss") }
$ts  = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
$now = Get-Date -Format "yyyy-MM-dd"
$file = Join-Path $logsDir ($sessionId + ".md")

if (-not (Test-Path $file)) {
  @"
---
session_id: $sessionId
date: $now
author: $Author
model: $Model
tool: $Tool
project: $Project
total_exchanges: 0
first_prompt_time: $ts
last_prompt_time: $ts
---

"@ | Set-Content -Path $file
}

Add-Content -Path $file -Value "[LOG_ENTRY type=$Type time=$ts model=$Model]`n$Text`n"
Write-Host "logged -> $file"
