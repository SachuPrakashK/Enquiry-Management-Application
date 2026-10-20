import { handleApi } from '../backend/server/app.ts';

type ResponseHeaders = Record<string, string>;

async function requestBody(request: Request): Promise<Record<string, unknown> | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'DELETE') return undefined;
  const text = await request.text();
  if (!text) return {};
  if (text.length > 7_100_000) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw Object.assign(new Error('Invalid JSON body.'), { status: 400 });
  }
  return parsed as Record<string, unknown>;
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const nodeRequest = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await requestBody(request),
      };
      let status = 200;
      let responseHeaders: ResponseHeaders = {};
      let responseBody: string | undefined;
      const nodeResponse = {
        writeHead(nextStatus: number, nextHeaders: ResponseHeaders) {
          status = nextStatus;
          responseHeaders = nextHeaders;
          return this;
        },
        end(data?: string) {
          responseBody = data;
          return this;
        },
      };
      await handleApi(nodeRequest as never, nodeResponse as never);
      return new Response(responseBody, { status, headers: responseHeaders });
    } catch (error: unknown) {
      const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 400;
      return Response.json({ message: error instanceof Error ? error.message : 'Invalid request.' }, { status });
    }
  },
};
