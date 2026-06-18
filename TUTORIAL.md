# .NET + PostgreSQL + React — Products CRUD Tutorial

Replicable step-by-step guide. Every command runs from scratch on a clean machine.

---

## Prerequisites

Install these once on any machine:

| Tool | Version | Install |
|---|---|---|
| .NET SDK | 8+ | https://dotnet.microsoft.com/download |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 15+ | https://www.postgresql.org/download |

Verify:
```bash
dotnet --version   # 8.x.x
node --version     # v18+
psql --version     # psql 15+
```

---

## 1 — Database setup

```bash
# Start PostgreSQL and open the shell
psql -U postgres

# Inside psql:
CREATE DATABASE productsdb;
\q
```

The connection string format used throughout:
```
Host=localhost;Port=5432;Database=productsdb;Username=postgres;Password=postgres
```

Change `Username` and `Password` to match your local PostgreSQL credentials.

---

## 2 — Backend: .NET Web API

### 2.1 Create the project

```bash
dotnet new webapi -n ProductsApi --no-openapi
cd ProductsApi
```

> Remove the `--no-openapi` flag if you want Swagger auto-configured by the template.  
> This tutorial wires Swagger manually in `Program.cs`.

### 2.2 Install NuGet packages

```bash
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.0
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.0
dotnet add package Swashbuckle.AspNetCore --version 6.6.2
```

### 2.3 File structure

```
ProductsApi/
├── Controllers/
│   └── ProductsController.cs
├── Data/
│   └── AppDbContext.cs
├── Models/
│   └── Product.cs
├── appsettings.json
└── Program.cs
```

### 2.4 Model — `Models/Product.cs`

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

### 2.5 DbContext — `Data/AppDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using ProductsApi.Models;

namespace ProductsApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
}
```

### 2.6 Controller — `Controllers/ProductsController.cs`

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

### 2.7 Program.cs

```csharp
using Microsoft.EntityFrameworkCore;
using ProductsApi.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")   // Vite dev server port
              .AllowAnyHeader()
              .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-apply migrations on startup
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

### 2.8 Connection string — `appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=productsdb;Username=postgres;Password=postgres"
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

### 2.9 Create and run the migration

```bash
# Inside ProductsApi/
dotnet ef migrations add InitialCreate
dotnet ef database update
```

> `dotnet ef` requires the `dotnet-ef` global tool:
> ```bash
> dotnet tool install --global dotnet-ef
> ```

### 2.10 Run the API

```bash
dotnet run
# API: http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

API endpoints:

| Method | Route | Action |
|---|---|---|
| GET | /api/products | List all |
| GET | /api/products/{id} | Get one |
| POST | /api/products | Create |
| PUT | /api/products/{id} | Update |
| DELETE | /api/products/{id} | Delete |

---

## 3 — Frontend: React + TypeScript

### 3.1 Create the project

```bash
# From the repo root (one level above ProductsApi/)
npm create vite@latest products-ui -- --template react-ts
cd products-ui
npm install
npm install axios
```

### 3.2 File structure

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

### 3.3 Types — `src/types/product.ts`

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

### 3.4 Service — `src/services/productService.ts`

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

### 3.5 Form component — `src/components/ProductForm.tsx`

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

### 3.6 List component — `src/components/ProductList.tsx`

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

### 3.7 App — `src/App.tsx`

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

  const handleCancel = () => { setShowForm(false); setEditing(null); };

  return (
    <div>
      <h1>Products CRUD</h1>
      {!showForm && <button onClick={() => setShowForm(true)}>+ New Product</button>}
      {showForm && <ProductForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={handleCancel} />}
      <ProductList products={products} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
```

### 3.8 Run the frontend

```bash
# Inside products-ui/
npm run dev
# UI: http://localhost:5173
```

---

## 4 — Running both together

Open two terminals:

```bash
# Terminal 1 — API
cd ProductsApi
dotnet run

# Terminal 2 — UI
cd products-ui
npm run dev
```

Open http://localhost:5173 in the browser.

---

## 5 — Adapting to a new context (checklist)

When reusing this template for a different entity (e.g. `Customer`, `Order`):

- [ ] **Model**: rename `Product` fields in `Models/Product.cs`
- [ ] **DbContext**: add the new `DbSet<NewEntity>` in `AppDbContext.cs`
- [ ] **Controller**: duplicate `ProductsController.cs`, rename class and route
- [ ] **Migration**: `dotnet ef migrations add AddNewEntity && dotnet ef database update`
- [ ] **Types**: update `src/types/product.ts` with the new interface fields
- [ ] **Service**: update the route in `productService.ts`
- [ ] **Form**: update field names and input types in `ProductForm.tsx`
- [ ] **appsettings.json**: change `Database=` to a new database name if needed

---

## 6 — Common errors

| Error | Cause | Fix |
|---|---|---|
| `CORS error` in browser | CORS not configured | Check `WithOrigins("http://localhost:5173")` in `Program.cs` |
| `connection refused` on API | API not running | Run `dotnet run` in `ProductsApi/` |
| `Failed to load products` | Wrong base URL | Confirm API port in `productService.ts` matches `dotnet run` output |
| `relation does not exist` | Migration not applied | Run `dotnet ef database update` |
| `password authentication failed` | Wrong DB credentials | Update `appsettings.json` |
