// 邀请码申请者存储：data/applicants.json
// 用户在 About 页填邮箱 → 存 pending → admin 发放后标记 served
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STYLES_DIR } from './store';

const APPLICANTS_FILE = path.join(path.dirname(STYLES_DIR), 'data', 'applicants.json');

export interface Applicant {
  email: string;
  createdAt: string; // ISO
  status: 'pending' | 'served';
  inviteHash?: string; // 发放后记录邀请码 hash
  servedAt?: string; // ISO
  autoToken?: string; // 一次性自动发放 token
}

function readAll(): Applicant[] {
  try {
    const arr = JSON.parse(fs.readFileSync(APPLICANTS_FILE, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(list: Applicant[]): void {
  const dir = path.dirname(APPLICANTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(APPLICANTS_FILE, JSON.stringify(list, null, 2) + '\n', 'utf8');
}

/** 添加申请者（同邮箱去重，已 served 不覆盖） */
export function addApplicant(email: string): { created: boolean; applicant: Applicant } {
  const list = readAll();
  const existing = list.find((a) => a.email === email);
  if (existing) return { created: false, applicant: existing };
  const applicant: Applicant = {
    email,
    createdAt: new Date().toISOString(),
    status: 'pending',
    autoToken: crypto.randomBytes(24).toString('base64url'),
  };
  list.push(applicant);
  writeAll(list);
  return { created: true, applicant };
}

/** 按 token 查找申请者（用于邮件一键发放） */
export function findByAutoToken(token: string): Applicant | null {
  const list = readAll();
  return list.find((a) => a.autoToken === token && a.status === 'pending') ?? null;
}

/** 列全部申请者（admin 用） */
export function listApplicants(): Applicant[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 标记已发放 */
export function markServed(email: string, inviteHash: string): Applicant | null {
  const list = readAll();
  const a = list.find((x) => x.email === email);
  if (!a) return null;
  a.status = 'served';
  a.inviteHash = inviteHash;
  a.servedAt = new Date().toISOString();
  writeAll(list);
  return a;
}

/** 待处理数量 */
export function pendingCount(): number {
  return readAll().filter((a) => a.status === 'pending').length;
}
