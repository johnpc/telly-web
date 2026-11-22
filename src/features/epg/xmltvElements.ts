import type { ProgramDetails } from '@/core/db/types';
import { episodeDisplay } from './xmltvEpisodeNum';
import { parseXmltvMs } from './xmltvTimestamp';
import type { XmltvChannel, XmltvProgram } from './xmltvTypes';

const CHANNEL_TEXT_TAGS = new Set(['display-name']);
const PROGRAM_TEXT_TAGS = new Set(['title', 'sub-title', 'desc', 'category']);

/** The value one child contributes, or null when it is not interesting. */
function childValue(child: Element, textTags: ReadonlySet<string>): string | null {
  const tag = child.tagName;
  if (tag === 'icon') return child.getAttribute('src');
  if (tag === 'episode-num') return episodeDisplay(child.getAttribute('system'), child.textContent);
  return textTags.has(tag) ? child.textContent : null;
}

/** Keeps the first usable occurrence of each interesting direct child (Android `collectChildren`). */
function collectChildren(element: Element, textTags: ReadonlySet<string>): Map<string, string> {
  const found = new Map<string, string>();
  for (const child of element.children) {
    const value = childValue(child, textTags);
    if (value !== null && !found.has(child.tagName)) found.set(child.tagName, value);
  }
  return found;
}

function nonBlank(value: string | null | undefined): string | null {
  return value !== undefined && value !== null && value.trim() !== '' ? value : null;
}

/** Returns the channel, or null when the mandatory `id` is missing. */
export function readChannel(element: Element): XmltvChannel | null {
  const id = nonBlank(element.getAttribute('id'));
  if (id === null) return null;
  const children = collectChildren(element, CHANNEL_TEXT_TAGS);
  return { id, displayName: children.get('display-name') ?? null, iconUrl: children.get('icon') ?? null };
}

/** Returns the programme, or null when channel/start/stop/title are unusable. */
export function readProgram(element: Element): XmltvProgram | null {
  const channelId = nonBlank(element.getAttribute('channel'));
  const startMs = parseXmltvMs(element.getAttribute('start'));
  const endMs = parseXmltvMs(element.getAttribute('stop'));
  const children = collectChildren(element, PROGRAM_TEXT_TAGS);
  const title = nonBlank(children.get('title'));
  if (channelId === null || title === null || startMs === null || endMs === null) return null;
  const details: ProgramDetails = {
    title,
    subTitle: children.get('sub-title') ?? null,
    description: children.get('desc') ?? null,
    category: children.get('category') ?? null,
    episode: children.get('episode-num') ?? null,
  };
  return { channelId, startMs, endMs, details };
}
