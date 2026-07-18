import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4562;
const BASE = `http://127.0.0.1:${PORT}`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-mcphttp-'));
fs.mkdirSync(path.join(TMP, 'styles'), { recursive: true });
fs.cpSync(path.join(ROOT, 'tests', 'fixtures', 'styles', 'blueprint'), path.join(TMP, 'styles', 'blueprint'), { recursive: true });

let child: ChildProcess;
let client: Client;

function firstText(res: unknown): string {
  const content = (res as { content: Array<{ type: string; text?: string }> }).content;
  return content[0].text ?? '';
}

const newPack = {
  meta: {
    slug: 'httppack', name: 'HTTP 包', version: '0.1.0', summary: 'MCP HTTP 集成测试用',
    mood: ['测试'], useCase: '集成测试', signature: '无',
    rules: { do: [], dont: [], voice: '' }, author: 'tester', createdAt: '2026-07-17',
  },
  tokens: {
    color: { bg: '#202020', surface: '#282828', text: '#EEEEEE', muted: '#999999', line: '#444444', accent: '#00AA88' },
    font: { display: 'Inter, sans-serif', body: 'Inter, sans-serif' },
    size: { display: '3rem', h1: '2rem', h2: '1.4rem', body: '1rem', small: '0.85rem' },
    space: { sm: '8px', md: '16px', lg: '24px' },
    radius: { sm: '2px', md: '4px' },
    shadow: { card: 'none' },
    motion: { duration: '150ms', easing: 'ease' },
  },
  skill: '# HTTP 包\n\n## 概述\n\n这是一段用于 MCP HTTP 集成测试的、长度达标的风格说明文字，描述气质与用法。',
  templates: { 'page.html': '<!DOCTYPE html><html><body>mcp</body></html>' },
};

before(async () => {
  child = spawn(process.execPath, ['--import', 'tsx', 'mcp/http.ts'], {
    cwd: ROOT,
    env: { ...process.env, STYLE_LAB_DIR: TMP, STYLE_LAB_MCP_PORT: String(PORT) },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  client = new Client({ name: 'http-smoke', version: '0.0.1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)));
});

after(async () => {
  await client.close();
  child.kill('SIGTERM');
  fs.rmSync(TMP, { recursive: true, force: true });
});

test('MCP over HTTP：工具列表含 submit_style', async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  for (const want of ['list_styles', 'get_style_skill', 'submit_style', 'update_style', 'delete_style', 'generate_keypair']) {
    assert.ok(names.includes(want), `缺少工具: ${want}`);
  }
});

test('MCP over HTTP：读取与投稿全链路', async () => {
  const before1 = await client.callTool({ name: 'list_styles', arguments: {} });
  assert.ok(firstText(before1).includes('blueprint'));

  const submit = await client.callTool({ name: 'submit_style', arguments: newPack });
  assert.ok(firstText(submit).includes('httppack'), firstText(submit));

  const after1 = await client.callTool({ name: 'list_styles', arguments: {} });
  assert.ok(firstText(after1).includes('httppack'));

  const skill = await client.callTool({ name: 'get_style_skill', arguments: { slug: 'httppack' } });
  assert.ok(firstText(skill).includes('## Tokens'));

  const dup = await client.callTool({ name: 'submit_style', arguments: newPack });
  assert.equal((dup as { isError?: boolean }).isError, true);
});

test('MCP over HTTP：generate_keypair 产出可用钥匙', async () => {
  const { isValidPubkey, canonicalMessage, signMessage, verifyMessage } = await import('../src/lib/auth');
  const res = await client.callTool({ name: 'generate_keypair', arguments: {} });
  const { publicKey, privateKey } = JSON.parse(firstText(res));
  assert.ok(isValidPubkey(publicKey));
  const sig = signMessage(canonicalMessage('delete', 'x', '1', ''), privateKey);
  assert.ok(verifyMessage(canonicalMessage('delete', 'x', '1', ''), sig, publicKey));
});
