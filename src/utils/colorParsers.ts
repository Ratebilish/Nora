export const hslToHex = (h: number, s: number, l: number): number => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
};

export const getWinrateColor = (value: number) => {
  const hue = (value / 100) * 120;
  return hslToHex(hue, 100, 40);
};
