/* eslint-disable no-console */

/**
 * Minimal structured logger. Swap the internals for pino/winston in production
 * without touching call sites.
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function emit(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (level === 'error') {
    console.error(line, meta ?? '');
  } else if (level === 'warn') {
    console.warn(line, meta ?? '');
  } else {
    console.log(line, meta ?? '');
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', message, meta);
  },
};
