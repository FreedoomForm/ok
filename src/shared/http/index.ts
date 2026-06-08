// Shared HTTP utilities — Backend Design System v1.0

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, { status: response.status, headers });
}

export function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function notFound(resource: string): Response {
  return new Response(
    JSON.stringify({ error: `${resource}_NOT_FOUND`, message: `${resource} not found` }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  );
}
