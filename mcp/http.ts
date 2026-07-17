import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createStyleLabServer } from './create-server';

const PORT = Number(process.env.STYLE_LAB_MCP_PORT ?? 3100);

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }
  if (req.url === '/mcp' && req.method === 'POST') {
    // 无状态模式：每个请求一对新的 server/transport 实例
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain' }).end('bad json');
      return;
    }
    const mcpServer = createStyleLabServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      mcpServer.close();
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
});

server.listen(PORT, () => {
  console.log(`style-lab mcp http listening on http://127.0.0.1:${PORT}/mcp`);
});
