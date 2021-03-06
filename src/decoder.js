module.exports = (encoding, body) => {
  switch (encoding) {
    case 'base64':
      return Buffer.from(body.toString(), 'base64'); // ew on the toString, TODO figure this out
    case 'quoted-printable':
      return convertQuotedPrintable(body);
    case '8bit':
    case '7bit':
    case 'binary':
      return body;
    default:
      throw new Error(`Unknown encoding ${encoding}body: ${body}`);
  }
};

const EQUALS = '='.charCodeAt(0);
const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);
const ZERO = '0'.charCodeAt(0);
const NINE = '9'.charCodeAt(0);
const A = 'A'.charCodeAt(0);
const F = 'F'.charCodeAt(0);
const D = 'D'.charCodeAt(0);
const THREE = '3'.charCodeAt(0);

const isAsciiNum = code => code >= ZERO && code <= NINE;
const isHexDigit = code => code >= A && code <= F;

function convertQuotedPrintable(body) {
  const len = body.length;
  const decoded = Buffer.alloc(len); // at most this big
  const runTo = len - 3;
  let j = 0;
  for (let i = 0; i < runTo; i++) {
    if (body[i] !== EQUALS) {
      decoded[j++] = body[i];
      continue;
    }
    // We are dealing with a '=xx' sequence.
    const upper = body[++i];
    const lower = body[++i];

    // fast path for =3D
    if (upper === THREE && lower === D) {
      decoded[j++] = EQUALS;
      continue;
    }
    let upperTranslated = 1000;
    let lowerTranslated = 1000;
    if (upper === CR && lower === LF) {
      continue;
    }
    if (upper === LF) { // windows chrome does invalid encoding with \n and not \r\n
      i--;
      continue;
    }
    if (isAsciiNum(upper)) {
      upperTranslated = upper - ZERO;
    }
    if (isHexDigit(upper)) {
      upperTranslated = upper - A + 10;
    }
    if (upperTranslated === 1000) { // invalid seq
      decoded[j++] = EQUALS;
      decoded[j++] = upper;
      decoded[j++] = lower;
      continue;
    }

    if (isAsciiNum(lower)) {
      lowerTranslated = lower - ZERO;
    }
    if (isHexDigit(lower)) {
      lowerTranslated = lower - A + 10;
    }
    if (lowerTranslated === 1000) { // invalid seq
      decoded[j++] = EQUALS;
      decoded[j++] = upper;
      decoded[j++] = lower;
      continue;
    }
    const shifted = upperTranslated << 4;
    decoded[j++] = (shifted | lowerTranslated);
  }
  for (let i = runTo; i < len; i++) {
    decoded[j++] = body[i];
  }
  return decoded.slice(0, j);
}
