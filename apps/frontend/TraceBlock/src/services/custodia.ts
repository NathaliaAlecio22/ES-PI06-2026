import type {
  CustodyLot,
  CustodyStep,
} from "../components/custody/custody,types";
import { apiRequest } from "./api";

export type CustodyResult = {
  lot: CustodyLot;
  steps: CustodyStep[];
};

/** Lotes que a organização pode acompanhar (fabricou, tem hoje ou participou da transferência). */
export async function listarLotesCustodia(): Promise<CustodyLot[]> {
  const result = await apiRequest<{ lots: CustodyLot[] }>("/custodia/lotes");
  return result.lots;
}

/** Linha do tempo de custódia de um lote. */
export function buscarCustodiaLote(code: string): Promise<CustodyResult> {
  return apiRequest<CustodyResult>(
    `/custodia/lotes/${encodeURIComponent(code)}`,
  );
}
