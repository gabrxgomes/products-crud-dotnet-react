import { useEffect, useState } from 'react';
import { ProductForm } from './components/ProductForm';
import { ProductList } from './components/ProductList';
import { productService } from './services/productService';
import type { Product, ProductForm as ProductFormType } from './types/product';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setProducts(await productService.getAll());
    } catch {
      setError('Failed to load products. Is the API running?');
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (data: ProductFormType) => {
    try {
      if (editing) {
        await productService.update(editing.id, data);
      } else {
        await productService.create(data);
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch {
      setError('Failed to save product.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditing(product);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productService.delete(id);
      load();
    } catch {
      setError('Failed to delete product.');
    }
  };

  const handleCancel = () => { setShowForm(false); setEditing(null); };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Products CRUD</h1>
      {error && <p style={styles.error}>{error}</p>}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={styles.newBtn}>+ New Product</button>
      )}
      {showForm && (
        <ProductForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
      <ProductList products={products} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' },
  title: { marginBottom: 16 },
  error: { color: 'red', background: '#fee2e2', padding: 8, borderRadius: 4 },
  newBtn: { marginBottom: 16, padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
