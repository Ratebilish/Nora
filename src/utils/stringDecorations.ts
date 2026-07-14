export const fillSpaces = (
  maxSymbols: number,
  str: string = "",
  symbolsCount: number = null,
  symbol: string = " "
) => {
  return `${str}${[
    ...Array(symbolsCount || Math.abs(maxSymbols - str.length)).keys(),
  ]
    .map((_) => symbol)
    .join("")}`;
};

/**
 * Символы CJK/Hangul/Kana занимают в моноширинных шрифтах (в том числе в
 * Discord) визуально в 2 раза больше места, чем латиница/цифры, хотя в
 * JS-строке считаются как один символ. fillSpaces этого не учитывает и
 * "съезжает" колонки в таблицах, где есть корейские/китайские/японские
 * символы вперемешку с латиницей.
 */
const isWideChar = (codePoint: number): boolean =>
  (codePoint >= 0x1100 && codePoint <= 0x115f) || // Hangul Jamo
  (codePoint >= 0x2e80 && codePoint <= 0x303e) || // CJK Radicals, symbols
  (codePoint >= 0x3041 && codePoint <= 0x33ff) || // Hiragana, Katakana, CJK compat
  (codePoint >= 0x3400 && codePoint <= 0x4dbf) || // CJK Ext A
  (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK Unified Ideographs
  (codePoint >= 0xa960 && codePoint <= 0xa97f) || // Hangul Jamo Ext-A
  (codePoint >= 0xac00 && codePoint <= 0xd7a3) || // Hangul Syllables
  (codePoint >= 0xf900 && codePoint <= 0xfaff) || // CJK Compat Ideographs
  (codePoint >= 0xff00 && codePoint <= 0xff60) || // Fullwidth forms
  (codePoint >= 0xffe0 && codePoint <= 0xffe6) || // Fullwidth signs
  (codePoint >= 0x20000 && codePoint <= 0x3ffff); // CJK Ext B+ (surrogate pairs)

export const displayWidth = (str: string): number => {
  let width = 0;
  for (const ch of str) {
    width += isWideChar(ch.codePointAt(0) as number) ? 2 : 1;
  }
  return width;
};

/**
 * Как fillSpaces, но выравнивает по визуальной ширине (displayWidth),
 * а не по количеству JS-символов — использовать вместо fillSpaces везде,
 * где в одной колонке могут смешиваться латиница и CJK/Hangul.
 */
export const padDisplay = (
  targetWidth: number,
  str: string = ""
): string => {
  const pad = Math.max(0, targetWidth - displayWidth(str));
  return str + " ".repeat(pad);
};
