import { getToken } from "./auth";

import type {
  NewTransferData,
  Transfer,
  TransferOptions,
  TransferStatsData,
} from "../components/transfers/tranfers.type";
import { signWalletMessage } from "./wallet";

const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"
).replace(/\/$/, "");

type ApiTransfer = {
  id: string;
  rawId: string;
  product: string;
  lot: string;
  previousOwner: string;
  newOwner: string;
  date: string;
  time: string;
  status: Transfer["status"];
  storageStatus: Transfer["storageStatus"];
  hash: string;
  location: string;
  quantity: string;
  temperature?: string;
  humidity?: string;
  notes?: string;
  canRespond: boolean;
};

function formatDecimal(value?: string): string | undefined {
  if (value == null || value === "") return undefined;
  return value.replace(".", ",");
}

function mapTransfer(item: ApiTransfer): Transfer {
  const temperature = formatDecimal(item.temperature);
  const humidity = formatDecimal(item.humidity);

  return {
    ...item,
    temperature: temperature ? `${temperature} °C` : undefined,
    humidity: humidity ? `${humidity}%` : undefined,
  };
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
  });

  if (
    !response.headers
      .get("content-type")
      ?.includes("application/json")
  ) {
    throw new Error(
      `A API respondeu HTTP ${response.status} sem JSON. Verifique se a rota de transferências está registrada no backend.`,
    );
  }

  const result = (await response.json()) as T & {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      result.message || result.error || "Não foi possível concluir a operação.",
    );
  }

  return result;
}

// Listar transferências
export async function listarTransferencias(): Promise<Transfer[]> {
  const result = await requestJson<{
    transfers: ApiTransfer[];
  }>("/transferencias");

  return result.transfers.map(mapTransfer);
}

// Buscar indicadores
export async function buscarEstatisticasTransferencias(): Promise<TransferStatsData> {
  return requestJson<TransferStatsData>(
    "/transferencias/stats",
  );
}

// Buscar lotes e participantes disponíveis
export async function buscarOpcoesTransferencia(): Promise<TransferOptions> {
  return requestJson<TransferOptions>(
    "/transferencias/opcoes",
  );
}

function parseOptionalDecimal(
  value: string,
): number | undefined {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) return undefined;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      "Informe valores numéricos válidos para temperatura e umidade.",
    );
  }

  return parsed;
}

// Criar transferência
export async function criarTransferencia(
  data: NewTransferData,
): Promise<Transfer> {
  const body: {
    lot: string;
    destinationId: string;
    location: string;
    temperature?: number;
    humidity?: number;
    notes?: string;
    signature?: string;
  } = {
    lot: data.lot,
    destinationId: data.destinationId,
    location: data.location.trim(),
    temperature: parseOptionalDecimal(data.temperature),
    humidity: parseOptionalDecimal(data.humidity),
    notes: data.notes.trim() || undefined,
  };

  const prepared = await requestJson<{
    blockchainRequired: boolean;
    digest?: string;
    signer?: string;
  }>("/transferencias/assinatura", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (prepared.blockchainRequired) {
    if (!prepared.digest || !prepared.signer) {
      throw new Error("A API não retornou os dados necessários para assinar a transferência.");
    }
    const signed = await signWalletMessage(prepared.digest);
    if (signed.address.toLowerCase() !== prepared.signer.toLowerCase()) {
      throw new Error("Conecte a carteira atribuída à etapa atual para autorizar esta transferência.");
    }
    body.signature = signed.signature;
  }

  const result = await requestJson<{
    transfer: ApiTransfer;
  }>("/transferencias", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return mapTransfer(result.transfer);
}

// Confirmar recebimento
export async function confirmarTransferencia(
  rawId: string,
): Promise<Transfer> {
  const result = await requestJson<{
    transfer: ApiTransfer;
  }>(
    `/transferencias/${encodeURIComponent(rawId)}/confirmar`,
    {
      method: "POST",
    },
  );

  return mapTransfer(result.transfer);
}

// Registrar ocorrência
export async function registrarOcorrenciaTransferencia(
  rawId: string,
  notes: string,
): Promise<Transfer> {
  const result = await requestJson<{
    transfer: ApiTransfer;
  }>(
    `/transferencias/${encodeURIComponent(rawId)}/ocorrencia`,
    {
      method: "POST",
      body: JSON.stringify({
        notes: notes.trim(),
      }),
    },
  );

  return mapTransfer(result.transfer);
}