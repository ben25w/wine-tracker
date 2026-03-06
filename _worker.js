export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle /api/* routes
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

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
      if (request.method === 'GET' && action === 'list') {
        const winesResult = await db.prepare('SELECT * FROM wines ORDER BY created_at DESC').all();
        const typesResult = await db.prepare('SELECT * FROM wine_types ORDER BY name').all();
        
        return new Response(JSON.stringify({
          success: true,
          wines: winesResult.results || [],
          types: typesResult.results || []
        }), { headers: corsHeaders });
      }

      if (request.method === 'POST' && action === 'save') {
        const data = await request.json();
        const { id, name, type_id, country, region, notes, photo_url } = data;

        if (!name || !type_id) {
          return new Response(JSON.stringify({ success: false, error: 'Name and type required' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const countryVal = country && typeof country === 'string' && country.trim() ? country.trim() : 'Unknown';
        const regionVal = region && typeof region === 'string' && region.trim() ? region.trim() : null;
        const notesVal = notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null;
        const typeIdNum = parseInt(type_id, 10);

        if (id) {
          await db.prepare('UPDATE wines SET name = ?, type_id = ?, country = ?, region = ?, notes = ?, photo_url = ? WHERE id = ?')
            .bind(name, typeIdNum, countryVal, regionVal, notesVal, photo_url || null, parseInt(id, 10)).run();
        } else {
          await db.prepare('INSERT INTO wines (name, type_id, country, region, notes, photo_url, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))')
            .bind(name, typeIdNum, countryVal, regionVal, notesVal, photo_url || null).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (request.method === 'POST' && action === 'delete') {
        const data = await request.json();
        const { id } = data;

        if (!id) {
          return new Response(JSON.stringify({ success: false, error: 'ID required' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        await db.prepare('DELETE FROM wines WHERE id = ?').bind(parseInt(id, 10)).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (request.method === 'POST' && action === 'createType') {
        const data = await request.json();
        const name = data.name ? data.name.trim() : null;

        if (!name) {
          return new Response(JSON.stringify({ success: false, error: 'Type name required' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const existingResult = await db.prepare('SELECT id FROM wine_types WHERE name = ?').bind(name).first();

        if (existingResult) {
          return new Response(JSON.stringify({
            success: true,
            type: { id: existingResult.id, name: existingResult.name }
          }), { headers: corsHeaders });
        }

        const result = await db.prepare('INSERT INTO wine_types (name) VALUES (?)').bind(name).run();
        const typeId = result.meta.last_row_id;

        return new Response(JSON.stringify({
          success: true,
          type: { id: typeId, name: name }
        }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
        status: 400,
        headers: corsHeaders
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
