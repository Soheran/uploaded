import { Connection, Keypair } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import secret from "./acc1.json";

const endpoint = "https://api.devnet.solana.com/";
const connection = new Connection(endpoint, {
  commitment: "finalized",
});

const WALLET = Keypair.fromSecretKey(new Uint8Array(secret));
const NFT_METADATA =
  "https://mfp2m2qzszjbowdjl2vofmto5aq6rtlfilkcqdtx2nskls2gnnsa.arweave.net/YV-mahmWUhdYaV6q4rJu6CHozWVC1CgOd9NkpctGa2Q";
const COLLECTION_NFT_MINT = "9LHhxeDGtUAWCpdpGs6mkdHhUWeN4gFfk6tjSsk7Dxpw";

const METAPLEX = Metaplex.make(connection).use(keypairIdentity(WALLET));

async function createCollectionNft() {
  const { nft: collectionNft } = await METAPLEX.nfts().create({
    name: "QuickNode Demo NFT Collection",
    uri: NFT_METADATA,
    sellerFeeBasisPoints: 0,
    isCollection: true,
    updateAuthority: WALLET,
  });

  console.log(
    `✅ - Minted Collection NFT: ${collectionNft.address.toString()}`
  );
  console.log(
    `     https://explorer.solana.com/address/${collectionNft.address.toString()}?cluster=devnet`
  );
}

createCollectionNft();
