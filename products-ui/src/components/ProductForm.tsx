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
    setForm(initial ? { name: initial.name, description: initial.description, price: initial.price, stock: initial.stock } : empty);
  }, [initial]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? Number(value) : value }));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} style={styles.form}>
      <h3>{initial ? 'Edit Product' : 'New Product'}</h3>
      <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={styles.input} />
      <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} style={styles.input} />
      <input name="price" type="number" step="0.01" placeholder="Price" value={form.price} onChange={handleChange} required style={styles.input} />
      <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} required style={styles.input} />
      <div style={styles.row}>
        <button type="submit" style={styles.btn}>{initial ? 'Update' : 'Create'}</button>
        <button type="button" onClick={onCancel} style={{ ...styles.btn, background: '#888' }}>Cancel</button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 },
  input: { padding: 8, fontSize: 14, borderRadius: 4, border: '1px solid #ccc' },
  btn: { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  row: { display: 'flex', gap: 8 },
};
