import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURES = fileURLToPath(new URL('fixtures', import.meta.url));

function firstText(res: unknown): string {
  const content = (res as { content: Array<{ type: string; text?: string }> }).content;
  assert.equal(content[0].type, 'text');
  return content[0].text!;
}

test('MCP server 冒烟：工具列表与全部工具调用', { timeout: 60000 }, async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'mcp/server.ts'],
    cwd: ROOT,
    env: { ...process.env, STYLE_LAB_DIR: FIXTURES } as Record<string, string>,
  });
  const client = new Client({ name: 'smoke-test', version: '0.0.1' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const want of ['list_styles', 'get_style', 'get_style_skill', 'get_style_css', 'get_style_file', 'get_usage_guide', 'submit_style', 'update_style', 'delete_style']) {
      assert.ok(names.includes(want), `缺少工具: ${want}`);
    }

    const list = await client.callTool({ name: 'list_styles', arguments: {} });
    assert.ok(firstText(list).includes('blueprint'));

    const style = await client.callTool({ name: 'get_style', arguments: { slug: 'blueprint' } });
    assert.ok(firstText(style).includes('"#0F2D52"'));

    const skill = await client.callTool({ name: 'get_style_skill', arguments: { slug: 'blueprint' } });
    assert.ok(firstText(skill).includes('## Tokens'));
    assert.ok(firstText(skill).includes('--sl-color-bg: #0F2D52;'));

    const css = await client.callTool({ name: 'get_style_css', arguments: { slug: 'blueprint' } });
    assert.ok(firstText(css).includes('.sl-card::before'));

    const file = await client.callTool({ name: 'get_style_file', arguments: { slug: 'blueprint', path: 'templates/page.html' } });
    assert.ok(firstText(file).includes('<!DOCTYPE html>'));

    const evil = await client.callTool({ name: 'get_style_file', arguments: { slug: 'blueprint', path: '../../etc/passwd' } });
    assert.equal((evil as { isError?: boolean }).isError, true);

    const usage = await client.callTool({ name: 'get_usage_guide', arguments: {} });
    assert.ok(firstText(usage).includes('推荐工作流'));
  } finally {
    await client.close();
  }
});
