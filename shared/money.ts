/** A canonical, positive PostgreSQL BIGINT monetary value. */
export type Money = string;
export type MoneyLike = string | number | bigint;
/** A signed/zero decimal produced by arithmetic, not valid for persistence. */
export type DerivedMoney = string;

export const PG_BIGINT_MAX = 9_223_372_036_854_775_807n;

/** Normalizes a positive integer amount without ever coercing an unsafe number. */
export function canonicalMoney(value: MoneyLike): Money {
  let amount: bigint;
  if (typeof value === "string") {
    if (!/^[0-9]+$/.test(value)) throw new Error("Money must be a positive integer decimal string");
    amount = BigInt(value);
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Money number must be a positive safe integer");
    amount = BigInt(value);
  } else {
    amount = value;
  }
  if (amount <= 0n || amount > PG_BIGINT_MAX) {
    throw new Error("Money must be positive and no greater than PostgreSQL BIGINT max");
  }
  return amount.toString();
}

export const moneyToBigInt = (value: MoneyLike): bigint => BigInt(canonicalMoney(value));
export const addMoney = (...values: MoneyLike[]): DerivedMoney =>
  values.reduce<bigint>((sum, value) => sum + moneyToBigInt(value), 0n).toString();
/** Exact signed subtraction for derived accounting values. */
export const subtractMoney = (left: MoneyLike, right: MoneyLike): DerivedMoney =>
  (moneyToBigInt(left) - moneyToBigInt(right)).toString();
export const compareMoney = (left: MoneyLike, right: MoneyLike): number => {
  const delta = moneyToBigInt(left) - moneyToBigInt(right);
  return delta === 0n ? 0 : delta < 0n ? -1 : 1;
};
/** Floor allocation of a whole integer percentage. */
export const allocateMoneyPercentage = (value: MoneyLike, percentage: number): Money => {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) throw new Error("Percentage must be an integer from 0 to 100");
  const allocated = moneyToBigInt(value) * BigInt(percentage) / 100n;
  return allocated.toString();
};
/** Formats a non-negative integer derived from money calculations for display. */
export const formatIdrInteger = (value: MoneyLike): string => {
  const amount = typeof value === "number"
    ? (() => {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error("IDR value must be a non-negative safe integer");
      return BigInt(value);
    })()
    : typeof value === "string"
      ? (/^[0-9]+$/.test(value) ? BigInt(value) : (() => { throw new Error("IDR value must be an integer string"); })())
      : value;
  if (amount < 0n) throw new Error("IDR value must be non-negative");
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};