import {
  generateSigner,
  signerIdentity,
  createSignerFromKeypair,
  percentAmount,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  TokenStandard,
  createAndMint,
  updateV1,
} from "@metaplex-foundation/mpl-token-metadata";
import secret from "./acc1.json";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";

// Initialize UMI
const umi = createUmi("https://api.devnet.solana.com/"); // Replace with your Solana RPC endpoint

// Load user's wallet
const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);

// Specify metadata for the token
const metadata = {
  name: "aatToken",
  symbol: "aat",
  uri: "https://res.cloudinary.com/db9aqguwu/raw/upload/v1711354850/aatToken_kbeit2.json",
};

const mint = generateSigner(umi);
umi.use(signerIdentity(userWalletSigner));
umi.use(mplCandyMachine());

// Create and mint the token
createAndMint(umi, {
  mint,
  authority: umi.identity,
  name: metadata.name,
  symbol: metadata.symbol,
  sellerFeeBasisPoints: percentAmount(0), // Convert number to percentAmount
  decimals: 0, // Number of decimal places for the token
  amount: 100, // Initial supply of the token
  tokenOwner: userWallet.publicKey,
  tokenStandard: TokenStandard.Fungible,
  uri: metadata.uri,
})
  .sendAndConfirm(umi)
  .then(() => {
    console.log(`Successfully minted ${metadata.name}`);
  })
  .catch((error) => {
    console.error("Error minting token:", error);
  });
