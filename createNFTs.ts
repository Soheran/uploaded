import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  mplCandyMachine,
  fetchCandyMachine,
  fetchCandyGuard,
  create,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  keypairIdentity,
  publicKey,
  generateSigner,
  percentAmount,
  some,
} from "@metaplex-foundation/umi";
import {
  createNft,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import secret from "./accounts/acc1.json";

const umi = createUmi("https://api.devnet.solana.com/").use(mplCandyMachine());

// Import your private key file and parse it.
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
umi.use(keypairIdentity(keypair));

// Create the Collection NFT.
async function createCollectionNft() {
  const collectionMint = generateSigner(umi);
  console.log("collectionMint: ", collectionMint);
  await createNft(umi, {
    mint: collectionMint,
    authority: umi.identity,
    name: "AAT Collection",
    uri: "https://res.cloudinary.com/db9aqguwu/raw/upload/v1711614443/collection1_beb2fj.json",
    sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
    isCollection: true,
  }).sendAndConfirm(umi);

  // Create the Candy Machine.
  const candyMachine = generateSigner(umi);
  console.log("candyMachine: ", candyMachine);
  const createCandyMachineTransaction = create(umi, {
    candyMachine,
    collectionMint: collectionMint.publicKey,
    collectionUpdateAuthority: umi.identity,
    tokenStandard: TokenStandard.NonFungible,
    sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
    itemsAvailable: 5000,
    creators: [
      {
        address: umi.identity.publicKey,
        verified: true,
        percentageShare: 100,
      },
    ],
    configLineSettings: some({
      prefixName: "",
      nameLength: 32,
      prefixUri: "",
      uriLength: 200,
      isSequential: false,
    }),
  });
  (await createCandyMachineTransaction).sendAndConfirm(umi);
}
