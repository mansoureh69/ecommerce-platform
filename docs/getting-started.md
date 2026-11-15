# Start EcommercePlatform locally

This guide starts PostgreSQL, the .NET backend, the Khosheh storefront, and the administration application on Windows with PowerShell.

## Prerequisites

Install:

- Docker Desktop
- .NET SDK 10 (the repository is pinned by `global.json`)
- Node.js 20 or newer
- pnpm 11.23.0

Run every command from the repository root unless a section says otherwise.

```powershell
cd D:\Projects\source\ecommerce-platform
```

Choose one backend option:

1. [Docker backend](#option-a-run-the-backend-with-docker) — simplest setup.
2. [Local .NET backend](#option-b-run-the-backend-locally) — useful while developing backend code.

Do not run both backend options at the same time.

## One-time frontend setup

Enable the repository's pnpm version and install workspace dependencies:

```powershell
corepack enable
corepack prepare pnpm@11.23.0 --activate
Set-Location frontend
pnpm install
Set-Location ..
```

## Option A: Run the backend with Docker

### 1. Create the Docker environment file

```powershell
Copy-Item .env.example .env
```

Open `.env` and set both values. Do not commit this file.

```dotenv
POSTGRES_PASSWORD=replace-with-a-strong-database-password
JWT_SECRET=replace-with-a-random-secret-at-least-32-bytes-long
```

### 2. Start PostgreSQL, apply migrations, and start the API

```powershell
docker compose --env-file .env -f docker/compose.yml up --build -d
docker compose --env-file .env -f docker/compose.yml ps
```

The Compose migration service applies database migrations before the API starts. The services are available at:

- Backend API: `http://localhost:8080`
- Readiness check: `http://localhost:8080/health/ready`
- PostgreSQL: `localhost:55432`

Check readiness:

```powershell
Invoke-RestMethod http://localhost:8080/health/ready
```

### 3. Create the first administrator

The bootstrap command creates a new administrator. It does not promote an existing customer account.

```powershell
$env:Bootstrap__Email = 'admin@example.test'
$env:Bootstrap__Password = 'Choose-A-Strong-Pass-1!'

docker compose --env-file .env -f docker/compose.yml run --rm `
  -e Bootstrap__Email `
  -e Bootstrap__Password `
  api --create-admin

Remove-Item Env:Bootstrap__Email
Remove-Item Env:Bootstrap__Password
```

Continue with [Start the frontends](#start-the-frontends) and use `http://localhost:8080` as `BACKEND_API_URL`.

## Option B: Run the backend locally

This option runs only PostgreSQL in Docker and runs the API with the .NET SDK.

### 1. Configure and start PostgreSQL

```powershell
Copy-Item .env.example .env
```

Set `POSTGRES_PASSWORD` and `JWT_SECRET` in `.env`, as shown in the Docker option, then start PostgreSQL:

```powershell
docker compose --env-file .env -f docker/compose.yml up -d postgres
```

### 2. Configure the current PowerShell session

Replace the password below with the same `POSTGRES_PASSWORD` stored in `.env`.

```powershell
$env:ConnectionStrings__Database = 'Host=localhost;Port=55432;Database=ecommerce;Username=ecommerce;Password=YOUR_POSTGRES_PASSWORD'
$env:Jwt__Secret = 'YOUR_RANDOM_SECRET_AT_LEAST_32_BYTES'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
```

### 3. Restore, build, and apply migrations

```powershell
dotnet restore EcommercePlatform.slnx
dotnet build EcommercePlatform.slnx -c Release
dotnet run --project src/EcommercePlatform.Api -- --migrate
```

### 4. Create the first administrator

```powershell
$env:Bootstrap__Email = 'admin@example.test'
$env:Bootstrap__Password = 'Choose-A-Strong-Pass-1!'

dotnet run --project src/EcommercePlatform.Api -- --create-admin

Remove-Item Env:Bootstrap__Email
Remove-Item Env:Bootstrap__Password
```

### 5. Start the API

Keep this terminal open:

```powershell
dotnet run --project src/EcommercePlatform.Api -- --urls http://localhost:5080
```

The local services are available at:

- Backend API: `http://localhost:5080`
- OpenAPI document: `http://localhost:5080/openapi/v1.json`
- Readiness check: `http://localhost:5080/health/ready`

Continue with the next section and use `http://localhost:5080` as `BACKEND_API_URL`.

## Start the frontends

The frontend applications use a same-origin Backend-for-Frontend proxy. `BACKEND_API_URL` is server-only and must not use the `NEXT_PUBLIC_` prefix.

Open two new PowerShell terminals.

### Terminal 1: Khosheh storefront

For a Docker backend:

```powershell
Set-Location D:\Projects\source\ecommerce-platform\frontend
$env:BACKEND_API_URL = 'http://localhost:8080'
pnpm --filter @ecommerce/storefront-khosheh dev -- --port 3000
```

For a locally running backend, use this value instead:

```powershell
$env:BACKEND_API_URL = 'http://localhost:5080'
```

Open `http://localhost:3000/en`. Persian and Arabic are available at `/fa` and `/ar`.

### Terminal 2: Administration application

For a Docker backend:

```powershell
Set-Location D:\Projects\source\ecommerce-platform\frontend
$env:BACKEND_API_URL = 'http://localhost:8080'
pnpm --filter @ecommerce/admin dev -- --port 3001
```

For a locally running backend, use this value instead:

```powershell
$env:BACKEND_API_URL = 'http://localhost:5080'
```

Open `http://localhost:3001/login` and sign in with the administrator created earlier.

## Normal startup after the first run

For the Docker backend:

```powershell
docker compose --env-file .env -f docker/compose.yml up -d
```

Then start both frontend development servers as described above. You do not need to recreate the administrator on every startup.

For the local .NET backend, start PostgreSQL, restore the backend environment variables in the backend terminal, and run:

```powershell
docker compose --env-file .env -f docker/compose.yml up -d postgres
dotnet run --project src/EcommercePlatform.Api -- --urls http://localhost:5080
```

## Stop the applications

Stop a frontend or locally running backend with `Ctrl+C` in its terminal.

Stop Docker services while preserving database and media volumes:

```powershell
docker compose --env-file .env -f docker/compose.yml down
```

To inspect backend logs:

```powershell
docker compose --env-file .env -f docker/compose.yml logs -f api
```

## Troubleshooting

### `BACKEND_API_URL is required`

Set `BACKEND_API_URL` in the same terminal before starting each frontend application. Restart the development server after changing it.

### The admin account already exists

Bootstrap only creates a new administrator. Use a different email address, or sign in with the administrator that was created previously.

### The backend is not ready

```powershell
docker compose --env-file .env -f docker/compose.yml ps
docker compose --env-file .env -f docker/compose.yml logs migrate api postgres
```

Confirm that `.env` contains non-empty `POSTGRES_PASSWORD` and `JWT_SECRET` values.

### A port is already in use

The default ports in this guide are:

| Service | Port |
| --- | ---: |
| Khosheh storefront | 3000 |
| Admin frontend | 3001 |
| Local .NET API | 5080 |
| Docker API | 8080 |
| Docker PostgreSQL | 55432 |

Stop the process using the port or pass another frontend port to `next dev`.

### Reset local Docker data

The following command deletes the local PostgreSQL and media volumes. Use it only when a complete local reset is intended:

```powershell
docker compose --env-file .env -f docker/compose.yml down --volumes
```

After a reset, start the stack and create the administrator again.
