import type { Product } from '../types/product';

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export function ProductList({ products, onEdit, onDelete }: Props) {
  if (products.length === 0) return <p style={{ color: '#888' }}>No products found.</p>;

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Name</th>
          <th style={styles.th}>Description</th>
          <th style={styles.th}>Price</th>
          <th style={styles.th}>Stock</th>
          <th style={styles.th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.id} style={styles.tr}>
            <td style={styles.td}>{p.name}</td>
            <td style={styles.td}>{p.description}</td>
            <td style={styles.td}>${p.price.toFixed(2)}</td>
            <td style={styles.td}>{p.stock}</td>
            <td style={styles.td}>
              <button onClick={() => onEdit(p)} style={styles.editBtn}>Edit</button>
              <button onClick={() => onDelete(p.id)} style={styles.deleteBtn}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#2563eb', color: '#fff', padding: '10px 12px', textAlign: 'left' },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: '10px 12px' },
  editBtn: { marginRight: 8, padding: '4px 10px', background: '#f59e0b', border: 'none', borderRadius: 4, cursor: 'pointer' },
  deleteBtn: { padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
