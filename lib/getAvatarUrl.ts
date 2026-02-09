function hashStringToNumber(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export default function getAvatarUrl(seed: string) {
  const colors = [
    "#E0BBE4",
    "#FFDFD3",
    "#FFB7B2",
    "#A0E7E5",
    "#B4F8C8",
    "#FBE7C6",
  ];

  const hash = hashStringToNumber(seed);
  const deterministicColor = colors[hash % colors.length];
  const encodedColor = encodeURIComponent(deterministicColor);

  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${encodedColor}`;
}
