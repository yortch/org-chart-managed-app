import { useCallback, useEffect, useState } from 'react'
import './App.css'
import type { OrgPerson } from './types'
import { getDirectReports, getFullProfile, resolveOrgChain } from './services/orgService'
import { OrgNodeCard } from './components/OrgNodeCard'
import { ProfileModal } from './components/ProfileModal'

type LoadState = 'loading' | 'ready' | 'error'

function App() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | undefined>(undefined)

  // Each entry is one visible tree layer, in top-to-bottom order.
  const [layers, setLayers] = useState<OrgPerson[][]>([])
  // selectedPath[i] is the selected person's id in layer i.
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [loadingReportsFor, setLoadingReportsFor] = useState<string | undefined>(undefined)
  const [profilePerson, setProfilePerson] = useState<OrgPerson | undefined>(undefined)

  const loadInitialTree = useCallback(async () => {
    setLoadState('loading')
    setError(undefined)
    try {
      const chain = await resolveOrgChain()
      const me = chain[chain.length - 1]

      // Layer 0 is the top leader; each following layer holds the direct
      // reports of the chain member above it, ending with the user's reports.
      const reportLayers = await Promise.all(chain.map((person) => getDirectReports(person.id)))
      const nextLayers: OrgPerson[][] = [[chain[0]]]
      reportLayers.forEach((reports, i) => {
        if (reports.length === 0) return
        // Guarantee the path member is present even if the reports call omitted them.
        const pathMember = chain[i + 1]
        nextLayers.push(
          pathMember && !reports.some((r) => r.id === pathMember.id)
            ? [pathMember, ...reports]
            : reports,
        )
      })

      setLayers(nextLayers)
      setSelectedPath(chain.map((p) => p.id))
      setCurrentUserId(me.id)
      setLoadState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the org chart')
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadInitialTree()
  }, [loadInitialTree])

  useEffect(() => {
    if (loadState !== 'ready') return
    document
      .querySelector('[data-current-user]')
      ?.scrollIntoView({ block: 'center', inline: 'center' })
  }, [loadState])

  const handleSelect = useCallback(async (layerIndex: number, person: OrgPerson) => {
    setSelectedPath((prev) => [...prev.slice(0, layerIndex), person.id])
    setLoadingReportsFor(person.id)
    try {
      const reports = await getDirectReports(person.id)
      setLayers((prev) => {
        const next = prev.slice(0, layerIndex + 1)
        if (reports.length > 0) next.push(reports)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load direct reports')
    } finally {
      setLoadingReportsFor(undefined)
    }
  }, [])

  const handleViewProfile = useCallback(async (person: OrgPerson) => {
    try {
      const full = await getFullProfile(person.id)
      setProfilePerson(full)
    } catch {
      setProfilePerson(person)
    }
  }, [])

  if (loadState === 'loading') {
    return (
      <div className="app-status">
        <div className="app-status__spinner" aria-hidden="true" />
        <p>Loading your organization's hierarchy…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="app-status app-status--error">
        <p>{error}</p>
        <button type="button" onClick={() => void loadInitialTree()}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="org-chart-app">
      <header className="org-chart-header">
        <h1>Org Chart Explorer</h1>
        <p>Select anyone in the tree to see who reports to them.</p>
      </header>

      <div className="org-tree">
        {layers.map((layer, layerIndex) => (
          <div className="org-layer" key={layerIndex}>
            {layer.map((person) => (
              <OrgNodeCard
                key={person.id}
                person={person}
                isSelected={selectedPath[layerIndex] === person.id}
                isCurrentUser={person.id === currentUserId}
                isLoadingReports={loadingReportsFor === person.id}
                onSelect={(p) => void handleSelect(layerIndex, p)}
                onViewProfile={(p) => void handleViewProfile(p)}
              />
            ))}
          </div>
        ))}
      </div>

      {profilePerson && (
        <ProfileModal person={profilePerson} onClose={() => setProfilePerson(undefined)} />
      )}
    </div>
  )
}

export default App
