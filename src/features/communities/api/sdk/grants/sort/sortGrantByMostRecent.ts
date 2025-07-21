import type { Grant } from '@show-karma/karma-gap-sdk';

export const sortGrantByMostRecent = (grants: Grant[]) => {
  const newGrants = [...grants];
  return newGrants.sort((a, b) => {
    const aDate = new Date(a.createdAt);
    const bDate = new Date(b.createdAt);

    return bDate.getTime() - aDate.getTime();
  });
};
