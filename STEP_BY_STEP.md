# Step-by-Step: .NET + PostgreSQL + React CRUD from Zero

Every command you need, in order, from a clean machine to a running app.

---

## 1. Install prerequisites (macOS)

### Homebrew (package manager)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### .NET, Node.js and PostgreSQL
```bash
brew install dotnet node postgresql@15
```

Verify everything installed correctly:
```bash
dotnet --version        # should print 10.x.x
node --version          # should print v18+
npm --version           # should print 10+
psql --version          # should print psql 15+
```

### Set the DOTNET_ROOT environment variable

Without this, dotnet commands won't work in the terminal.

Add to your `~/.zshrc` (or `~/.bashrc`):
```bash
echo 'export DOTNET_ROOT="/opt/homebrew/opt/dotnet/libexec"' >> ~/.zshrc
echo 'export PATH="$HOME/.dotnet/tools:$DOTNET_ROOT:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:
```bash
dotnet --version
```

---

## 2. Set up PostgreSQL

### Start the PostgreSQL service (runs in background, auto-starts on login)
```bash
brew services start postgresql@15
```

Check it is running:
```bash
brew services list
# postgresql@15 should show "started"
```

### Connect to PostgreSQL shell
```bash
psql -U $(whoami)
# $(whoami) is your macOS username — Homebrew uses it by default, no password needed
```

### Create the database
Inside the psql shell:
```sql
CREATE DATABASE productsdb;
\l        -- list all databases (confirm productsdb appears)
\q        -- exit psql
```

Or do it in one line from the terminal:
```bash
psql -U $(whoami) -c "CREATE DATABASE productsdb;"
```

### Useful psql commands for reference

| Command | What it does |
|---|---|
| `\l` | List all databases |
| `\c productsdb` | Connect to productsdb |
| `\dt` | List tables in current database |
| `\d products` | Describe the products table |
| `SELECT * FROM "Products";` | Query all products |
| `\q` | Exit psql |

---

## 3. Create the .NET Web API

### Create the project
```bash
dotnet new webapi -n ProductsApi --no-openapi
cd ProductsApi
```

> `--no-openapi` skips the default template's OpenAPI setup since we wire it manually.

### Install NuGet packages
```bash
# PostgreSQL driver for Entity Framework Core
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 9.0.4

# EF Core design tools (needed for migrations)
dotnet add package Microsoft.EntityFrameworkCore.Design --version 9.0.4

# Swagger UI
dotnet add package Swashbuckle.AspNetCore --version 6.9.0
```

### Create the folder structure
```bash
mkdir Controllers Models Data
```

Expected structure:
```
ProductsApi/
├── Controllers/
│   └── ProductsController.cs
├── Data/
│   └── AppDbContext.cs
├── Models/
│   └── Product.cs
├── appsettings.json
├── Program.cs
└── ProductsApi.csproj
```

### Write the files

**`Models/Product.cs`**
```csharp
namespace ProductsApi.Models;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

**`Data/AppDbContext.cs`**
```csharp
using Microsoft.EntityFrameworkCore;
using ProductsApi.Models;

namespace ProductsApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
}
```

**`Controllers/ProductsController.cs`**
```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductsApi.Data;
using ProductsApi.Models;

namespace ProductsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await db.Products.OrderBy(p => p.Id).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await db.Products.FindAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Product product)
    {
        product.CreatedAt = DateTime.UtcNow;
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Product updated)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.Name = updated.Name;
        product.Description = updated.Description;
        product.Price = updated.Price;
        product.Stock = updated.Stock;

        await db.SaveChangesAsync();
        return Ok(product);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

**`Program.cs`**
```csharp
using Microsoft.EntityFrameworkCore;
using ProductsApi.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();

