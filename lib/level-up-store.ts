import { applyXp, buildLevelUpPreview, confirmLevelUp, getProgressionOptions, spells, feats, multiclassRules, startLevelUp, type CampaignConfig, type CharacterSnapshot, type LevelUpDraft } from './level-up';

type StoreState = {
  campaign: CampaignConfig;
  characters: Record<string, CharacterSnapshot>;
  drafts: Record<string, LevelUpDraft | undefined>;
};

const globalStore = globalThis as typeof globalThis & { __dndMeLevelUpStore?: StoreState };

function createStore(): StoreState {
  return {
    campaign: {
      id: 'demo-campaign',
      name: 'Руины старой башни',
      progressionMode: 'xp',
      edition: '5e14',
      includeHomebrew: false,
      manualLevelUpUnlocked: false,
    },
    characters: {},
    drafts: {},
  };
}

export function getStore() {
  if (!globalStore.__dndMeLevelUpStore) {
    globalStore.__dndMeLevelUpStore = createStore();
  }
  return globalStore.__dndMeLevelUpStore;
}

export function seedCharacters(characters: CharacterSnapshot[], campaign?: Partial<CampaignConfig>) {
  const store = getStore();
  store.characters = Object.fromEntries(characters.map((character) => [character.id, character]));
  store.drafts = {};
  store.campaign = { ...store.campaign, ...campaign };
  return store;
}

export function patchXp(characterId: string, xpDelta: number) {
  const store = getStore();
  const character = store.characters[characterId];
  if (!character) throw new Error('Character not found');
  const result = applyXp(character, store.campaign, xpDelta);
  store.characters[characterId] = result.character;
  return result;
}

export function createDraft(characterId: string, targetClassId?: string) {
  const store = getStore();
  const character = store.characters[characterId];
  if (!character) throw new Error('Character not found');
  const draft = startLevelUp(character, store.campaign, targetClassId);
  store.drafts[characterId] = draft;
  return draft;
}

export function previewDraft(characterId: string, patch: Partial<LevelUpDraft>) {
  const store = getStore();
  const character = store.characters[characterId];
  const existingDraft = store.drafts[characterId];
  if (!character || !existingDraft) throw new Error('Draft not found');
  const nextDraft: LevelUpDraft = { ...existingDraft, ...patch };
  nextDraft.previewSnapshot = buildLevelUpPreview(character, store.campaign, nextDraft);
  store.drafts[characterId] = nextDraft;
  return nextDraft;
}

export function confirmDraft(characterId: string) {
  const store = getStore();
  const character = store.characters[characterId];
  const draft = store.drafts[characterId];
  if (!character || !draft) throw new Error('Draft not found');
  const nextCharacter = confirmLevelUp(character, store.campaign, draft);
  store.characters[characterId] = nextCharacter;
  delete store.drafts[characterId];
  return nextCharacter;
}

export function cancelDraft(characterId: string) {
  const store = getStore();
  delete store.drafts[characterId];
  return { ok: true };
}

export function progressionOptions(characterId: string) {
  const store = getStore();
  const character = store.characters[characterId];
  if (!character) throw new Error('Character not found');
  return getProgressionOptions(character, store.campaign);
}

export function referenceSpells(classId?: string, maxLevel?: number) {
  return spells.filter((spell) => (!classId || spell.classes.includes(classId)) && (typeof maxLevel !== 'number' || spell.level <= maxLevel));
}

export function referenceFeats() {
  return feats;
}

export function referenceMulticlassOptions() {
  return multiclassRules;
}
