// 投稿命令共享逻辑：读 pack 文件 + 读身份（私钥/邀请码/作者名）+ 签名发送
import fs from 'node:fs';
import { FILES, readConfig, readText } from './config.mjs';
import { recordSubmission } from './config.mjs';
import { submitStyle, updateStyle, deleteStyle } from './api.mjs';
import { confirm } from './ui.mjs';

/** 读 pack JSON 文件 */
export function readPackFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`无法读取 pack 文件 ${file}：${e.message}`);
  }
}

/**
 * 准备投稿身份：读私钥 + 公钥 + 邀请码 + 作者名。
 * 缺项抛错（带可操作提示）。
 * @param {{needInvite?: boolean}} [opts]
 */
export function resolveIdentity(opts = {}) {
  const privateKey = readText(FILES.privateKey);
  if (!privateKey) {
    throw new Error('未找到私钥。运行 taste-bank keygen 生成密钥对。');
  }
  const publicKey = readText(FILES.publicKey);
  const author = readText(FILES.author) || 'anonymous';
  const inviteCode = readConfig().inviteCode;
  if (opts.needInvite && !inviteCode) {
    throw new Error('未配置邀请码。在 ~/.style-lab/config.json 设置 { "inviteCode": "sl_xxx" }');
  }
  return { privateKey, publicKey, author, authorUrl: readText(FILES.authorUrl), inviteCode };
}

/**
 * 给 pack 注入身份字段（ownerPubkey / author / authorUrl）。
 */
export function injectIdentity(pack, id) {
  return {
    ...pack,
    ownerPubkey: pack.ownerPubkey || id.publicKey,
    meta: {
      ...pack.meta,
      author: pack.meta?.author || id.author,
      ...(id.authorUrl && !pack.meta?.authorUrl ? { authorUrl: id.authorUrl } : {}),
    },
  };
}

/**
 * 执行投稿（POST）。成功后记录到 submissions.json。
 */
export async function doSubmit(packFile) {
  const id = resolveIdentity({ needInvite: true });
  const pack = readPackFile(packFile);
  const fullPack = injectIdentity(pack, id);
  const result = await submitStyle(fullPack, { inviteCode: id.inviteCode, privateKey: id.privateKey });
  recordSubmission({ slug: result.slug, version: pack.meta.version });
  return result;
}

/**
 * 执行更新（PUT）。
 */
export async function doUpdate(slug, packFile) {
  const id = resolveIdentity();
  const pack = readPackFile(packFile);
  if (pack.meta.slug !== slug) {
    throw new Error(`pack 的 meta.slug (${pack.meta.slug}) 与路径 slug (${slug}) 不一致`);
  }
  const fullPack = injectIdentity(pack, id);
  return updateStyle(slug, fullPack, { privateKey: id.privateKey });
}

/**
 * 执行删除（DELETE）。带交互式确认。
 */
export async function doDelete(slug) {
  const confirmed = await confirm(`确认删除风格 ${slug}？此操作不可恢复。`, { defaultValue: false });
  if (!confirmed) {
    console.log('已取消');
    return null;
  }
  const id = resolveIdentity();
  return deleteStyle(slug, { privateKey: id.privateKey });
}
