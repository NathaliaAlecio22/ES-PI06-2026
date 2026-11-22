import { ethers } from "ethers";

/**
 * The 10 well-known, publicly documented Hardhat local-network accounts.
 *
 * These are derived at runtime from Hardhat's standard development mnemonic
 * ("test test test test test test test test test test test junk") rather than
 * hardcoded, so they can never drift from what `npx hardhat node` prints on
 * startup. Every one of them is pre-funded with 10000 ETH on a local node.
 *
 * PoC-only by design: each registered organization is assigned one of these
 * accounts as its on-chain identity, and the API signs on-chain transactions
 * with that organization's key on its behalf (a custodial signer model — see
 * docs/poc-checklist.md). Because these keys are public knowledge, this is
 * acceptable ONLY against a local Hardhat network; on a public testnet the
 * organizations would bring their own keys, and on mainnet this model would be
 * unacceptable outright. Do not change the mnemonic or the paths without
 * re-checking against the Hardhat docs.
 */

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

const ACCOUNT_COUNT = 10;

export type ChainAccount = {
  /** 0-based index into the standard Hardhat account list. */
  index: number;
  address: string;
  privateKey: string;
};

let cachedAccounts: ChainAccount[] | undefined;

/** All 10 standard accounts, in index order. */
export function hardhatAccounts(): ChainAccount[] {
  if (!cachedAccounts) {
    cachedAccounts = Array.from({ length: ACCOUNT_COUNT }, (_, index) => {
      const wallet = ethers.HDNodeWallet.fromPhrase(
        HARDHAT_MNEMONIC,
        undefined,
        `m/44'/60'/0'/0/${index}`,
      );
      return { index, address: wallet.address, privateKey: wallet.privateKey };
    });
  }
  return cachedAccounts;
}

/**
 * Picks the first standard account whose address is not already bound to an
 * organization (`usedAddresses` — in practice every `participante.wallet_address`
 * in the database). Deterministic first-free allocation keeps the mapping stable
 * and easy to reason about on a resettable local chain.
 *
 * Throws `NoChainAccountAvailableError` when all 10 are taken — the PoC is
 * explicitly capped at 10 concurrently registered organizations.
 */
export function allocateChainAccount(usedAddresses: string[]): ChainAccount {
  const used = new Set(usedAddresses.map((address) => address.toLowerCase()));
  const free = hardhatAccounts().find(
    (account) => !used.has(account.address.toLowerCase()),
  );
  if (!free) {
    throw new NoChainAccountAvailableError();
  }
  return free;
}

export class NoChainAccountAvailableError extends Error {
  constructor() {
    super(
      "Nenhuma conta de blockchain disponível: o PoC é limitado a 10 organizações simultâneas " +
        "(as 10 contas locais do Hardhat). Desative uma organização existente ou reinicie o nó local.",
    );
    this.name = "NoChainAccountAvailableError";
  }
}

/** Private key for one of the standard accounts, by address. Throws if unknown. */
export function privateKeyForAddress(address: string): string {
  const match = hardhatAccounts().find(
    (account) => account.address.toLowerCase() === address.toLowerCase(),
  );
  if (!match) {
    throw new Error(
      `O endereço ${address} não pertence ao pool de contas locais do Hardhat`,
    );
  }
  return match.privateKey;
}
