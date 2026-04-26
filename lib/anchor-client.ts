import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { VELORAN_PROGRAM_ID } from "./solana";

/**
 * Builds the `pay_for_content` instruction for the Veloran Anchor
 * program. The program splits `amount` micro-USDC 95/5 between the
 * creator's USDC ATA and the platform treasury's USDC ATA in a
 * single atomic CPI transferChecked pair.
 *
 * We encode the instruction by hand (discriminator + u64) instead of
 * pulling in the full Anchor client to keep the bundle small.
 */

// Discriminator from anchor/target/idl/veloran_paywall.json
// (sha256("global:pay_for_content")[..8])
const PAY_FOR_CONTENT_DISCRIMINATOR = Uint8Array.from([
  175, 34, 1, 20, 153, 78, 194, 215,
]);

export type PayForContentAccounts = {
  reader: PublicKey;
  readerAta: PublicKey;
  creatorAta: PublicKey;
  platformAta: PublicKey;
  mint: PublicKey;
};

export function buildPayForContentIx(
  accounts: PayForContentAccounts,
  amount: bigint
): TransactionInstruction {
  // Data: 8-byte discriminator + 8-byte little-endian u64 amount
  const data = new Uint8Array(16);
  data.set(PAY_FOR_CONTENT_DISCRIMINATOR, 0);
  // Write u64 LE
  const dv = new DataView(data.buffer);
  dv.setBigUint64(8, amount, true);

  return new TransactionInstruction({
    programId: VELORAN_PROGRAM_ID,
    keys: [
      { pubkey: accounts.reader, isSigner: true, isWritable: true },
      { pubkey: accounts.readerAta, isSigner: false, isWritable: true },
      { pubkey: accounts.creatorAta, isSigner: false, isWritable: true },
      { pubkey: accounts.platformAta, isSigner: false, isWritable: true },
      { pubkey: accounts.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

// Re-exported for callers that need it alongside the above
export { SystemProgram };
