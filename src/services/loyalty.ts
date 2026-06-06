export const resolveYmBalance = (loyalty: any) => {
  const candidates = [
    loyalty?.points_balance,
    loyalty?.points,
    loyalty?.rewards_points,
    loyalty?.reward_points,
    loyalty?.yello_bucks_balance,
    loyalty?.balance,
  ];

  for (const candidate of candidates) {
    const numeric = typeof candidate === 'number' ? candidate : Number(String(candidate ?? '').replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return 0;
};

export const resolvePointsToNext = (loyalty: any) => {
  const candidates = [loyalty?.points_to_next, loyalty?.pointsToNext, loyalty?.next_tier_points];
  for (const candidate of candidates) {
    const numeric = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

export const normalizeLoyaltyPayload = (source: any = {}, legacySource: any = {}) => {
  const pointsBalance = resolveYmBalance(source) || resolveYmBalance(legacySource);
  return {
    ...source,
    points_balance: pointsBalance,
    points: source?.points ?? pointsBalance,
    rewards_points: source?.rewards_points ?? pointsBalance,
    reward_points: source?.reward_points ?? pointsBalance,
    yello_bucks_balance: source?.yello_bucks_balance ?? legacySource?.balance ?? pointsBalance,
    current_tier: source?.current_tier ?? legacySource?.tier ?? 'Bronze',
    next_tier: source?.next_tier ?? 'Silver',
    points_to_next: resolvePointsToNext(source) || resolvePointsToNext(legacySource),
    progress_percentage: source?.progress_percentage ?? legacySource?.progress_percentage ?? 0,
  };
};

