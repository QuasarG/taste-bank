import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';

// —— 每日统计数据落盘，JSON 按日期分文件 ——

const STATS_DIR = path.join(path.dirname(STYLES_DIR), 'data', 'stats');

export interface DailyStats {
  visits: number;
  usage: number;
  newUsers: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function statsFile(date: string): string {
  return path.join(STATS_DIR, `${date}.json`);
}

function readStats(date: string): DailyStats {
  try {
    return JSON.parse(fs.readFileSync(statsFile(date), 'utf8')) as DailyStats;
  } catch {
    return { visits: 0, usage: 0, newUsers: 0 };
  }
}

function writeStats(date: string, stats: DailyStats): void {
  fs.mkdirSync(STATS_DIR, { recursive: true });
  fs.writeFileSync(statsFile(date), JSON.stringify(stats));
}

// —— 公开 API ——

export function getTodayStats(): DailyStats {
  return readStats(todayKey());
}

export function trackVisit(): void {
  const today = todayKey();
  const stats = readStats(today);
  stats.visits += 1;
  writeStats(today, stats);
}

export function trackUsage(): void {
  const today = todayKey();
  const stats = readStats(today);
  stats.usage += 1;
  writeStats(today, stats);
}

export function trackNewUser(): void {
  const today = todayKey();
  const stats = readStats(today);
  stats.newUsers += 1;
  writeStats(today, stats);
}
