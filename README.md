# Products CRUD — .NET + PostgreSQL + React

Full-stack CRUD example: a .NET Web API backed by PostgreSQL, with a React + TypeScript frontend.

```
.
├── ProductsApi/     .NET 10 Web API (EF Core + Npgsql + Swagger)
└── products-ui/     React 18 + TypeScript + Vite
```

## Prerequisites

| Tool | Version |
|---|---|
| .NET SDK | 10.x |
| Node.js | 18+ |
| PostgreSQL | 15+ |

```bash
dotnet --version
node --version
psql --version
```

On macOS, these can be installed via Homebrew:
```bash
brew install dotnet node postgresql@15
brew services start postgresql@15
```

## 1. Database setup

Create the database (using your local PostgreSQL user):
```bash
psql -U $(whoami) -c "CREATE DATABASE productsdb;"
```

Update `ProductsApi/appsettings.json` if your username/host/port differ from the default:
```json
"DefaultConnection": "Host=localhost;Port=5432;Database=productsdb;Username=YOUR_USER;Include Error Detail=true"
```

## 2. Run the API

```bash
cd ProductsApi
dotnet restore
dotnet tool install --global dotnet-ef   # only needed once, for migrations
dotnet ef database update                # applies the existing migrations
dotnet run
```

- API: http://localhost:5000
- Swagger UI: http://localhost:5000/swagger

| Method | Route | Action |
|---|---|---|
| GET | /api/products | List all |
| GET | /api/products/{id} | Get one |
| POST | /api/products | Create |
| PUT | /api/products/{id} | Update |
| DELETE | /api/products/{id} | Delete |

## 3. Run the frontend

```bash
cd products-ui
npm install
npm run dev
```

- UI: http://localhost:5173

The frontend expects the API at `http://localhost:5000/api` (see `src/services/productService.ts`). The API's CORS policy allows `http://localhost:5173` (see `Program.cs`).

## Running both together

```bash
# Terminal 1
cd ProductsApi && dotnet run

# Terminal 2
cd products-ui && npm run dev
```

Then open http://localhost:5173.

## Troubleshooting

| Error | Fix |
|---|---|
| CORS error in browser | Confirm `Program.cs` allows your UI's origin |
| `connection refused` calling the API | Make sure `dotnet run` is running in `ProductsApi/` |
| `relation does not exist` | Run `dotnet ef database update` |
| `password authentication failed` | Fix the `Username`/`Password` in `appsettings.json` |

## Docs

- [TUTORIAL.md](TUTORIAL.md) — full guide to rebuilding this project from scratch, plus a checklist for adapting it to a new entity
- [STEP_BY_STEP.md](STEP_BY_STEP.md) — every command from a clean macOS machine to a running app
