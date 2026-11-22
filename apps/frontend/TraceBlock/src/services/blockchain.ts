import type { BlockchainHistoryResponse } from "../components/blockchain/blockchain.types";
import { apiRequest } from "./api";

export async function getBlockchainHistory(signal?: AbortSignal): Promise<BlockchainHistoryResponse> {
  return apiRequest<BlockchainHistoryResponse>("/blockchain/history", {
    method: "GET",
    signal,
  });
}