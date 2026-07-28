export type MobileGameType = 'spin_wheel' | 'mystery_box' | 'daily_streak' | string;

export interface MobileGame {
  id: string | number;
  type: MobileGameType;
  title: string;
  subtitle?: string;
  description?: string;
  active?: boolean;
  spin_cost?: number;
  reward_pool?: unknown;
  cooldown?: number;
}

const normalizeGame = (game: any, index: number): MobileGame => ({
  id: game?.id ?? game?.game_id ?? index + 1,
  type: String(game?.type ?? game?.game_type ?? game?.category ?? 'spin_wheel'),
  title: String(game?.title ?? game?.name ?? `Game ${index + 1}`),
  subtitle: game?.subtitle ? String(game.subtitle) : undefined,
  description: game?.description ? String(game.description) : undefined,
  active: game?.active !== false,
  spin_cost: Number.isFinite(Number(game?.spin_cost)) ? Number(game.spin_cost) : undefined,
  reward_pool: game?.reward_pool,
  cooldown: Number.isFinite(Number(game?.cooldown)) ? Number(game.cooldown) : undefined,
});

export const normalizeGamesPayload = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const gamification = source.gamification ?? {};
  const gamesSource = source.games ?? source.active_games ?? source.catalog ?? source.items ?? [];
  const games = Array.isArray(gamesSource) ? gamesSource.map(normalizeGame) : [];
  const activeGames = games.filter((game) => game.active !== false);

  if (activeGames.length > 0) {
    return {
      games,
      active_games: activeGames,
      primary_game:
        activeGames.find((game) => game.type === 'spin_wheel') ?? activeGames[0] ?? null,
      source: 'backend',
    };
  }

  return {
    games: [],
    active_games: [],
    primary_game: null,
    source: 'backend',
  };
};

export const getPrimaryGame = (gamesPayload: any) => {
  const activeGames = Array.isArray(gamesPayload?.active_games) ? gamesPayload.active_games : [];
  return (
    activeGames.find((game: MobileGame) => game.type === 'spin_wheel') ??
    activeGames[0] ??
    gamesPayload?.primary_game ??
    null
  );
};
