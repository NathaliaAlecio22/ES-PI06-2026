export type ProductStatus =
  | "Em transporte"
  | "Armazenado"
  | "Entregue"
  | "Em produção"
  | "Pendente"
  | "Com ocorrência";

export interface Product {
  code: string;
  name: string;
  lot: string;
  category: string;
  date: string;
  owner: string;
  location: string;
  status: ProductStatus;
  quantity?: string;
  expirationDate?: string;
  description?: string;
  manufacturer?: string;
  responsible?: string;
}

export interface ProductFormData {
  name: string;
  code: string;
  category: string;
  description: string;
  lot: string;
  manufacturingDate: string;
  expirationDate: string;
  quantity: string;
  unit: string;
  manufacturer: string;
  responsible: string;
  location: string;
}