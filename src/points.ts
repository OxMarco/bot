import { rarity } from "./config";

const getRarity = (nftId: number): number => {
  return rarity.find((data) => data.nftIds.includes(nftId))?.rarity || 1;
};

export const computePoints = (
  a: number,
  b: number,
  nfts: number[],
  tokenBalance: number,
): number => {
  const nftSum = nfts.reduce((sum, nftId) => {
    const nftRarity = getRarity(nftId);
    return sum + nftRarity;
  }, 0);

  const points = (nftSum / a) * (tokenBalance / b);

  return points;
};
