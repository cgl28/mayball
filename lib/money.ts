const MAX_SAFE_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER);

export function parseMoneyToMinor(input: string) {
  const cleaned = input.trim().replace(/^£/, "").replaceAll(",", "");

  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) {
    throw new Error("Enter a non-negative amount with no more than two decimal places.");
  }

  const [major, minor = ""] = cleaned.split(".");
  const value = BigInt(major) * BigInt(100) + BigInt(minor.padEnd(2, "0"));

  if (value > MAX_SAFE_MINOR_UNITS) {
    throw new Error("Amount is too large.");
  }

  return Number(value);
}

export function minorToInput(value: number | string | bigint | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const minor = BigInt(value);
  const pounds = minor / BigInt(100);
  const pence = minor % BigInt(100);
  return `${pounds}.${pence.toString().padStart(2, "0")}`;
}

export function formatMinor(
  value: number | string | bigint | null | undefined,
  currency = "GBP",
) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  const minor = BigInt(value);
  const pounds = minor / BigInt(100);
  const pence = minor % BigInt(100);
  return `${currency === "GBP" ? "£" : `${currency} `}${pounds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${pence.toString().padStart(2, "0")}`;
}

export function sumMinor(values: Array<number | string | bigint | null | undefined>) {
  return values.reduce<bigint>((total, value) => {
    if (value === null || value === undefined) {
      return total;
    }
    return total + BigInt(value);
  }, BigInt(0));
}
