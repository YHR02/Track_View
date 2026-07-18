import { Tracker, CreateTrackerInput, UpdateTrackerInput } from '../../types/tracker';

export interface ITrackerRepository {
  list(): Promise<Tracker[]>;
  getById(trackerId: string): Promise<Tracker | null>;
  create(data: CreateTrackerInput): Promise<Tracker>;
  update(trackerId: string, data: UpdateTrackerInput): Promise<Tracker>;
  archive(trackerId: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
