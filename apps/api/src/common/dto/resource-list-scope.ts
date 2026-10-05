/**
 * Which vehicles / meeting rooms a list endpoint returns.
 * - MANAGED: resources administered by the user's company (administration screens).
 * - GROUP: resources bookable by any member of the Group (booking screens).
 */
export enum ResourceListScope {
  MANAGED = 'managed',
  GROUP = 'group',
}
