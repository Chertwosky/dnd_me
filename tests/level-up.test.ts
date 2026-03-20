import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevelUpPreview, confirmLevelUp, deriveCharacterProgression, startLevelUp, type CampaignConfig, type CharacterSnapshot } from '../lib/level-up.ts';

const campaign: CampaignConfig = {
  id: 'test',
  name: 'Test',
  progressionMode: 'xp',
  edition: '5e14',
  includeHomebrew: false,
  manualLevelUpUnlocked: false,
};

const wizard: CharacterSnapshot = {
  id: 'c1',
  name: 'Elira',
  level: 4,
  experience: 7000,
  heroClass: 'Wizard',
  subclass: 'School of Evocation',
  selectedSubclassId: 'evocation',
  stats: { str: 8, dex: 14, con: 12, int: 18, wis: 13, cha: 10 },
  classLevels: [{ classId: 'Wizard', level: 4 }],
  knownSpellIds: ['magic-missile', 'shield'],
  takenFeatIds: ['observant'],
};

test('marks character ready when XP threshold is reached', () => {
  const progression = deriveCharacterProgression(wizard, campaign);
  assert.equal(progression.canLevelUp, true);
  assert.equal(progression.nextLevelXp, 6500);
});

test('returns blocked reasons for unavailable feats and multiclass options', () => {
  const draft = startLevelUp(wizard, campaign, 'Fighter');
  const preview = buildLevelUpPreview(wizard, campaign, draft);
  const fighterOption = preview.multiclassOptions.find((item) => item.item.classId === 'Fighter');
  const heavyArmorMaster = preview.feats.find((item) => item.item.id === 'heavy-armor-master');
  assert.equal(fighterOption?.available, false);
  assert.match(fighterOption?.reasons[0]?.message ?? '', /STR 13/);
  assert.equal(heavyArmorMaster?.available, false);
  assert.match(heavyArmorMaster?.reasons[0]?.message ?? '', /STR 13/);
});

test('applies chosen feat and spells after completing required selections', () => {
  const draft = startLevelUp(wizard, campaign);
  draft.selectedFeatId = 'war-caster';
  draft.selectedSpellIds = ['fireball', 'counterspell'];
  draft.previewSnapshot = buildLevelUpPreview(wizard, campaign, draft);
  const next = confirmLevelUp(wizard, campaign, draft);
  assert.equal(next.level, 5);
  assert.ok(next.takenFeatIds?.includes('war-caster'));
  assert.ok(next.knownSpellIds?.includes('fireball'));
  assert.ok(next.knownSpellIds?.includes('counterspell'));
});
