export type WalletProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("Instale ou habilite uma carteira compatível com Ethereum.");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("A carteira não retornou um endereço válido.");
  }
  return accounts[0];
}

export async function signWalletMessage(message: string): Promise<{
  address: string;
  signature: string;
}> {
  const address = await connectWallet();
  const signature = await window.ethereum!.request({
    method: "personal_sign",
    params: [message, address],
  });
  if (typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    throw new Error("A carteira retornou uma assinatura inválida.");
  }
  return { address, signature };
}
