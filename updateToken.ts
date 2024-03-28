import {
  signerIdentity,
  createSignerFromKeypair,
  publicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  updateV1,
  fetchMetadataFromSeeds,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import secret from "./pk_backup.json";

// Initialize UMI
const umi = createUmi("https://api.devnet.solana.com/"); // Replace with your Solana RPC endpoint

// Load user's wallet
const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);

umi.use(signerIdentity(userWalletSigner));
umi.use(mplTokenMetadata());

const updateAuthority = userWalletSigner;
const mint = publicKey("B6t3t5ZfJyrsycXr3LD8oTJzqGEbGH8fmCNHkxmKLaW4");

(async () => {
  const initialMetadata = await fetchMetadataFromSeeds(umi, { mint });

  const initialMetadataWithDescription = {
    ...initialMetadata,
    description: "Your description goes here",
  };

  console.log(initialMetadataWithDescription);
  // await updateV1(umi, {
  //   mint,
  //   authority: updateAuthority,
  //   data: {
  //     ...initialMetadata,
  //     name: "Updated Asset 3",
  //     symbol: "UA3",
  //     uri: "https://raw.githubusercontent.com/Soheran/uploaded/main/token5.json",

  //   },
  // }).sendAndConfirm(umi);

  await updateV1(umi, {
    mint,
    authority: updateAuthority,
    data: initialMetadataWithDescription, // Include the updated metadata object
  }).sendAndConfirm(umi);
})();
