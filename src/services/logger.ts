const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

const safeSerialize = (value: unknown) => {
  try {
    if (value instanceof Error) {
      return { name: value.name, message: value.message };
    }
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return String(value);
  }
};

const emit = (level: 'log' | 'warn' | 'error', message: string, meta?: unknown) => {
  if (!isDev) return;
  const payload = meta === undefined ? '' : ` ${JSON.stringify(safeSerialize(meta))}`;
  console[level](`[mobile] ${message}${payload}`);
};

export const logger = {
  log: (message: string, meta?: unknown) => emit('log', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
