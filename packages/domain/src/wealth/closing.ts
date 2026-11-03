import { monthOf, shiftMonth, type IsoDate, type MonthKey } from '../dates/dates';
import type { Snapshot } from './asset';

/**
 * The month the next closing is for. Before any closing it is the previous calendar
 * month, so a new portfolio can register its baseline right away.
 */
export function openMonth(snapshots: Snapshot[], today: IsoDate): MonthKey {
  const last = snapshots.at(-1);
  return last ? shiftMonth(last.month, 1) : shiftMonth(monthOf(today), -1);
}
