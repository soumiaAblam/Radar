import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import { parseDriveFolder } from '../../lib/contentManagement'

type Source = { folder_id:string; folder_name:string; last_synced_at:string | null }
type Status = { sources:Source[] }
type SyncResult = { imported:number; skipped:number }

async function invoke(body: object) {
  await ensureDemoSession()
  const { data, error } = await supabase.functions.invoke('drive-library', { body })
  if (error) {
    const response = error.context
    if (response && typeof response.json === 'function') {
      let parsed: { error?:unknown } | undefined
      try {
        parsed = await response.json()
      } catch { /* La respuesta puede no contener JSON o ya haberse consumido. */ }
      if (typeof parsed?.error === 'string') throw new Error(parsed.error)
    }
    if (error.name === 'FunctionsFetchError') throw new Error('No se pudo conectar con el servicio de importación. Comprueba tu conexión y que la función de Drive esté desplegada.')
    throw new Error('No se pudo importar la carpeta. Comprueba que el servicio de Drive esté configurado e inténtalo de nuevo.')
  }
  return data
}

export default function DrivePanel({ accountId, available, onSynced }: { accountId:string; available:boolean; onSynced:() => Promise<void> }) {
  const [status, setStatus] = useState<Status>({ sources:[] })
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [showFolder, setShowFolder] = useState(false), [folder, setFolder] = useState('')
  const refresh = useCallback(async () => { const result = await invoke({ action:'status', accountId }) as Status; setStatus(result) }, [accountId])
  useEffect(() => { if (!available) return; let active = true; void invoke({ action:'status', accountId }).then((result) => { if (active) setStatus(result as Status) }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las carpetas vinculadas.') }); return () => { active = false } }, [accountId, available])
  const sync = async (folderId?:string) => {
    const result = await invoke({ action:'sync', accountId, ...(folderId ? { folderId } : {}) }) as SyncResult
    try { await onSynced() } catch { throw new Error('Los vídeos se importaron, pero no se pudo actualizar la pantalla. Recarga la página.') }
    await refresh()
    setMessage(`Importación terminada: ${result.imported} archivos nuevos, ${result.skipped} ya existentes.`)
  }
  const submitFolder = async (event:FormEvent) => {
    event.preventDefault()
    const link = parseDriveFolder(folder)
    if (!link || link.id === 'root') { setError('Introduce un enlace válido de una carpeta de Google Drive.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      await invoke({ action:'link_folder', accountId, folderId:link.id, resourceKey:link.resourceKey })
      setFolder(''); setShowFolder(false)
      await refresh()
      await sync(link.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo importar la carpeta.'); try { await onSynced() } catch { /* Conservamos el error principal. */ } }
    finally { setBusy(false) }
  }
  const syncAll = async () => {
    setBusy(true); setError(''); setMessage('')
    try { await sync() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo sincronizar.'); try { await onSynced() } catch { /* Conservamos el error principal. */ } }
    finally { setBusy(false) }
  }
  return <section className="cm-drive-panel" aria-labelledby="drive-panel-title"><div className="cm-drive-panel__heading"><div><h2 id="drive-panel-title">Google Drive</h2><p>Importa vídeos e imágenes desde una carpeta compartida.</p></div></div>
    <div className="cm-drive-actions"><button type="button" disabled={!available || busy} aria-expanded={showFolder} aria-controls="drive-folder-form" onClick={() => setShowFolder(!showFolder)}>Vincular carpeta de Drive</button><button type="button" disabled={!available || !status.sources.length || busy} className="cm-drive-actions__sync" onClick={() => void syncAll()}>{busy ? 'Importando…' : 'Sincronizar contenido'}</button></div>
    {showFolder && <form id="drive-folder-form" onSubmit={(event) => void submitFolder(event)} className="cm-drive-folder"><label htmlFor="drive-folder-url">Pega el enlace de la carpeta compartida</label><p id="drive-folder-help">En Google Drive, comparte la carpeta con «Cualquier persona con el enlace». Importaremos los vídeos y las imágenes de la carpeta y sus subcarpetas.</p><div><input id="drive-folder-url" aria-describedby="drive-folder-help" value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="https://drive.google.com/drive/folders/…" autoComplete="off" required /><button type="submit" disabled={busy}>{busy ? 'Importando…' : 'Vincular e importar'}</button></div></form>}
    {status.sources.length > 0 && <ul className="cm-drive-sources">{status.sources.map((source) => <li key={source.folder_id}><span>▱ {source.folder_name}</span><small>{source.last_synced_at ? `Última sincronización: ${new Date(source.last_synced_at).toLocaleString('es-ES')}` : 'Sin sincronizar'}</small></li>)}</ul>}
    {message && <p className="cm-alert cm-alert--success" role="status">{message}</p>}{error && <p className="cm-alert cm-alert--error" role="alert">{error}</p>}
  </section>
}
