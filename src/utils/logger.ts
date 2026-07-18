const IS_DEV = import.meta.env.DEV;

export const logger = {
  debug(...args: any[]) {
    if (IS_DEV) {
      console.debug('[TrackWise:DEBUG]', ...args);
    }
  },
  info(...args: any[]) {
    console.info('[TrackWise:INFO]', ...args);
  },
  warn(...args: any[]) {
    console.warn('[TrackWise:WARN]', ...args);
  },
  error(...args: any[]) {
    console.error('[TrackWise:ERROR]', ...args);
  },
};
