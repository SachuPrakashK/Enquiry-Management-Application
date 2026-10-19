import { createServer } from 'node:http';
import { handleApi } from './app.ts';

const port = Number(process.env['PORT'] || 3000);
createServer(handleApi).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Enquiry API listening on http://127.0.0.1:${port}/api\n`);
});
