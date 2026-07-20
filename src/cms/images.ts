export async function saveImage(
  db: D1Database,
  filename: string,
  data: Uint8Array,
  mime: string,
): Promise<number> {
  const result = await db
    .prepare("INSERT INTO images (filename, mime, data, size) VALUES (?, ?, ?, ?)")
    .bind(filename, mime, data, data.byteLength)
    .run();
  return result.meta.last_row_id as number;
}

export async function getImage(
  db: D1Database,
  id: number,
): Promise<{ data: ArrayBuffer; mime: string; filename: string } | null> {
  const row = await db
    .prepare("SELECT data, mime, filename FROM images WHERE id = ?")
    .bind(id)
    .first<{ data: ArrayBuffer; mime: string; filename: string }>();
  if (!row) return null;
  // ponytail: D1's wire format converts BLOB columns to a byte number[] (the
  // d1 worker maps ArrayBuffer → Array<number>), but the declared type still
  // says ArrayBuffer — so KV.put and c.body both received a number[] and
  // rejected, 500'ing /img/:id on existing rows (404 rows bail before data).
  // new Uint8Array() accepts number[]/ArrayBuffer/Uint8Array alike; .buffer
  // rehydrates a real ArrayBuffer both callers accept. Keep the return type
  // ArrayBuffer (not Uint8Array): Hono's c.body overloads accept ArrayBuffer
  // but reject the generic Uint8Array<ArrayBufferLike>.
  return {
    data: new Uint8Array(row.data).buffer as ArrayBuffer,
    mime: row.mime,
    filename: row.filename,
  };
}

export async function deleteImage(
  db: D1Database,
  id: number,
  kv?: KVNamespace,
): Promise<void> {
  await db.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
  if (kv) {
    await kv.delete(`img:${id}:data`);
    await kv.delete(`img:${id}:meta`);
  }
}