app.Run();
```

**`appsettings.json`** — replace `YOUR_USERNAME` with your macOS username (`whoami` to check):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=productsdb;Username=YOUR_USERNAME;Include Error Detail=true"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

---

## 4. Create and apply the migration

### Install the dotnet-ef global tool (once per machine)
```bash
dotnet tool install --global dotnet-ef
```

Verify:
```bash
dotnet ef --version
```

### Create the migration
```bash
# Run from inside ProductsApi/
dotnet ef migrations add InitialCreate
```

This generates a `Migrations/` folder with the SQL schema as C# code. You do not need to edit it.

### Apply the migration to the database
```bash
dotnet ef database update
```

Verify the table was created:
```bash
psql -U $(whoami) -d productsdb -c "\dt"
# Should list: Products, __EFMigrationsHistory
```

### Run the API
```bash
dotnet run --urls "http://localhost:5000"
```

The API is ready when you see:
```
Now listening on: http://localhost:5000
```

> To run it silently in the background, append `&` — but it is easier to keep it in its own terminal tab.

---

## 5. Create the React frontend

### Scaffold the project (from the repo root, NOT inside ProductsApi/)
```bash
cd ..   # go up one level from ProductsApi/
npm create vite@latest products-ui -- --template react-ts
cd products-ui
npm install
```

### Install Axios (HTTP client)
```bash
npm install axios
```

### Create the folder structure
```bash
mkdir -p src/types src/services src/components
```

Expected structure:
```
products-ui/
└── src/
    ├── types/
    │   └── product.ts
    ├── services/
    │   └── productService.ts
    ├── components/
    │   ├── ProductForm.tsx
    │   └── ProductList.tsx
    ├── App.tsx
    └── main.tsx
```

### Write the files

**`src/types/product.ts`**
```typescript
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
}

export type ProductForm = Omit<Product, 'id' | 'createdAt'>;
```

**`src/services/productService.ts`**
```typescript
import axios from 'axios';
import type { Product, ProductForm } from '../types/product';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

export const productService = {
  getAll: () => api.get<Product[]>('/products').then(r => r.data),
  getById: (id: number) => api.get<Product>(`/products/${id}`).then(r => r.data),
  create: (data: ProductForm) => api.post<Product>('/products', data).then(r => r.data),
  update: (id: number, data: ProductForm) => api.put<Product>(`/products/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/products/${id}`),
};
```

**`src/components/ProductForm.tsx`**
```typescript
import { useState, useEffect } from 'react';
import type { Product, ProductForm as ProductFormType } from '../types/product';

interface Props {
  initial?: Product;
  onSubmit: (data: ProductFormType) => void;
  onCancel: () => void;
}

const empty: ProductFormType = { name: '', description: '', price: 0, stock: 0 };

export function ProductForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ProductFormType>(empty);

  useEffect(() => {
    setForm(initial
      ? { name: initial.name, description: initial.description, price: initial.price, stock: initial.stock }
      : empty);
  }, [initial]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value,
    }));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <h3>{initial ? 'Edit Product' : 'New Product'}</h3>
      <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
      <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} />
      <input name="price" type="number" step="0.01" placeholder="Price" value={form.price} onChange={handleChange} required />
      <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} required />
      <button type="submit">{initial ? 'Update' : 'Create'}</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
