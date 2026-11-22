import { describe, expect, it } from 'vitest';
import { clearSearchHistory, searchDeps } from './index';

describe('search index', () => {
  it('clears the shared history for the settings pane', () => {
    searchDeps.history.record('news');
    expect(searchDeps.history.list()).toEqual(['news']);
    clearSearchHistory();
    expect(searchDeps.history.list()).toEqual([]);
  });
});
