import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ params, redirect }) => {
  const slug = params.slug ?? '';
  return redirect(`/?style=${encodeURIComponent(slug)}#wheel-mode`, 302);
};
