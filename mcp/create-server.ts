import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listStyles, loadStyle, readStyleFile } from '../src/lib/store';
import { assembleSkill, fullCss } from '../src/lib/assemble';
import { createStylePack } from '../src/lib/create';
import { metaSchema, tokensSchema } from '../src/lib/schema';

const USAGE_PATH = fileURLToPath(new URL('../SKILL.md', import.meta.url));

const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });
const fail = (e: unknown) => ({ content: [{ type: 'text' as const, text: String(e) }], isError: true });

// stdio 与 HTTP 两种传输共用的 server 工厂
export function createStyleLabServer(): McpServer {
  const server = new McpServer({ name: 'style-lab', version: '0.2.0' });

  server.registerTool(
    'list_styles',
    {
      title: '列出全部风格',
      description:
        '返回风格库中所有风格的 slug、名称、版本、情绪关键词与适用场景。挑选风格的第一步，选定后用 get_style_skill 取完整说明。',
    },
    async () => {
      try {
        const list = listStyles().map((slug) => {
          const { meta } = loadStyle(slug);
          return {
            slug,
            name: meta.name,
            version: meta.version,
            mood: meta.mood,
            useCase: meta.useCase,
            summary: meta.summary,
          };
        });
        return text(JSON.stringify(list, null, 2));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'get_style',
    {
      title: '获取风格参数',
      description: '返回指定风格的 meta + tokens 原始 JSON（机器可读的精确设计参数）。',
      inputSchema: { slug: z.string().describe('风格 slug，由 list_styles 获取') },
    },
    async ({ slug }) => {
      try {
        const pack = loadStyle(slug);
        return text(JSON.stringify({ meta: pack.meta, tokens: pack.tokens }, null, 2));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'get_style_skill',
    {
      title: '获取风格 SKILL.md',
      description:
        '返回组装好的 SKILL.md 全文（正文 + Tokens 附录）。粘贴给任意 coding agent，即可让其按此风格实现前端。实现时只允许使用附录中的变量值。',
      inputSchema: { slug: z.string().describe('风格 slug') },
    },
    async ({ slug }) => {
      try {
        const pack = loadStyle(slug);
        return text(assembleSkill(pack.meta, pack.tokens, pack.skillRaw));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'get_style_css',
    {
      title: '获取风格 CSS',
      description: '返回 tokens 生成的 scoped CSS 变量块（含 overrides），作用域为 [data-style="<slug>"]，可直接注入页面。',
      inputSchema: { slug: z.string().describe('风格 slug') },
    },
    async ({ slug }) => {
      try {
        const pack = loadStyle(slug);
        return text(fullCss(slug, pack.tokens, pack.overrides));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'get_style_file',
    {
      title: '读取风格文件',
      description: '读取风格 pack 内的任意文件，如 templates/page.html（模板快照）、overrides.css（风格修饰）。',
      inputSchema: {
        slug: z.string().describe('风格 slug'),
        path: z.string().describe('pack 内相对路径，如 templates/page.html'),
      },
    },
    async ({ slug, path: p }) => {
      try {
        return text(readStyleFile(slug, p));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'get_usage_guide',
    {
      title: '获取使用说明',
      description: '返回风格库的使用说明（本身是一份 SKILL.md）：推荐工作流、pack 结构、每个文件的用途。',
    },
    async () => {
      try {
        return text(fs.readFileSync(USAGE_PATH, 'utf8'));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'submit_style',
    {
      title: '投稿新风格',
      description:
        '提交一套新风格 pack：meta + tokens + skill 全文 + 可选 overrides + 可选模板文件（至少含一个 .html）。校验通过后立即被网站与 MCP 收录。若是从现有项目提炼风格，先通过 get_usage_guide 阅读「提炼并投稿」工作流再动手，并按要求完成脱敏：模板快照要保留原页面的布局与风格（换词不换骨），但可见文案、代码命名、组件组合的领域暗示三层业务痕迹都要换成中性词，以旁观者猜不出原业务为准；高置信度密钥模式会被服务端直接拒收。校验失败会报错并说明原因，修正后重试，不要绕过校验。',
      inputSchema: {
        meta: metaSchema.describe('风格元信息，slug 只允许小写字母数字和连字符'),
        tokens: tokensSchema.describe('设计变量，必须包含 bg/surface/text/muted/line/accent 六个色角色'),
        skill: z.string().describe('SKILL.md 全文（markdown，含 frontmatter，至少 50 字）'),
        overrides: z.string().optional().describe('可选 overrides.css，scoped 在 [data-style="<slug>"] 下'),
        templates: z.record(z.string(), z.string()).optional().describe('模板文件名 → 内容，至少含一个 .html'),
      },
    },
    async (input) => {
      try {
        return text(JSON.stringify(createStylePack(input), null, 2));
      } catch (e) {
        return fail(e);
      }
    },
  );

  return server;
}
