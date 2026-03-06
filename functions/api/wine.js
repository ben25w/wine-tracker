export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const r2Bucket = env.WINES_R2;
  const r2PublicUrl = env.R2_PUBLIC_URL;

  // Only allow POST and GET
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'list') {
      return handleListWines(db);
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'save') {
      return handleSaveWine(db, request);
    } else if (action === 'delete') {
      return handleDeleteWine(db, request);
    } else if (action === 'createType') {
      return handleCreateType(db, request);
    } else if (action === 'uploadPhoto') {
      return handleUploadPhoto(r2Bucket, r2PublicUrl, request);
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler: List all wines
async function handleListWines(db) {
  try {
    const winesResult = await db.prepare(`
      SELECT * FROM wines ORDER BY created_at DESC
    `).all();

    const typesResult = await db.prepare(`
      SELECT * FROM wine_types ORDER BY name
    `).all();

    return new Response(JSON.stringify({
      success: true,
      wines: winesResult.results || [],
      types: typesResult.results || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Save wine (create or update)
async function handleSaveWine(db, request) {
  try {
    const data = await request.json();
    const { id, name, type_id, country, region, notes, photo_url } = data;

    console.log('Saving wine:', { id, name, type_id, country, region, notes, photo_url });

    if (!name || !type_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wine name and type are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure type_id is a number
    const typeIdNum = parseInt(type_id, 10);
    if (isNaN(typeIdNum)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid type_id'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const countryVal = country && typeof country === 'string' && country.trim() ? country.trim() : 'Unknown';
    const regionVal = region && typeof region === 'string' && region.trim() ? region.trim() : null;
    const notesVal = notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null;
    const urlVal = photo_url && typeof photo_url === 'string' ? photo_url : null;

    if (id) {
      // Update existing wine
      const idNum = parseInt(id, 10);
      console.log('Updating wine with:', { name, typeIdNum, countryVal, regionVal, notesVal, urlVal, idNum });
      await db.prepare(`
        UPDATE wines 
        SET name = ?, type_id = ?, country = ?, region = ?, notes = ?, photo_url = ?
        WHERE id = ?
      `).bind(name, typeIdNum, countryVal, regionVal, notesVal, urlVal, idNum).run();
    } else {
      // Insert new wine
      console.log('Inserting wine with:', { name, typeIdNum, countryVal, regionVal, notesVal, urlVal });
      await db.prepare(`
        INSERT INTO wines (name, type_id, country, region, notes, photo_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(name, typeIdNum, countryVal, regionVal, notesVal, urlVal).run();
    }

    return new Response(JSON.stringify({
      success: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Save wine error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Delete wine
async function handleDeleteWine(db, request) {
  try {
    const data = await request.json();
    const { id } = data;

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing wine ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.prepare(`DELETE FROM wines WHERE id = ?`).bind(id).run();

    return new Response(JSON.stringify({
      success: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Create wine type
async function handleCreateType(db, request) {
  try {
    const data = await request.json();
    const name = data.name ? data.name.trim() : null;

    if (!name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Type name is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if type already exists
    const existingResult = await db.prepare(`
      SELECT id FROM wine_types WHERE name = ?
    `).bind(name).first();

    if (existingResult) {
      return new Response(JSON.stringify({
        success: true,
        type: {
          id: existingResult.id,
          name: existingResult.name
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new type
    const result = await db.prepare(`
      INSERT INTO wine_types (name)
      VALUES (?)
    `).bind(name).run();

    const typeId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      success: true,
      type: {
        id: typeId,
        name: name
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating type:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Upload photo to R2
async function handleUploadPhoto(r2Bucket, r2PublicUrl, request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only JPEG and PNG files are allowed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate filename
    const timestamp = Date.now();
    const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
    const filename = `wines/${timestamp}.${ext}`;

    // Upload to R2
    const buffer = await file.arrayBuffer();
    await r2Bucket.put(filename, buffer, {
      httpMetadata: {
        contentType: file.type
      }
    });

    const url = `${r2PublicUrl}/${filename}`;

    return new Response(JSON.stringify({
      success: true,
      url: url
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
