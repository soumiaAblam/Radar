import { useEffect, useState } from 'react'
import AudienceAI from '../../components/AudienceAI/AudienceAI'
import AudienceReal, { type AudiencePost } from '../../components/AudienceReal/AudienceReal'
import AudienceStrategy from '../../components/AudienceStrategy/AudienceStrategy'
import Header from '../../components/Header/Header'
import Sidebar from '../../components/Sidebar/Sidebar'
import { useAccount } from '../../context/AccountContext'
import { loadAudienceMetrics, saveAudienceMetrics } from '../../lib/audienceStorage'
import { loadAudienceProfile, saveAudienceProfile, type AudienceProfile } from '../../lib/audienceStrategy'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import type { AudienceMetrics } from '../../types/audience'
import './Audience.css'

function AudiencePage() {
  const { selectedAccount } = useAccount()
  return <div className="dashboard-layout"><Sidebar /><div className="dashboard-shell"><Header title="Audiencia" showPeriod={false} /><AudienceContent key={selectedAccount.id} /></div></div>
}

function AudienceContent() {
  const { selectedAccount } = useAccount()
  const [records, setRecords] = useState<AudienceMetrics[]>(() => loadAudienceMetrics(selectedAccount.id).sort((a, b) => a.date.localeCompare(b.date)))
  const [profile, setProfile] = useState<AudienceProfile>(() => loadAudienceProfile(selectedAccount.id))
  const [posts, setPosts] = useState<AudiencePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let version = 0
    const load = async () => {
      const current = ++version
      if (selectedAccount.source !== 'instagram') { setPosts([]); setLoading(false); return }
      setLoading(true); setError('')
      try {
        await ensureDemoSession()
        const { data, error: queryError } = await supabase.from('media_metrics').select('id,media_type,views,likes,comments,saves,shares').eq('account_id', selectedAccount.id).order('published_at', { ascending: false }).limit(1000)
        if (queryError) throw queryError
        if (active && current === version) setPosts((data ?? []) as AudiencePost[])
      } catch { if (active && current === version) { setPosts([]); setError('No se han podido cargar las publicaciones. Comprueba la conexión y vuelve a intentarlo.') } }
      finally { if (active && current === version) setLoading(false) }
    }
    void load()
    const onSync = (event: Event) => { if ((event as CustomEvent<{ accountId: string }>).detail?.accountId === selectedAccount.id) void load() }
    window.addEventListener('radar:sync-complete', onSync)
    return () => { active = false; window.removeEventListener('radar:sync-complete', onSync) }
  }, [selectedAccount.id, selectedAccount.source])
  const saveRecord = (metrics: AudienceMetrics) => {
    const next = [...records.filter((record) => record.date !== metrics.date), metrics].sort((a, b) => a.date.localeCompare(b.date))
    saveAudienceMetrics(selectedAccount.id, next); setRecords(next)
  }
  const saveProfile = (next: AudienceProfile) => { saveAudienceProfile(selectedAccount.id, next); setProfile(next) }
  return <main className="dashboard-content audience-page">
    <section className="aud-hero" aria-labelledby="audience-title"><div><p className="aud-kicker">AUDIENCIA · @{selectedAccount.handle}</p><h1 id="audience-title">Las personas detrás<br /><em>de cada interacción.</em></h1><p>Conoce a quién quieres llegar, escucha a tu comunidad y convierte los datos en decisiones con intención.</p><div className="aud-hero__tags"><span>◎ Perfil estratégico</span><span>↗ Comunidad real</span><span>✦ Análisis con IA</span></div></div><div className="aud-hero__art" aria-hidden="true"><div className="aud-orbit aud-orbit--one" /><div className="aud-orbit aud-orbit--two" /><div className="aud-hero__center">◎<small>PERSONAS<br />PRIMERO</small></div><i>✦</i><b>✳</b></div></section>
    <AudienceStrategy profile={profile} onSave={saveProfile} />
    <AudienceReal records={records} onSave={saveRecord} posts={posts} loading={loading} error={error} />
    <AudienceAI account={selectedAccount} profile={profile} latest={records.at(-1)} posts={posts} />
    <footer className="aud-footer"><span>RETORIKA <strong>RADAR</strong></span><span>Conectar empieza por comprender. ✦</span></footer>
  </main>
}

export default AudiencePage
