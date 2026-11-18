import type { Product, ProductFormData } from "../components/products/Products.types";
import { getToken } from "./auth";

export type ProductStatsData = {
  total: number;
  inTransit: number;
  stored: number;
  pending: number;
};

type ApiProduct = {
  code: string;
  name: string;
  lot: string;
  category: string;
  manufacturingDate: string;
  owner: string;
  location: string;
  status: Product["status"];
  quantity: string;
  unit: string;
  expirationDate: string;
  description: string;
  manufacturer: string;
  responsible: string;
};

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api")
  .replace(/\/$/, "");

function formatDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      `A API respondeu HTTP ${response.status} sem JSON. Verifique se o backend está em execução.`,
    );
  }

  const result = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(result.message || "Não foi possível concluir a operação.");
  }

  return result;
}

function toProduct(product: ApiProduct): Product {
  return {
    code: product.code,
    name: product.name,
    lot: product.lot,
    category: product.category,
    date: formatDate(product.manufacturingDate),
    owner: product.owner,
    location: product.location,
    status: product.status,
    quantity: product.quantity
      ? `${product.quantity} ${product.unit}`
      : undefined,
    expirationDate: formatDate(product.expirationDate),
    description: product.description,
    manufacturer: product.manufacturer,
    responsible: product.responsible,
  };
}

export async function listarProdutos(): Promise<Product[]> {
  const result = await requestJson<{ products: ApiProduct[] }>("/produtos");
  return result.products.map(toProduct);
}

export async function buscarEstatisticasProdutos(): Promise<ProductStatsData> {
  return requestJson<ProductStatsData>("/produtos/stats");
}

export async function cadastrarProduto(
  form: ProductFormData,
): Promise<Product> {
  const result = await requestJson<{ product: ApiProduct }>("/produtos", {
    method: "POST",
    body: JSON.stringify({
      name: form.name,
      code: form.code,
      category: form.category,
      description: form.description,
      lot: form.lot,
      manufacturingDate: form.manufacturingDate,
      expirationDate: form.expirationDate || null,
      quantity: form.quantity,
      unit: form.unit,
      location: form.location,
    }),
  });

  return toProduct(result.product);
}
