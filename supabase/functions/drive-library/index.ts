import { accessToken, admin, configured, decrypt, encrypt, googleGet, headers, json, ownsAccount, userFor } from '../_shared/drive.ts'

type DriveFile = { id:string; name:string; mimeType:string; createdTime?:string; resourceKey?:string }
const idPattern = /^[A-Za-z0-9_-]{1,200}$/
const driveFolder = 'application/vnd.google-apps.folder'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers:headers(request) })
  if (request.method !== 'POST') return json(request, { error:'Método no permitido.' }, 405)
  if (!configured()) return json(request, { error:'Falta configurar Google Drive en Supabase.' }, 503)
  const user = await userFor(request)
  if (!user) return json(request, { error:'Inicia sesión para usar Drive.' }, 401)
  let body: { accountId?:string; action?:string; folderId?:string; resourceKey?:string | null }
  try { body = await request.json() } catch { return json(request, { error:'Solicitud incorrecta.' }, 400) }
  const accountId = String(body.accountId || '')
  if (!await ownsAccount(user.id, accountId)) return json(request, { error:'Cuenta no disponible.' }, 403)
  try {
    if (body.action === 'status') {
      const [{ data: connection, error: connectionError }, { data: sources, error: sourceError }] = await Promise.all([
        admin().from('drive_connections').select('account_id,updated_at').eq('account_id', accountId).maybeSingle(),
        admin().from('drive_sources').select('folder_id,folder_name,last_synced_at').eq('account_id', accountId).order('created_at'),
      ])
      if (connectionError || sourceError) throw new Error('DB_ERROR')
      return json(request, { connected:Boolean(connection), sources:sources || [] })
    }
    const token = await accessToken(accountId)
    if (body.action === 'link_folder') {
      const folderId = body.folderId === 'root' ? 'root' : String(body.folderId || '')
      if (!idPattern.test(folderId)) return json(request, { error:'Enlace de carpeta no válido.' }, 400)
      const resourceKey = body.resourceKey || ''
      if (resourceKey && !idPattern.test(resourceKey)) return json(request, { error:'La clave del enlace no es válida. Copia el enlace completo desde Google Drive.' }, 400)
      const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}`)
      url.search = new URLSearchParams({ fields:'id,name,mimeType,trashed', supportsAllDrives:'true' }).toString()
      const folder = await googleGet(url, token, resourceKey ? [{ id:folderId, key:resourceKey }] : [])
      if (folder.mimeType !== driveFolder || folder.trashed || !idPattern.test(folder.id)) return json(request, { error:'Selecciona una carpeta de Drive accesible.' }, 400)
      const { error } = await admin().from('drive_sources').upsert({ account_id:accountId, folder_id:folder.id, folder_name:String(folder.name).slice(0, 200) }, { onConflict:'account_id,folder_id', ignoreDuplicates:true })
      if (error) throw new Error('DB_ERROR')
      if (resourceKey) {
        const { error: keyError } = await admin().from('drive_source_access').upsert({ account_id:accountId, folder_id:folder.id, resource_key_ciphertext:await encrypt(resourceKey, accountId) }, { onConflict:'account_id,folder_id' })
        if (keyError) throw new Error('DB_ERROR')
      }
      return json(request, { ok:true })
    }
    if (body.action !== 'sync') return json(request, { error:'Acción no reconocida.' }, 400)
    const { data: sources, error: sourceError } = await admin().from('drive_sources').select('folder_id,folder_name').eq('account_id', accountId)
    if (sourceError) throw new Error('DB_ERROR')
    if (!sources?.length) return json(request, { error:'Vincula primero una carpeta de Drive.' }, 400)
    let imported = 0, skipped = 0, visited = 0
    const seenFolders = new Set<string>(), seenFiles = new Set<string>()
    for (const source of sources) {
      const { data: sourceAccess, error: keyError } = await admin().from('drive_source_access').select('resource_key_ciphertext').eq('account_id', accountId).eq('folder_id', source.folder_id).maybeSingle()
      if (keyError) throw new Error('DB_ERROR')
      const rootKey = sourceAccess ? await decrypt(sourceAccess.resource_key_ciphertext, accountId) : ''
      const rootKeys = rootKey ? [{ id:source.folder_id, key:rootKey }] : []
      const queue: { id:string; path:string; resourceKeys:{ id:string; key:string }[] }[] = [{ id:source.folder_id, path:source.folder_name, resourceKeys:rootKeys }]
      let order = 0
      while (queue.length) {
        const folder = queue.shift()!
        if (seenFolders.has(folder.id)) continue
        seenFolders.add(folder.id)
        if (++visited > 1000) throw new Error('TOO_MANY_FOLDERS')
        let pageToken = ''
        do {
          const url = new URL('https://www.googleapis.com/drive/v3/files')
          url.search = new URLSearchParams({ q:`'${folder.id}' in parents and trashed = false`, fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,createdTime,resourceKey)', pageSize:'100', orderBy:'folder,name_natural', supportsAllDrives:'true', includeItemsFromAllDrives:'true', ...(pageToken ? { pageToken } : {}) }).toString()
          const result = await googleGet(url, token, folder.resourceKeys)
          if (result.incompleteSearch) throw new Error('INCOMPLETE_SEARCH')
          for (const file of (result.files || []) as DriveFile[]) {
            if (!idPattern.test(file.id) || typeof file.name !== 'string') continue
            if (file.mimeType === driveFolder) { const keys = file.resourceKey && idPattern.test(file.resourceKey) ? [...rootKeys, { id:file.id, key:file.resourceKey }] : rootKeys; queue.push({ id:file.id, path:`${folder.path} / ${file.name}`, resourceKeys:keys }); continue }
            if (!file.mimeType?.startsWith('video/') || seenFiles.has(file.id)) continue
            seenFiles.add(file.id)
            if (seenFiles.size > 3000) throw new Error('TOO_MANY_FILES')
            const driveMetadata = { drive_folder_id:folder.id, drive_folder_path:folder.path.toWellFormed().slice(0,2000), drive_source_name:file.name.toWellFormed().slice(0,500), drive_file_created_at:file.createdTime || null, drive_sort_order:order++ }
            const viewUrl = new URL(`https://drive.google.com/file/d/${file.id}/view`)
            if (file.resourceKey && idPattern.test(file.resourceKey)) viewUrl.searchParams.set('resourcekey', file.resourceKey)
            const { error } = await admin().from('editorial_content').insert({ account_id:accountId, title:file.name.toWellFormed().slice(0,200) || 'Vídeo de Drive', drive_url:viewUrl.toString(), drive_file_id:file.id, ...driveMetadata, status:'pending' })
            if (error?.code === '23505') {
              // Se completan solo metadatos de Drive ausentes; nunca se tocan estados ni campos editoriales.
              const { error: metadataError } = await admin().from('editorial_content').update(driveMetadata).eq('account_id', accountId).eq('drive_file_id', file.id).is('drive_folder_id', null)
              if (metadataError) throw new Error('DB_ERROR')
              skipped++
            }
            else if (error) throw new Error('DB_ERROR')
            else imported++
          }
          pageToken = result.nextPageToken || ''
        } while (pageToken)
      }
      const { error } = await admin().from('drive_sources').update({ last_synced_at:new Date().toISOString() }).eq('account_id', accountId).eq('folder_id', source.folder_id)
      if (error) throw new Error('DB_ERROR')
    }
    return json(request, { imported, skipped })
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : ''
    const message = reason === 'NOT_CONNECTED' ? 'Vincula primero tu cuenta de Drive.' : reason === 'TOKEN_REFRESH_FAILED' ? 'La autorización de Drive ha caducado. Vuelve a vincular tu cuenta.' : reason === 'INCOMPLETE_SEARCH' ? 'Google no ha completado la búsqueda. Prueba con una carpeta más concreta.' : reason === 'TOO_MANY_FILES' || reason === 'TOO_MANY_FOLDERS' ? 'La carpeta es demasiado grande para una sola sincronización. Los vídeos importados se conservan; prueba con una carpeta más concreta.' : reason.startsWith('DRIVE_HTTP_4') ? 'Google no permite acceder a esa carpeta. Comprueba los permisos de la cuenta vinculada.' : 'No se pudo completar la sincronización. Los vídeos ya importados se conservan.'
    return json(request, { error:message }, reason === 'NOT_CONNECTED' ? 409 : 502)
  }
})