```

**`src/components/ProductList.tsx`**
```typescript
import type { Product } from '../types/product';

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export function ProductList({ products, onEdit, onDelete }: Props) {
  if (products.length === 0) return <p>No products found.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Description</th><th>Price</th><th>Stock</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{p.description}</td>
            <td>${p.price.toFixed(2)}</td>
            <td>{p.stock}</td>
            <td>
              <button onClick={() => onEdit(p)}>Edit</button>
              <button onClick={() => onDelete(p.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**`src/App.tsx`**
```typescript
import { useEffect, useState } from 'react';
import { ProductForm } from './components/ProductForm';
import { ProductList } from './components/ProductList';
import { productService } from './services/productService';
import type { Product, ProductForm as ProductFormType } from './types/product';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => productService.getAll().then(setProducts);

  useEffect(() => { load(); }, []);

  const handleSubmit = async (data: ProductFormType) => {
    if (editing) {
      await productService.update(editing.id, data);
    } else {
      await productService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleEdit = (product: Product) => {
    setEditing(product);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    await productService.delete(id);
    load();
  };

  return (
    <div>
      <h1>Products CRUD</h1>
      {!showForm && <button onClick={() => setShowForm(true)}>+ New Product</button>}
      {showForm && (
        <ProductForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      <ProductList products={products} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
```

### Run the frontend
```bash
# Inside products-ui/
npm run dev
```

The UI is ready when you see:
```
VITE ready in Xms
➜  Local: http://localhost:5173/
```

---

## 6. Run both together

Open two terminal tabs/windows:

```bash
# Tab 1 — API
cd ProductsApi
dotnet run --urls "http://localhost:5000"

# Tab 2 — UI
cd products-ui
npm run dev
```

Open http://localhost:5173 in the browser.

---

## 7. Test the API manually (curl)

These commands let you test every endpoint without opening the browser.

```bash
# List all products
curl http://localhost:5000/api/products

# Get a single product (replace 1 with the actual id)
curl http://localhost:5000/api/products/1

# Create a product
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Notebook","description":"A4 lined","price":4.99,"stock":200}'

# Update a product
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Notebook","description":"A5 dotted","price":5.99,"stock":150}'

# Delete a product
curl -X DELETE http://localhost:5000/api/products/1
```

---

## 8. Test the API with Swagger

While the API is running, open:
```
http://localhost:5000/swagger
```

Swagger gives you a visual interface to call every endpoint without curl.

---

## 9. Query the database directly

Connect to the database and inspect data at any time:

```bash
psql -U $(whoami) -d productsdb
```

Inside psql:
```sql
-- See all products
SELECT * FROM "Products";

-- Count products
SELECT COUNT(*) FROM "Products";

-- Filter by price
SELECT * FROM "Products" WHERE "Price" > 10;

-- Check applied migrations
SELECT * FROM "__EFMigrationsHistory";
```

---

## 10. Common issues and fixes

### Port already in use
```bash
# Find and kill the process on a given port (e.g. 5000)
lsof -ti :5000 | xargs kill -9

# Same for port 5173
lsof -ti :5173 | xargs kill -9
```

### PostgreSQL not running
```bash
brew services start postgresql@15

# Check status
brew services list
```

### `dotnet` command not found
```bash
export DOTNET_ROOT="/opt/homebrew/opt/dotnet/libexec"
export PATH="$HOME/.dotnet/tools:$DOTNET_ROOT:$PATH"
# Then add these lines to ~/.zshrc to make them permanent
```

### `dotnet ef` command not found
```bash
dotnet tool install --global dotnet-ef
export PATH="$HOME/.dotnet/tools:$PATH"
```

### CORS error in browser
The CORS origin in `Program.cs` must exactly match the URL in the browser bar (including port):
```csharp
policy.WithOrigins("http://localhost:5173")
```

### `relation does not exist` error on startup
The migration was not applied. Run:
```bash
dotnet ef database update
```

### `password authentication failed`
Homebrew PostgreSQL uses your macOS username with no password. Make sure `appsettings.json` has:
```json
"Username=YOUR_MACOS_USERNAME"
```
and no `Password=` field (or remove it entirely).

---

## 11. Useful commands reference

### .NET
```bash
dotnet new webapi -n MyApi          # create a new Web API project
dotnet add package PackageName      # add a NuGet package
dotnet restore                      # restore all packages
dotnet build                        # compile the project
dotnet run                          # build and run
dotnet run --urls "http://localhost:5000"  # run on a specific port
dotnet ef migrations add MigrationName    # create a new migration
dotnet ef migrations remove               # remove the last migration
dotnet ef database update                 # apply pending migrations
dotnet ef database drop                   # drop the database (destructive)
```

### Node / npm
```bash
npm create vite@latest app -- --template react-ts  # scaffold React + TypeScript
npm install                   # install all dependencies from package.json
npm install axios             # install a specific package
npm run dev                   # start development server
npm run build                 # build for production
npm run preview               # preview production build locally
```

### PostgreSQL (psql shell)
```bash
psql -U username              # connect as user
psql -U username -d dbname    # connect to a specific database
psql -U username -c "SQL;"    # run a one-line SQL command without entering the shell
```

### Homebrew services
```bash
brew services start postgresql@15   # start PostgreSQL
brew services stop postgresql@15    # stop PostgreSQL
brew services restart postgresql@15 # restart PostgreSQL
brew services list                  # list all services and their status
```
