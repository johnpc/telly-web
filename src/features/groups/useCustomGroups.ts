import { useLiveQuery } from 'dexie-react-hooks';
import { type CustomGroupRepository, customGroupRepository } from '@/core/db/customGroupRepository';
import { type CustomGroup, joinCustomGroups } from './customGroups';

const NONE: CustomGroup[] = [];

/** Live custom groups with membership (Android `GroupTools.groups`). */
export function useCustomGroups(repository: CustomGroupRepository = customGroupRepository): CustomGroup[] {
  return (
    useLiveQuery(
      async () => joinCustomGroups(await repository.groups(), await repository.members()),
      [repository],
    ) ?? NONE
  );
}
