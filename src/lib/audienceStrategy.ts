export const audienceFields = [
  { key: 'age', label: 'Edad', placeholder: 'Por ejemplo: 25–34 años' },
  { key: 'gender', label: 'Género', placeholder: 'Por ejemplo: todos los géneros' },
  { key: 'location', label: 'Ubicación', placeholder: 'Ciudades, países o regiones' },
  { key: 'interests', label: 'Intereses', placeholder: 'Temas que le interesan' },
  { key: 'sector', label: 'Sector profesional', placeholder: 'Profesiones o sectores' },
  { key: 'needs', label: 'Necesidades', placeholder: 'Qué necesita o busca resolver' },
  { key: 'behaviors', label: 'Comportamientos', placeholder: 'Hábitos y preferencias' },
] as const

export type AudienceProfile = Record<(typeof audienceFields)[number]['key'], string>
export const emptyProfile: AudienceProfile = { age: '', gender: '', location: '', interests: '', sector: '', needs: '', behaviors: '' }
const profileKey = (accountId: string) => `retorika-radar-audience-profile:${accountId}`

export function loadAudienceProfile(accountId: string): AudienceProfile {
  try {
    const saved = JSON.parse(window.localStorage.getItem(profileKey(accountId)) || '{}') as Partial<AudienceProfile>
    return Object.fromEntries(audienceFields.map(({ key }) => [key, typeof saved[key] === 'string' ? saved[key] : ''])) as AudienceProfile
  } catch { return { ...emptyProfile } }
}

export function saveAudienceProfile(accountId: string, profile: AudienceProfile) {
  window.localStorage.setItem(profileKey(accountId), JSON.stringify(profile))
}
