// 平台封装：Windows 兼容、npm 全局定位、子进程执行
import { execFile, execFileSync } from 'node:child_process';
import path from 'node:path';

export const isWindows = process.platform === 'win32';

// Windows 上跑 npm/npx 这类 .cmd shim 必须经 cmd.exe /c，否则 ENOENT
function wrap(cmd, args) {
  return isWindows ? { cmd: 'cmd.exe', args: ['/c', cmd, ...args] } : { cmd, args };
}

/**
 * 静默执行（捕获 stdout），带超时。
 * @returns {Promise<string>} stdout
 */
export function runSilent(cmd, args, { timeout = 120000, env } = {}) {
  const { cmd: realCmd, args: realArgs } = wrap(cmd, args);
  return new Promise((resolve, reject) => {
    execFile(realCmd, realArgs, { stdio: ['ignore', 'pipe', 'pipe'], timeout, env }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.toString());
    });
  });
}

/**
 * 继承 stdio 执行（交互式，子进程直接接管终端）。
 */
export function run(cmd, args, { env } = {}) {
  const { cmd: realCmd, args: realArgs } = wrap(cmd, args);
  try {
    execFileSync(realCmd, realArgs, { stdio: 'inherit', env });
    return true;
  } catch {
    return false;
  }
}

/**
 * 同步静默执行，返回 stdout（用于版本探测这类快查询）。
 */
export function runSyncSilent(cmd, args, { timeout = 15000 } = {}) {
  const { cmd: realCmd, args: realArgs } = wrap(cmd, args);
  try {
    return execFileSync(realCmd, realArgs, { stdio: ['ignore', 'pipe', 'pipe'], timeout }).toString();
  } catch {
    return null;
  }
}

/**
 * 取 npm 全局 prefix（定位全局安装的 bin）。
 * Windows: <prefix>/taste-bank.cmd；其他: <prefix>/bin/taste-bank
 */
export function npmGlobalPrefix() {
  const out = runSyncSilent('npm', ['prefix', '-g']);
  return out ? out.trim() : null;
}

/**
 * 全局安装的 taste-bank bin 路径（null = 未找到）。
 */
export function globalBinPath() {
  const prefix = npmGlobalPrefix();
  if (!prefix) return null;
  const bin = isWindows ? path.join(prefix, 'taste-bank.cmd') : path.join(prefix, 'bin', 'taste-bank');
  return bin;
}

/** node 版本号 [major, minor, patch]，拿不到返回 [0,0,0] */
export function nodeVersion() {
  return process.versions.node.split('.').map(Number);
}

/** skills 工具要求 node >= 22.20.0 */
export function meetsSkillsNodeRequirement() {
  const [major, minor] = nodeVersion();
  return major > 22 || (major === 22 && minor >= 20);
}
