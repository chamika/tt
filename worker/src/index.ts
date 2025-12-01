import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', () => new Response('ok'));

export default app;
