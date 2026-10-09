import { Office365UsersService } from '../../generated/services/Office365UsersService'
import type { GraphUser_V1 } from '../../generated/models/Office365UsersModel'
import type { OrgPerson } from '../types'

const PROFILE_FIELDS = [
  'id',
  'displayName',
  'jobTitle',
  'department',
  'mail',
  'userPrincipalName',
  'officeLocation',
  'mobilePhone',
  'businessPhones',
].join(',')

// Safety ceiling so a bad manager chain (e.g. a cycle) can't loop forever.
const MAX_MANAGER_CHAIN_DEPTH = 25

function toPerson(user: GraphUser_V1): OrgPerson {
  return {
    id: user.id ?? user.userPrincipalName ?? user.mail ?? crypto.randomUUID(),
    displayName: user.displayName ?? 'Unknown',
    jobTitle: user.jobTitle,
    department: user.department,
    mail: user.mail,
    userPrincipalName: user.userPrincipalName,
    officeLocation: user.officeLocation,
    mobilePhone: user.mobilePhone,
    businessPhones: user.businessPhones,
  }
}

/**
 * Walks the manager chain upward from the signed-in user until a profile with
 * no manager is found (the leader at the top of the org).
 * Returns the chain ordered from the top leader down to the signed-in user.
 */
export async function resolveOrgChain(): Promise<OrgPerson[]> {
  const me = await Office365UsersService.MyProfile_V2(PROFILE_FIELDS)
  if (!me.success || !me.data) {
    throw new Error(me.error?.message ?? 'Failed to resolve the signed-in user profile')
  }

  let current = me.data
  const chain: OrgPerson[] = [toPerson(current)]

  while (chain.length <= MAX_MANAGER_CHAIN_DEPTH) {
    const id = current.id ?? current.userPrincipalName
    if (!id) break

    const managerResult = await Office365UsersService.Manager_V2(id, PROFILE_FIELDS)
    if (!managerResult.success || !managerResult.data || !managerResult.data.id) {
      // No manager returned: current is the top of the org.
      break
    }

    current = managerResult.data
    chain.unshift(toPerson(current))
  }

  return chain
}

export async function getDirectReports(id: string): Promise<OrgPerson[]> {
  const result = await Office365UsersService.DirectReports_V2(id, PROFILE_FIELDS, 999)
  if (!result.success) {
    throw new Error(result.error?.message ?? 'Failed to load direct reports')
  }
  return (result.data?.value ?? []).map(toPerson)
}

export async function getFullProfile(id: string): Promise<OrgPerson> {
  const result = await Office365UsersService.UserProfile_V2(id, PROFILE_FIELDS)
  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'Failed to load profile')
  }
  return toPerson(result.data)
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)))
  }
  return btoa(binary)
}

function toImageDataUrl(value: unknown, contentType = 'image/jpeg'): string {
  if (value instanceof Uint8Array) {
    return `data:${contentType};base64,${bytesToBase64(value)}`
  }
  if (value instanceof ArrayBuffer) {
    return `data:${contentType};base64,${bytesToBase64(new Uint8Array(value))}`
  }
  if (typeof value === 'string') {
    if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) {
      return value
    }
    if (/^https?:/i.test(value)) {
      throw new Error('Profile photo returned an HTTP URL instead of binary image data.')
    }
    return `data:${contentType};base64,${value}`
  }
  throw new Error('The profile photo response used an unsupported format.')
}

/** Returns a CSP-safe base64 data URL for the user's photo, or undefined if they have none. */
export async function getPhotoDataUrl(id: string): Promise<string | undefined> {
  const metadata = await Office365UsersService.UserPhotoMetadata(id)
  if (!metadata.success || !metadata.data?.HasPhoto) {
    return undefined
  }

  const photo = await Office365UsersService.UserPhoto_V2(id)
  if (!photo.success || !photo.data) {
    return undefined
  }

  try {
    return toImageDataUrl(photo.data, metadata.data.ContentType)
  } catch {
    return undefined
  }
}
