import { z } from "zod";

/**
 * Low-level EVM (Ethereum Virtual Machine) value formats shared by every DTO that carries on-chain data.
 */

/** 0x-prefixed 20-byte Ethereum address */
export const evmAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "deve ser um endereço Ethereum hex de 20 bytes com prefixo 0x")
  .refine((value) => !/^0x0{40}$/i.test(value), "não pode ser o endereço zero");

/** 0x-prefixed 32-byte hex string (`bytes32`) */
export const bytes32Schema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "deve ser um hex de 32 bytes (bytes32) com prefixo 0x");

/**
 * 0x-prefixed 65-byte hex signature (`r` 32 bytes + `s` 32 bytes + `v` 1 byte).
 */
export const signatureSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{130}$/, "deve ser uma assinatura hex de 65 bytes com prefixo 0x");

export type EvmAddress = z.infer<typeof evmAddressSchema>;
