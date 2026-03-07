export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const db = env.DB;
  const action = url.searchParams.get('action');

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    // GET: list all wines and types
    if (request.method === 'GET' && action === 'list') {
      const winesResult = await db.prepare('SELECT * FROM wines ORDER BY name ASC').all();
      const typesResult = await db.prepare('SELECT * FROM wine_types ORDER BY name').all();
      return new Response(JSON.stringify({
        success: true,
        wines: winesResult.results || [],
        types: typesResult.results || []
      }), { headers: corsHeaders });
    }

    // POST: save (insert or update) a wine
    if (request.method === 'POST' && action === 'save') {
      const data = await request.json();
      const { id, name, type_id, country, region, notes, photo_url } = data;

      if (!name || !type_id) {
        return new Response(JSON.stringify({ success: false, error: 'Name and type required' }), {
          status: 400, headers: corsHeaders
        });
      }

      const countryVal = country && country.trim() ? country.trim() : 'Unknown';
      const regionVal  = region  && region.trim()  ? region.trim()  : null;
      const notesVal   = notes   && notes.trim()   ? notes.trim()   : null;
      const typeIdNum  = parseInt(type_id, 10);

      if (id) {
        await db.prepare(
          'UPDATE wines SET name = ?, type_id = ?, country = ?, region = ?, notes = ?, photo_url = ? WHERE id = ?'
        ).bind(name, typeIdNum, countryVal, regionVal, notesVal, photo_url || null, parseInt(id, 10)).run();
      } else {
        await db.prepare(
          'INSERT INTO wines (name, type_id, country, region, notes, photo_url, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
        ).bind(name, typeIdNum, countryVal, regionVal, notesVal, photo_url || null).run();
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // POST: delete a wine
    if (request.method === 'POST' && action === 'delete') {
      const data = await request.json();
      const { id } = data;

      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'ID required' }), {
          status: 400, headers: corsHeaders
        });
      }

      const wine = await db.prepare('SELECT photo_url FROM wines WHERE id = ?').bind(parseInt(id, 10)).first();
      if (wine && wine.photo_url && env.WINES_R2) {
        const photoKey = wine.photo_url.split('/').pop();
        try { await env.WINES_R2.delete(photoKey); } catch (e) { /* ignore */ }
      }

      await db.prepare('DELETE FROM wines WHERE id = ?').bind(parseInt(id, 10)).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // POST: create a new wine type
    if (request.method === 'POST' && action === 'createType') {
      const data = await request.json();
      const name = data.name ? data.name.trim() : null;

      if (!name) {
        return new Response(JSON.stringify({ success: false, error: 'Type name required' }), {
          status: 400, headers: corsHeaders
        });
      }

      const existing = await db.prepare('SELECT id, name FROM wine_types WHERE name = ?').bind(name).first();
      if (existing) {
        return new Response(JSON.stringify({ success: true, type: existing }), { headers: corsHeaders });
      }

      const result = await db.prepare('INSERT INTO wine_types (name) VALUES (?)').bind(name).run();
      return new Response(JSON.stringify({
        success: true,
        type: { id: result.meta.last_row_id, name }
      }), { headers: corsHeaders });
    }

    // POST: upload a photo to R2
    if (request.method === 'POST' && action === 'uploadPhoto') {
      if (!env.WINES_R2) {
        return new Response(JSON.stringify({ success: false, error: 'R2 not configured' }), {
          status: 500, headers: corsHeaders
        });
      }

      const formData = await request.formData();
      const file = formData.get('photo');

      if (!file) {
        return new Response(JSON.stringify({ success: false, error: 'No photo provided' }), {
          status: 400, headers: corsHeaders
        });
      }

      const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
      const key = 'wines/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
      const arrayBuffer = await file.arrayBuffer();

      await env.WINES_R2.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'image/jpeg' }
      });

      const publicUrl = env.R2_PUBLIC_URL + '/' + key;
      return new Response(JSON.stringify({ success: true, url: publicUrl }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400, headers: corsHeaders
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
