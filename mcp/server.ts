import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStyleLabServer } from './create-server';

// stdio 模式：邀请码从环境变量注入（客户端在 mcp.json 的 env 里配置）
await createStyleLabServer({ inviteCode: process.env.STYLE_LAB_INVITE }).connect(new StdioServerTransport());
