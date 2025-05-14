import { json, type RequestHandler } from '@sveltejs/kit';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const authCookie = cookies.get('auth');
  let filepath: string | undefined;

  try {
    const body = await request.json();
    filepath = body.filepath;
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!filepath || typeof filepath !== 'string') {
    return json({ success: false, error: 'Filepath is required in body' }, { status: 400 });
  }

  // Per sicurezza, non permettere l'eliminazione se è il cookie di test
  if (authCookie === '4440') {
    return json({ success: false, error: 'Deletion not allowed for test cookie' }, { status: 403 });
  }

  try {
    const staticDir = path.resolve('static');
    // Il filepath dovrebbe essere relativo alla cartella static, es: "summaries/nomefile.mp3"
    const fileToDelete = path.join(staticDir, filepath);

    if (!fileToDelete.startsWith(staticDir)) {
      return json(
        { success: false, error: 'Invalid file path (path traversal attempt?)' },
        { status: 400 }
      );
    }

    await fs.unlink(fileToDelete);
    console.log(`File deleted: ${fileToDelete}`);
    return json({ success: true, message: `File ${filepath} deleted successfully` });
  } catch (error) {
    console.error(`Error deleting file ${filepath}:`, error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return json({ success: false, error: `File not found: ${filepath}` }, { status: 404 });
    }
    return json({ success: false, error: `Failed to delete file: ${filepath}` }, { status: 500 });
  }
};
