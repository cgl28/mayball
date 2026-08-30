export type AllocationComparison = {
  previousMinor: number | null;
  proposedMinor: number;
  changeMinor: number | null;
  percentageChange: string | null;
};

export function compareAllocation(previousMinor: number | null, proposedMinor: number): AllocationComparison {
  if (previousMinor === null) {
    return { previousMinor, proposedMinor, changeMinor: null, percentageChange: null };
  }

  const changeMinor = proposedMinor - previousMinor;
  if (previousMinor === 0) {
    return { previousMinor, proposedMinor, changeMinor, percentageChange: null };
  }

  // This is display-only context, but retain integer arithmetic for monetary values.
  const absoluteChange = BigInt(Math.abs(changeMinor));
  const previous = BigInt(previousMinor);
  const ten = BigInt(10);
  const tenthsOfAPercent = (absoluteChange * BigInt(1000) + previous / BigInt(2)) / previous;
  return {
    previousMinor,
    proposedMinor,
    changeMinor,
    percentageChange: `${tenthsOfAPercent / ten}.${tenthsOfAPercent % ten}%`,
  };
}
