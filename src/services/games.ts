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

const fallbackGames = (gamification: any = {}) => [
  {
    id: 1,
    type: 'spin_wheel',
    title: 'Daily Spin',
    subtitle: 'Win YelloMola prizes and bonus rewards.',
    description: 'Spin for loyalty prizes and balance boosts.',
    active: true,
    spin_cost: 50,
  },
  {
    id: 2,
    type: 'mystery_box',
    title: 'Mystery Box',
    subtitle: 'Unlock surprise rewards from the active pool.',
    description: 'Open a mystery box for surprise loyalty rewards.',
    active: true,
    spin_cost: 50,
  },
  {
    id: 3,
    type: 'daily_streak',
    title: 'Daily Streak',
    subtitle: `Current streak: ${gamification?.current_streak || 0}`,
    description: 'Keep your streak alive to grow rewards.',
    active: true,
    spin_cost: 0,
  },
];

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

  const fallback = fallbackGames(gamification);
  return {
    games: fallback,
    active_games: fallback,
    primary_game: fallback[0],
    source: 'compatibility',
  };
};

export const getPrimaryGame = (gamesPayload: any) => {
  const activeGames = Array.isArray(gamesPayload?.active_games) ? gamesPayload.active_games : [];
  return (
    activeGames.find((game: MobileGame) => game.type === 'spin_wheel') ??
    activeGames[0] ??
    gamesPayload?.primary_game ??
    fallbackGames()[0]
  );
};

