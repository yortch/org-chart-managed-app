import type { OrgPerson } from '../types'
import { PersonAvatar } from './PersonAvatar'

interface OrgNodeCardProps {
  person: OrgPerson
  isSelected: boolean
  isCurrentUser?: boolean
  isLoadingReports: boolean
  onSelect: (person: OrgPerson) => void
  onViewProfile: (person: OrgPerson) => void
}

export function OrgNodeCard({
  person,
  isSelected,
  isCurrentUser = false,
  isLoadingReports,
  onSelect,
  onViewProfile,
}: OrgNodeCardProps) {
  return (
    <div
      className={`org-node${isSelected ? ' org-node--selected' : ''}${isCurrentUser ? ' org-node--you' : ''}`}
      data-current-user={isCurrentUser || undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(person)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(person)
        }
      }}
      aria-pressed={isSelected}
    >
      <PersonAvatar id={person.id} displayName={person.displayName} />
      <div className="org-node__info">
        <div className="org-node__name">{person.displayName}</div>
        {person.jobTitle && <div className="org-node__title">{person.jobTitle}</div>}
      </div>
      <button
        type="button"
        className="org-node__profile-btn"
        onClick={(e) => {
          e.stopPropagation()
          onViewProfile(person)
        }}
      >
        View Profile
      </button>
      {isCurrentUser && <span className="org-node__you-badge">You</span>}
      {isLoadingReports && <div className="org-node__spinner" aria-label="Loading direct reports" />}
    </div>
  )
}
