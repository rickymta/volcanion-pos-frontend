# Secrets Management Guide

## Overview

This project uses ASP.NET Core's layered configuration system. Sensitive values must **never** be committed to version control. `appsettings.Production.json` and `appsettings.Staging.json` are excluded via `.gitignore`.

---

## Sensitive Configuration Keys

| Key | Notes |
|-----|-------|
| `Database:WriteConnection` | Contains DB password |
| `Database:ReadConnection` | Contains DB password |
| `Hangfire:ConnectionString` | Contains DB password |
| `Redis:ConnectionString` | May contain Redis password (`redis:6379,password=…`) |
| `Jwt:SecretKey` | **Must be ≥ 32 characters** (validated at startup in non-Development) |

---

## Development (local)

Use `appsettings.Development.json` (already in repo with local defaults) or `dotnet user-secrets`.

```bash
# Initialize user-secrets (run once per project)
dotnet user-secrets init --project src/POS.Api

# Set a secret
dotnet user-secrets set "Jwt:SecretKey" "my-dev-secret-at-least-32-chars-long" --project src/POS.Api
```

---

## Production / Staging

**Option A — Environment Variables (recommended for containers/Kubernetes)**

ASP.NET Core maps environment variables to configuration using `__` (double underscore) as the key separator:

```bash
# Database
export Database__WriteConnection="Host=prod-db;Port=5432;Database=pos_db;Username=pos_app;Password=<STRONG_PASS>;..."
export Database__ReadConnection="Host=prod-db-replica;..."
export Hangfire__ConnectionString="Host=prod-db;..."

# Redis (if password-protected)
export Redis__ConnectionString="prod-redis:6379,password=<REDIS_PASS>,ssl=True"

# JWT secret — at least 32 characters, generated with:
#   openssl rand -hex 32
export Jwt__SecretKey="<64-char-hex-string>"
```

**Option B — `appsettings.Production.json` (ignored by git)**

Create `src/POS.Api/appsettings.Production.json` locally on the server:

```json
{
  "Database": {
    "WriteConnection": "Host=prod-db;...",
    "ReadConnection": "Host=prod-db-replica;..."
  },
  "Hangfire": {
    "ConnectionString": "Host=prod-db;..."
  },
  "Redis": {
    "ConnectionString": "prod-redis:6379,password=<REDIS_PASS>"
  },
  "Jwt": {
    "SecretKey": "<64-char-hex-string>"
  }
}
```

**Option C — Secret Manager services (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault)**

Use the appropriate ASP.NET Core provider package to pull secrets at startup:
- `Azure.Extensions.AspNetCore.Configuration.Secrets` for Azure Key Vault
- `Kralizek.Extensions.Configuration.AWSSecretsManager` for AWS
- `VaultSharp` for Vault

---

## Generating a Strong JWT Secret

```bash
openssl rand -hex 32
# example output: a7f3d2e1b5c4...  (64 hex chars = 256 bits)
```

---

## Startup Validation

The application validates `Jwt:SecretKey` length at startup (non-Development environments):

```
System.InvalidOperationException: JWT:SecretKey must be at least 32 characters long in non-Development environments.
```

If you see this error, set a proper secret key before deploying.

---

## Checklist Before Production Deploy

- [ ] `Jwt:SecretKey` is ≥ 32 characters and not the default placeholder
- [ ] Database passwords are strong and unique (not `postgres`/`postgres`)
- [ ] Redis is password-protected if exposed on the network
- [ ] `appsettings.Production.json` is **not** committed to git
- [ ] Hangfire dashboard is only accessible to Admin-role users (enforced by `HangfireDashboardAuthFilter`)
- [ ] CORS `AllowedOrigins` lists only your actual frontend domain(s)
