import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { mintTo, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import fs from "fs";

// const RPC_URL = "https://api.devnet.solana.com/";
const KEYPAIR_PATH = "pk_backup.json";
const secret = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
const fromWallet = Keypair.fromSecretKey(Uint8Array.from(secret));

const payer = fromWallet;

const tokenMint = "FrAi5auPDfa2WF2aHi6kWtBfVWqqKcSG1PfDxiNsVsGE"; // a spammy token

async function mintToken() {
  const tokenMintPublicKey = new PublicKey(tokenMint);

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMintPublicKey,
    fromWallet.publicKey
  );

  //   const signature = await mintTo(
  //     connection,
  //     payer,
  //     tokenAccount.address,
  //     tokenMintPublicKey,
  //     fromWallet.publicKey,
  //     1 * Math.pow(10, 8), // mint 1 ft
  //     []
  //   );
  //   console.log("signature", signature);

  const signature = await mintTo(
    connection,
    fromWallet,
    tokenMintPublicKey,
    tokenAccount.address,
    fromWallet.publicKey,
    1000 * Math.pow(10, 8) // mint 1 ft
  );
  console.log(`Mint Signature: ${signature}`);

  return signature;
}

mintToken();
