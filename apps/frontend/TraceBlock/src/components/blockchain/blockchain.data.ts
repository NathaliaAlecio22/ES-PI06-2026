import type { Block, Transaction } from "./blockchain.types";

export const transactions: Transaction[] = [
  {
    hash: "0x8f2a...9c41",
    block: "#894.215",
    event: "Transferência de custódia",
    item: "LOTE-2026-001",
    party: "TransLog Brasil",
    date: "18/03/2026 · 14:32",
    status: "Confirmada",
  },
  {
    hash: "0x71bd...e229",
    block: "#894.208",
    event: "Leitura de condição",
    item: "LOTE-2026-014",
    party: "CD Campinas",
    date: "18/03/2026 · 14:18",
    status: "Confirmada",
  },
  {
    hash: "0xc920...1a73",
    block: "#894.192",
    event: "Recebimento",
    item: "LOTE-2026-009",
    party: "Distribuidora Nacional",
    date: "18/03/2026 · 13:54",
    status: "Confirmada",
  },
  {
    hash: "0x35ae...7b10",
    block: "#894.181",
    event: "Registro de ocorrência",
    item: "LOTE-2026-018",
    party: "RotaSul Logística",
    date: "18/03/2026 · 13:21",
    status: "Em análise",
  },
  {
    hash: "0xa624...0d88",
    block: "#894.164",
    event: "Cadastro de produto",
    item: "LOTE-2026-021",
    party: "TechWare Brasil",
    date: "18/03/2026 · 12:48",
    status: "Confirmada",
  },
];

export const blocks: Block[] = [
  { number: "#894.211", time: "12 min atrás", active: false },
  { number: "#894.212", time: "9 min atrás", active: false },
  { number: "#894.213", time: "6 min atrás", active: false },
  { number: "#894.214", time: "3 min atrás", active: false },
  { number: "#894.215", time: "18s atrás", active: true },
];