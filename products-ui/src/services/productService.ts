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
