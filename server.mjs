import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const sendJson = (res, status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };

async function refineQuery(query) {
  if (!process.env.OPENAI_API_KEY) return { query, refined: false };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input: `Turn this request into a concise English image-search query (under 12 words). Return only the query. Request: ${query}` })
  });
  if (!response.ok) throw new Error('OpenAI query refinement failed. Check OPENAI_API_KEY and try again.');
  const data = await response.json();
  const text = data.output_text?.trim();
  return { query: text || query, refined: Boolean(text) };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'POST' && url.pathname === '/api/images/describe') {
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 12000000) throw new Error('Image request is too large.'); }
      const { image } = JSON.parse(raw || '{}');
      if (!process.env.OPENAI_API_KEY) return sendJson(res, 503, { error:'Add OPENAI_API_KEY to .env to use AI descriptions.' });
      if (typeof image !== 'string' || !(image.startsWith('data:image/') || image.startsWith('https://'))) return sendJson(res, 400, { error:'This image format cannot be sent for description.' });
      const response = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ model:process.env.OPENAI_MODEL || 'gpt-4.1-mini', input:[{ role:'user', content:[{type:'input_text',text:'Describe this image in one short factual sentence. Then on a new line provide 3 to 5 concise searchable tags prefixed with Tags:.'},{type:'input_image',image_url:image}] }] }) });
      if (!response.ok) return sendJson(res, 502, { error:'OpenAI could not describe this image. Check the API key and model.' });
      const result = await response.json(); return sendJson(res, 200, { description:result.output_text?.trim() || 'No description returned.' });
    }
    if (req.method === 'POST' && url.pathname === '/api/images/search') {
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 10000) throw new Error('Search request is too large.'); }
      const input = JSON.parse(raw || '{}'), original = String(input.query || '').trim();
      if (!original || original.length > 300) return sendJson(res, 400, { error:'Enter a search under 300 characters.' });
      if (!process.env.UNSPLASH_ACCESS_KEY) return sendJson(res, 503, { error:'Set UNSPLASH_ACCESS_KEY in .env to enable image search.' });
      let refined; try { refined = await refineQuery(original); } catch (error) { return sendJson(res, 502, { error:error.message }); }
      const searchUrl = new URL('https://api.unsplash.com/search/photos'); searchUrl.searchParams.set('query', refined.query); searchUrl.searchParams.set('per_page','12'); searchUrl.searchParams.set('content_filter','high');
      const result = await fetch(searchUrl, { headers:{ Authorization:`Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } });
      if (!result.ok) return sendJson(res, 502, { error:'Unsplash search failed. Check UNSPLASH_ACCESS_KEY.' });
      const data = await result.json();
      return sendJson(res, 200, { query:refined.query, refined:refined.refined, photos:(data.results || []).map(p=>({id:p.id,url:p.urls?.regular,description:p.alt_description || p.description || 'Unsplash photo',author:p.user?.name || 'Unsplash contributor',page:p.links?.html || 'https://unsplash.com'})).filter(p=>p.url) });
    }
    if (req.method === 'GET' && url.pathname === '/api/images/download') {
      const imageUrl = new URL(url.searchParams.get('url') || '');
      if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'images.unsplash.com') return sendJson(res, 400, { error:'Only Unsplash image URLs can be downloaded.' });
      const image = await fetch(imageUrl); if (!image.ok) return sendJson(res, 502, { error:'The image provider could not return this photo.' });
      const type = image.headers.get('content-type') || 'image/jpeg'; if (!type.startsWith('image/')) return sendJson(res, 502, { error:'The provider returned a non-image file.' });
      res.writeHead(200, {'Content-Type':type, 'Cache-Control':'no-store'}); return res.end(Buffer.from(await image.arrayBuffer()));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error:'Method not allowed.' });
    const relative = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    const file = path.resolve(root, relative); if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return sendJson(res, 403, { error:'Forbidden.' });
    const info = await stat(file); if (!info.isFile()) throw new Error('Not found');
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});
    if (req.method === 'HEAD') return res.end();
    res.end(await readFile(file));
  } catch (error) { if (!res.headersSent) sendJson(res, error.code === 'ENOENT' ? 404 : 500, { error:error.code === 'ENOENT' ? 'Not found.' : error.message || 'Server error.' }); else res.end(); }
});
server.listen(port, () => console.log(`Prism Gallery AI running at http://localhost:${port}`));
