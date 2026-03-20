export const normalizeSan = (input: string): string => {
  let san = input.trim().replace(/\s+/g, '').replace(/0/g, 'o');

  const castleMatch = san.match(/^o-?o(-?o)?([+#])?$/i);
  if (castleMatch) {
    const isLong = Boolean(castleMatch[1]);
    const suffix = castleMatch[2] ?? '';
    return isLong ? `O-O-O${suffix}` : `O-O${suffix}`;
  }

  san = san.replace(/X/g, 'x');

  const isPawnSan = /^[a-h](x|[1-8])/i.test(san);
  if (!isPawnSan) {
    san = san.replace(/^([kqrbn])/i, (match) => match.toUpperCase());
  }
  san = san.replace(/=([kqrbn])/i, (_, piece) => `=${piece.toUpperCase()}`);
  const head = san.slice(0, 1);
  const tail = san.slice(1).replace(/([a-h])/gi, (match) => match.toLowerCase());
  return `${head}${tail}`;
};
