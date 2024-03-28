const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const {
  burn,
  getOrCreateAssociatedTokenAccount,
} = require("@solana/spl-token");
const fs = require("fs");
import secret from "./accounts/acc1.json";

const RPC_URL = "https://api.devnet.solana.com/";
const KEYPAIR_PATH = "pk_backup.json";

const fromWallet = Keypair.fromSecretKey(Uint8Array.from(secret));

const payer = fromWallet;

const tokenMint = "5EJsQuV6yQanfhtaQNMLEH31amZgwXq5Yd47ra2JNsAG"; // a spammy token

async function burnToken() {
  const tokenMintPublicKey = new PublicKey(tokenMint);

  const connection = new Connection(RPC_URL, {
    commitment: "confirmed",
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 120000,
  });

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMintPublicKey,
    fromWallet.publicKey
  );

  const signature = await burn(
    connection,
    payer,
    tokenAccount.address,
    tokenMintPublicKey,
    fromWallet.publicKey,
    1000000 * Math.pow(10, 8), // delete 1 ft
    []
  );
  console.log("signature", signature);
  return signature;
}

burnToken();
