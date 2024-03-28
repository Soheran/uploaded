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
  name: "Winter",
  symbol: "Win",
  uri: "https://raw.githubusercontent.com/Soheran/uploaded/main/token.json",
};

const mint = generateSigner(umi);
umi.use(signerIdentity(userWalletSigner));
umi.use(mplCandyMachine());

createAndMint(umi, {
  mint,
  authority: umi.identity,
  name: metadata.name,
  symbol: metadata.symbol,
  sellerFeeBasisPoints: percentAmount(0), // Convert number to percentAmount
  amount: 1,
  tokenOwner: userWallet.publicKey,
  tokenStandard: TokenStandard.NonFungible,
  uri: metadata.uri,
})
  .sendAndConfirm(umi)
  .then(() => {
    console.log(`Successfully minted ${metadata.name}`);
  })
  .catch((error) => {
    console.error("Error minting token:", error);
  });
