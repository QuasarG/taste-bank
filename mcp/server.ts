import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStyleLabServer } from './create-server';

await createStyleLabServer().connect(new StdioServerTransport());
