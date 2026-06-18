export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
}

export type ProductForm = Omit<Product, 'id' | 'createdAt'>;
