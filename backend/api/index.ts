import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApi } from '../server/app.ts';

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return handleApi(request, response);
}
