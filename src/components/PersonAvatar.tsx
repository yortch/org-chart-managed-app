import { useEffect, useState } from 'react'
import { getPhotoDataUrl } from '../services/orgService'

interface PersonAvatarProps {
  id: string
  displayName: string
  size?: number
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar that lazily loads a person's profile photo, falling back to initials. */
export function PersonAvatar({ id, displayName, size = 56 }: PersonAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setPhotoUrl(undefined)

    getPhotoDataUrl(id)
      .then((url) => {
        if (!cancelled) setPhotoUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPhotoUrl(undefined)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const style = { width: size, height: size, fontSize: size * 0.38 }

  if (photoUrl) {
    return (
      <img
        className="person-avatar"
        style={style}
        src={photoUrl}
        alt={`${displayName}'s profile photo`}
      />
    )
  }

  return (
    <div className="person-avatar person-avatar--initials" style={style} aria-hidden="true">
      {getInitials(displayName)}
    </div>
  )
}
