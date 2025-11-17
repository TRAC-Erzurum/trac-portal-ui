export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MEMBER = 'member',
  VOLUNTEER = 'volunteer',
  GUEST = 'guest',
}

export const roleHierarchy = {
  [Role.SUPER_ADMIN]: [Role.SUPER_ADMIN, Role.ADMIN, Role.MEMBER, Role.VOLUNTEER, Role.GUEST],
  [Role.ADMIN]: [Role.ADMIN, Role.MEMBER, Role.VOLUNTEER, Role.GUEST],
  [Role.MEMBER]: [Role.MEMBER, Role.VOLUNTEER, Role.GUEST],
  [Role.VOLUNTEER]: [Role.VOLUNTEER, Role.GUEST],
  [Role.GUEST]: [Role.GUEST],
}
