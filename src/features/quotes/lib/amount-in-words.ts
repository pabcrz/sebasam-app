const UNITS = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];

const TENS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];

const TENS_WITH_UNIT = [
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];

const HUNDREDS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

/**
 * Converts a number below 1000 to Spanish words.
 *
 * @param n - Number in the range [0, 999].
 * @param apocopate - When true, "uno" becomes "un" (e.g., before masculine nouns
 *   such as "mil", "millones", or "pesos").
 */
function convertLessThanOneThousand(n: number, apocopate: boolean): string {
  if (n < 20) {
    if (apocopate && n === 1) {
      return "un";
    }
    return UNITS[n];
  }

  if (n < 30) {
    if (apocopate && n === 21) {
      return "veintiún";
    }
    return TENS_WITH_UNIT[n - 20];
  }

  if (n < 100) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (unit === 0) {
      return TENS[ten];
    }
    if (apocopate && unit === 1) {
      return `${TENS[ten]} y un`;
    }
    return `${TENS[ten]} y ${UNITS[unit]}`;
  }

  const hundred = Math.floor(n / 100);
  const remainder = n % 100;

  if (remainder === 0) {
    return hundred === 1 ? "cien" : HUNDREDS[hundred];
  }

  return `${HUNDREDS[hundred]} ${convertLessThanOneThousand(remainder, apocopate)}`;
}

/**
 * Converts a positive integer to Spanish words.
 *
 * @param n - Number to convert.
 * @param apocopate - When true, trailing "uno" forms are shortened to "un".
 */
function convertNumber(n: number, apocopate: boolean): string {
  if (n === 0) {
    return "cero";
  }

  if (n < 1000) {
    return convertLessThanOneThousand(n, apocopate);
  }

  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    const thousandsText = thousands === 1 ? "mil" : `${convertLessThanOneThousand(thousands, true)} mil`;

    if (remainder === 0) {
      return thousandsText;
    }

    return `${thousandsText} ${convertLessThanOneThousand(remainder, apocopate)}`;
  }

  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000);
    const remainder = n % 1_000_000;
    const millionsText =
      millions === 1 ? "un millón" : `${convertLessThanOneThousand(millions, true)} millones`;

    if (remainder === 0) {
      return millionsText;
    }

    return `${millionsText} ${convertNumber(remainder, apocopate)}`;
  }

  const billions = Math.floor(n / 1_000_000_000);
  const remainder = n % 1_000_000_000;
  const billionsText =
    billions === 1 ? "mil millones" : `${convertLessThanOneThousand(billions, true)} mil millones`;

  if (remainder === 0) {
    return billionsText;
  }

  return `${billionsText} ${convertNumber(remainder, apocopate)}`;
}

/**
 * Converts a monetary amount in cents to its Spanish text representation.
 *
 * Output follows the Mexican invoice convention:
 *   "<words> PESOS XX/100 M.N."
 *
 * Examples:
 *   - 0      -> "CERO PESOS 00/100 M.N."
 *   - 100    -> "UN PESO 00/100 M.N."
 *   - 11600  -> "CIENTO DIECISÉIS PESOS 00/100 M.N."
 *   - 2100000 -> "VEINTIÚN MIL PESOS 00/100 M.N."
 *   - 100000000 -> "UN MILLÓN DE PESOS 00/100 M.N."
 *
 * @param cents - Whole cents to convert. Must be a non-negative integer.
 */
export function formatAmountInWords(cents: number): string {
  if (!Number.isFinite(cents) || !Number.isInteger(cents) || cents < 0) {
    throw new Error("cents must be a non-negative integer");
  }

  const pesos = Math.floor(cents / 100);
  const centavos = cents % 100;

  const words = convertNumber(pesos, true);
  const centavosText = String(centavos).padStart(2, "0");

  const endsInMillions = words.endsWith("millón") || words.endsWith("millones");
  const currencyWord = pesos === 1 ? "peso" : "pesos";
  const dePrefix = endsInMillions ? "de " : "";

  return `${words} ${dePrefix}${currencyWord} ${centavosText}/100 M.N.`.toUpperCase();
}
