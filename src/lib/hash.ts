// A small stable string hash → index, so the same name always picks the same
// colour, face or banner. Shared by avatars, rival characters and profiles.
export function hashToIndex(input: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash % mod;
}
