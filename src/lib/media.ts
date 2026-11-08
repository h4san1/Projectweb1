import { db, MEDIA_BUCKET } from './supabase'
import { newId } from './id'

/** Unggah gambar ke folder milik user: media/<user_id>/<uuid>.<ext> */
export async function uploadImage(userId: string, blob: Blob, ext = 'png'): Promise<string> {
  const path = `${userId}/${newId()}.${ext}`
  const { error } = await db()
    .storage.from(MEDIA_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'image/png',
      cacheControl: '3600',
      upsert: false,
    })
  if (error) throw new Error(`Gagal mengunggah gambar: ${error.message}`)
  return path
}

export async function removeImage(path?: string | null): Promise<void> {
  if (!path) return
  // Abaikan kegagalan: catatan sudah terhapus, sisa file tidak menghalangi.
  await db().storage.from(MEDIA_BUCKET).remove([path])
}

const cache = new Map<string, { url: string; expires: number }>()

/** Tanda tangan URL untuk bucket privat, dengan cache 1 jam. */
export async function getImageUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now()
  const result: Record<string, string> = {}
  const missing: string[] = []

  for (const path of paths) {
    const hit = cache.get(path)
    if (hit && hit.expires > now + 60_000) result[path] = hit.url
    else if (!missing.includes(path)) missing.push(path)
  }

  if (missing.length === 0) return result

  const { data, error } = await db().storage.from(MEDIA_BUCKET).createSignedUrls(missing, 3600)
  if (error || !data) return result

  data.forEach((item, index) => {
    const path = item.path || missing[index]
    if (!path || !item.signedUrl) return
    result[path] = item.signedUrl
    cache.set(path, { url: item.signedUrl, expires: now + 3_600_000 })
  })

  return result
}
