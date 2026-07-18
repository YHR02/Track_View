import { Log } from '../types/entry';
import { entryRepository } from '../repositories';

type SyncStatus = 'synced' | 'syncing' | 'error';

class SyncService {
  private queue: Array<{
    trackerId: string;
    date: string;
    value: string;
    note?: string | null;
    resolve: (log: Log) => void;
    reject: (error: any) => void;
  }> = [];

  private timer: any = null;
  private status: SyncStatus = 'synced';
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  getStatus(): SyncStatus {
    return this.status;
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach((l) => l(status));
  }

  async enqueue(
    trackerId: string,
    date: string,
    value: string,
    note?: string | null
  ): Promise<Log> {
    return new Promise<Log>((resolve, reject) => {
      // De-duplicate existing queue item for the same tracker and date
      const existingIdx = this.queue.findIndex(
        (item) => item.trackerId === trackerId && item.date === date
      );
      if (existingIdx !== -1) {
        const older = this.queue[existingIdx];
        this.queue[existingIdx] = {
          trackerId,
          date,
          value,
          note,
          resolve: (log) => {
            older.resolve(log);
            resolve(log);
          },
          reject: (err) => {
            older.reject(err);
            reject(err);
          },
        };
      } else {
        this.queue.push({ trackerId, date, value, note, resolve, reject });
      }

      this.setStatus('syncing');
      this.scheduleFlush();
    });
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 500); // 500ms debounce
  }

  private async flush() {
    if (this.queue.length === 0) {
      this.setStatus('synced');
      return;
    }

    const batch = [...this.queue];
    this.queue = [];

    try {
      // Sync each item sequentially to prevent race conditions on row reads/writes
      for (const item of batch) {
        try {
          const result = await entryRepository.upsert(
            item.trackerId,
            item.date,
            item.value,
            item.note
          );
          item.resolve(result);
        } catch (err) {
          item.reject(err);
          throw err;
        }
      }
      this.setStatus('synced');
    } catch (error) {
      console.error('Sync flush failed, will retry in 5s:', error);
      this.setStatus('error');
      // Re-queue failed items at the beginning
      this.queue = [...batch, ...this.queue];
      setTimeout(() => this.flush(), 5000);
    }
  }
}

export const syncService = new SyncService();
