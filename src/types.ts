export interface OrgPerson {
  id: string
  displayName: string
  jobTitle?: string
  department?: string
  mail?: string
  userPrincipalName?: string
  officeLocation?: string
  mobilePhone?: string
  businessPhones?: string[]
}
