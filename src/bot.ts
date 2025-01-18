import { createPublicClient, getContract, http } from "viem";
import { mainnet } from "viem/chains";
import { z } from "zod";
import * as dotenv from "dotenv";
import { ERC721_ABI } from "./abis/erc721";
import { ERC20_ABI } from "./abis/erc20";
import { computePoints } from "./points";

dotenv.config();

const EnvSchema = z.object({
  RPC_URL: z.string().url("RPC_URL must be a valid URL"),
  NFT_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum contract address"),
  TOKEN_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum contract address"),
  A: z.string(),
  B: z.string(),
  START_TOKEN_ID: z
    .string()
    .regex(/^\d+$/, "START_TOKEN_ID must be an integer string")
    .optional(),
  END_TOKEN_ID: z
    .string()
    .regex(/^\d+$/, "END_TOKEN_ID must be an integer string")
    .optional(),
});
const env = EnvSchema.parse(process.env);

const client = createPublicClient({
  chain: mainnet,
  transport: http(env.RPC_URL),
});

const nft = getContract({
  address: env.NFT_CONTRACT_ADDRESS as `0x${string}`,
  abi: ERC721_ABI,
  client,
});

const token = getContract({
  address: env.TOKEN_CONTRACT_ADDRESS as `0x${string}`,
  abi: ERC20_ABI,
  client,
});

const main = async () => {
  const startTokenId = env.START_TOKEN_ID
    ? parseInt(env.START_TOKEN_ID, 10)
    : 0;
  let endTokenId: number;

  if (env.END_TOKEN_ID) {
    endTokenId = Number(env.END_TOKEN_ID);
  } else {
    try {
      endTokenId = Number(await nft.read.totalSupply());
    } catch (err) {
      throw new Error(
        "`totalSupply` not available or failed. Please provide END_TOKEN_ID explicitly.",
      );
    }
  }

  console.log(
    `Querying token holders from ID ${startTokenId} to ${endTokenId}...`,
  );

  const holderMap = new Map<string, number[]>();

  for (let tokenId = startTokenId; tokenId <= endTokenId; tokenId++) {
    try {
      const holder = await nft.read.ownerOf([BigInt(tokenId)]);
      const current = holderMap.get(holder) ?? [];
      current.push(tokenId);
      holderMap.set(holder, current);
    } catch (error: any) {
      console.warn(`Error fetching owner for token ID ${tokenId}: ${error}`);
    }
  }

  const addresses = Array.from(holderMap.keys());
  console.log(`Fetching ERC20 balances for ${addresses.length} addresses...`);

  // holders[i] = { address, nfts, token, time }
  const holders = [];

  for (const address of addresses) {
    let balance = BigInt(0);
    try {
      balance = await token.read.balanceOf([address as `0x${string}`]);
    } catch (error: any) {
      console.warn(`Error fetching balance for address ${address}: ${error}`);
    }

    const nftTokenIds = holderMap.get(address) ?? [];
    const tokenBalance = balance;

    holders.push({
      address,
      nfts: nftTokenIds,
      token: tokenBalance,
      points: computePoints(
        Number(env.A),
        Number(env.B),
        nftTokenIds,
        Number(tokenBalance),
      ), /// @dev this may break for huge token balances
      time: Date.now(),
    });
  }

  console.log("Final holders data:", holders);
};

(async () => {
  try {
    await main();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  }
})();
