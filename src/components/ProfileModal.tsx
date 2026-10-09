import { useEffect } from 'react'
import type { OrgPerson } from '../types'
import { PersonAvatar } from './PersonAvatar'

interface ProfileModalProps {
  person: OrgPerson
  onClose: () => void
}

export function ProfileModal({ person, onClose }: ProfileModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const phone = person.businessPhones?.[0] ?? person.mobilePhone

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${person.displayName} profile`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="profile-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="profile-modal__header">
          <PersonAvatar id={person.id} displayName={person.displayName} size={80} />
          <div>
            <h2 className="profile-modal__name">{person.displayName}</h2>
            {person.jobTitle && <div className="profile-modal__title">{person.jobTitle}</div>}
          </div>
        </div>
        <dl className="profile-modal__details">
          <dt>Work location</dt>
          <dd>{person.officeLocation ?? '—'}</dd>
          <dt>Email</dt>
          <dd>{person.mail ?? person.userPrincipalName ?? '—'}</dd>
          <dt>Phone</dt>
          <dd>{phone ?? '—'}</dd>
        </dl>
      </div>
    </div>
  )
}
