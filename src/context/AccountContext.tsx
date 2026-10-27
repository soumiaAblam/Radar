import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ensureDemoSession, supabase } from '../lib/supabase'

export type RadarAccount = {
  id: string
  handle: string
  source: 'demo' | 'instagram'
}

type AccountContextValue = {
  accounts: RadarAccount[]
  selectedAccount: RadarAccount
  selectAccount: (accountId: string) => void
  refreshAccounts: () => Promise<void>
}

const demoAccounts: RadarAccount[] = [
  { id: 'retorika-academy', handle: 'Retorika_academy', source: 'demo' },
  { id: 'retorika-media', handle: 'Retorika_home', source: 'demo' },
  { id: 'retorika-lab', handle: 'Retorika_business', source: 'demo' },
]

const selectedAccountStorageKey = 'retorika-radar-selected-account'
const AccountContext = createContext<AccountContextValue | null>(null)

function getStoredAccountId() {
  try {
    return window.localStorage.getItem(selectedAccountStorageKey) ?? demoAccounts[0].id
  } catch {
    return demoAccounts[0].id
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<RadarAccount[]>(demoAccounts)
  const [selectedAccountId, setSelectedAccountId] = useState(getStoredAccountId)

  const refreshAccounts = async () => {
    try {
      await ensureDemoSession()
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select('id, username')
        .eq('connection_status', 'connected')
        .order('created_at', { ascending: true })

      if (error) throw error

      const instagramAccounts: RadarAccount[] = (data ?? []).map((account) => ({
        id: account.id,
        handle: account.username,
        source: 'instagram',
      }))

      setAccounts([...instagramAccounts, ...demoAccounts])
      setSelectedAccountId((currentId) => {
        const accountStillExists = [...instagramAccounts, ...demoAccounts].some((account) => account.id === currentId)
        return instagramAccounts.some((account) => account.id === currentId)
          ? currentId
          : instagramAccounts[0]?.id ?? (accountStillExists ? currentId : demoAccounts[0].id)
      })
    } catch {
      setAccounts(demoAccounts)
    }
  }

  useEffect(() => {
    void refreshAccounts()
  }, [])

  const selectAccount = (accountId: string) => {
    if (!accounts.some((account) => account.id === accountId)) return
    setSelectedAccountId(accountId)
    try {
      window.localStorage.setItem(selectedAccountStorageKey, accountId)
    } catch {
      // La selección sigue funcionando aunque el navegador no permita almacenamiento local.
    }
  }

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0]
  const value = useMemo(() => ({ accounts, selectedAccount, selectAccount, refreshAccounts }), [accounts, selectedAccount])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount debe utilizarse dentro de AccountProvider.')
  return context
}
