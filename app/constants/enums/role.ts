export enum Role {
  ADMIN = 'admin',
  MEMBER = 'member',
  VOLUNTEER = 'volunteer',
  GUEST = 'guest',
}

export const roleHierarchy = {
  [Role.ADMIN]: [Role.ADMIN, Role.MEMBER, Role.VOLUNTEER, Role.GUEST],
  [Role.MEMBER]: [Role.MEMBER, Role.VOLUNTEER, Role.GUEST],
  [Role.VOLUNTEER]: [Role.VOLUNTEER, Role.GUEST],
  [Role.GUEST]: [Role.GUEST],
}
