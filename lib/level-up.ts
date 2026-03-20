export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type ProgressionMode = 'xp' | 'milestone';
export type LevelUpState = 'none' | 'ready' | 'in_progress';
export type Edition = '5e14' | '5e24';

export type CharacterStats = Record<AbilityKey, number>;

export type CharacterClassLevel = {
  classId: string;
  level: number;
};

export type CharacterSnapshot = {
  id: string;
  name: string;
  level: number;
  experience?: number;
  heroClass: string;
  subclass?: string;
  stats: CharacterStats;
  spells?: string;
  feats?: string;
  features?: string;
  classLevels?: CharacterClassLevel[];
  takenFeatIds?: string[];
  selectedSubclassId?: string;
  knownSpellIds?: string[];
};

export type CampaignConfig = {
  id: string;
  name: string;
  progressionMode: ProgressionMode;
  manualLevelUpUnlocked?: boolean;
  edition: Edition;
  includeHomebrew: boolean;
};

export type CharacterProgression = {
  characterId: string;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number | null;
  canLevelUp: boolean;
  levelUpState: LevelUpState;
};

export type LevelUpDraft = {
  characterId: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  targetClassId: string;
  isMulticlass: boolean;
  selectedSubclassId?: string;
  selectedFeatId?: string;
  selectedAbilityIncrease?: Partial<Record<AbilityKey, number>>;
  selectedSpellIds: string[];
  selectedCantripIds: string[];
  selectedChoices: string[];
  previewSnapshot?: LevelUpPreview;
};

export type RuleReasonCode =
  | 'ability_requirement'
  | 'spellcasting_required'
  | 'class_level_requirement'
  | 'feat_already_taken'
  | 'subclass_not_selected'
  | 'campaign_mode_block'
  | 'no_level_up_available';

export type BlockedReason = {
  code: RuleReasonCode;
  message: string;
  meta?: Record<string, string | number | boolean>;
};

export type Availability<T> = {
  item: T;
  available: boolean;
  reasons: BlockedReason[];
};

export type FeatureGrant = {
  id: string;
  name: string;
  description: string;
  sourceType: 'class' | 'subclass';
};

export type SpellRef = {
  id: string;
  name: string;
  level: number;
  school: string;
  classes: string[];
  subclassLists?: string[];
  ritual?: boolean;
  concentration?: boolean;
  source: string;
  edition: Edition;
  isHomebrew?: boolean;
};

export type FeatRef = {
  id: string;
  name: string;
  prerequisites: Array<
    | { type: 'ability'; ability: AbilityKey; min: number }
    | { type: 'spellcasting' }
    | { type: 'classLevel'; classId: string; min: number }
  >;
  grants: string[];
  isHalfFeat?: boolean;
  source: string;
  edition: Edition;
  isHomebrew?: boolean;
};

export type ClassLevelRef = {
  level: number;
  features: string[];
  subclassFeatureIds?: string[];
  spellUnlockLevel?: number;
  cantripChoices?: number;
  spellChoices?: number;
  asi?: boolean;
  subclassChoice?: boolean;
};

export type ClassRef = {
  id: string;
  name: string;
  primaryAbilities: AbilityKey[];
  spellcastingAbility?: AbilityKey;
  subclassChoiceLevel?: number;
  classLevels: ClassLevelRef[];
};

export type SubclassRef = {
  id: string;
  classId: string;
  name: string;
  featuresByLevel: Record<number, string[]>;
};

export type MulticlassRuleRef = {
  classId: string;
  requirements: Array<{ ability: AbilityKey; min: number }>;
  grantedProficiencies: string[];
  casterContribution: 'full' | 'half' | 'third' | 'none';
  notes?: string;
};

export type LevelUpPreview = {
  currentLevel: number;
  targetCharacterLevel: number;
  targetClassId: string;
  targetClassLevel: number;
  isMulticlass: boolean;
  classFeatures: FeatureGrant[];
  subclassFeatures: FeatureGrant[];
  spells: Availability<SpellRef>[];
  feats: Availability<FeatRef>[];
  asi: {
    available: boolean;
    points: number;
  };
  subclassOptions: Availability<SubclassRef>[];
  multiclassOptions: Availability<MulticlassRuleRef>[];
  blockedOptions: BlockedReason[];
  missingSelections: string[];
  summary: string[];
};

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

const classFeaturesCatalog: Record<string, Omit<FeatureGrant, 'sourceType'>> = {
  'wizard-spellcasting': { id: 'wizard-spellcasting', name: 'Spellcasting', description: 'Получаете доступ к книге заклинаний и подготовке заклинаний.' },
  'wizard-arcane-recovery': { id: 'wizard-arcane-recovery', name: 'Arcane Recovery', description: 'После короткого отдыха восстанавливаете часть ячеек.' },
  'wizard-asi': { id: 'wizard-asi', name: 'ASI / Feat', description: 'Можно повысить характеристики или взять черту.' },
  'wizard-3rd-spells': { id: 'wizard-3rd-spells', name: '3rd-level spells', description: 'Открываются заклинания 3 круга.' },
  'fighter-style': { id: 'fighter-style', name: 'Fighting Style', description: 'Получаете боевой стиль.' },
  'fighter-second-wind': { id: 'fighter-second-wind', name: 'Second Wind', description: 'Самолечение бонусным действием.' },
  'fighter-action-surge': { id: 'fighter-action-surge', name: 'Action Surge', description: 'Дополнительное действие один раз за отдых.' },
  'fighter-martial-archetype': { id: 'fighter-martial-archetype', name: 'Martial Archetype', description: 'Выбор подкласса бойца.' },
  'fighter-asi': { id: 'fighter-asi', name: 'ASI / Feat', description: 'Можно повысить характеристики или взять черту.' },
  'cleric-spellcasting': { id: 'cleric-spellcasting', name: 'Spellcasting', description: 'Подготовка заклинаний жреца.' },
  'cleric-divine-domain': { id: 'cleric-divine-domain', name: 'Divine Domain', description: 'Выбор божественного домена.' },
};

export const classes: ClassRef[] = [
  {
    id: 'Wizard',
    name: 'Wizard',
    primaryAbilities: ['int'],
    spellcastingAbility: 'int',
    subclassChoiceLevel: 2,
    classLevels: [
      { level: 1, features: ['wizard-spellcasting', 'wizard-arcane-recovery'], spellUnlockLevel: 1, cantripChoices: 3, spellChoices: 6 },
      { level: 2, features: [], subclassChoice: true },
      { level: 3, features: [], spellUnlockLevel: 2, spellChoices: 2 },
      { level: 4, features: ['wizard-asi'], asi: true, spellChoices: 2 },
      { level: 5, features: ['wizard-3rd-spells'], spellUnlockLevel: 3, spellChoices: 2 },
    ],
  },
  {
    id: 'Fighter',
    name: 'Fighter',
    primaryAbilities: ['str', 'dex'],
    classLevels: [
      { level: 1, features: ['fighter-style', 'fighter-second-wind'] },
      { level: 2, features: ['fighter-action-surge'] },
      { level: 3, features: ['fighter-martial-archetype'], subclassChoice: true },
      { level: 4, features: ['fighter-asi'], asi: true },
      { level: 5, features: [] },
    ],
  },
  {
    id: 'Cleric',
    name: 'Cleric',
    primaryAbilities: ['wis'],
    spellcastingAbility: 'wis',
    subclassChoiceLevel: 1,
    classLevels: [
      { level: 1, features: ['cleric-spellcasting', 'cleric-divine-domain'], subclassChoice: true, spellUnlockLevel: 1, cantripChoices: 3, spellChoices: 4 },
      { level: 2, features: [], spellChoices: 2 },
      { level: 3, features: [], spellUnlockLevel: 2, spellChoices: 2 },
      { level: 4, features: ['wizard-asi'], asi: true, spellChoices: 2 },
    ],
  },
];

export const subclasses: SubclassRef[] = [
  { id: 'evocation', classId: 'Wizard', name: 'School of Evocation', featuresByLevel: { 2: ['Evocation Savant'], 5: ['Potent Cantrip'] } },
  { id: 'illusion', classId: 'Wizard', name: 'School of Illusion', featuresByLevel: { 2: ['Improved Minor Illusion'], 5: ['Malleable Illusions'] } },
  { id: 'champion', classId: 'Fighter', name: 'Champion', featuresByLevel: { 3: ['Improved Critical'] } },
  { id: 'battle-master', classId: 'Fighter', name: 'Battle Master', featuresByLevel: { 3: ['Combat Superiority', 'Student of War'] } },
  { id: 'life-domain', classId: 'Cleric', name: 'Life Domain', featuresByLevel: { 1: ['Disciple of Life'], 2: ['Channel Divinity: Preserve Life'] } },
];

export const spells: SpellRef[] = [
  { id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'Evocation', classes: ['Wizard'], source: 'SRD', edition: '5e14' },
  { id: 'shield', name: 'Shield', level: 1, school: 'Abjuration', classes: ['Wizard'], source: 'SRD', edition: '5e14' },
  { id: 'misty-step', name: 'Misty Step', level: 2, school: 'Conjuration', classes: ['Wizard'], source: 'SRD', edition: '5e14' },
  { id: 'fireball', name: 'Fireball', level: 3, school: 'Evocation', classes: ['Wizard'], source: 'SRD', edition: '5e14' },
  { id: 'counterspell', name: 'Counterspell', level: 3, school: 'Abjuration', classes: ['Wizard'], source: 'SRD', edition: '5e14' },
  { id: 'cure-wounds', name: 'Cure Wounds', level: 1, school: 'Evocation', classes: ['Cleric'], source: 'SRD', edition: '5e14' },
  { id: 'bless', name: 'Bless', level: 1, school: 'Enchantment', classes: ['Cleric'], source: 'SRD', edition: '5e14' },
  { id: 'spare-the-dying', name: 'Spare the Dying', level: 0, school: 'Necromancy', classes: ['Cleric'], source: 'SRD', edition: '5e14' },
];

export const feats: FeatRef[] = [
  { id: 'war-caster', name: 'War Caster', prerequisites: [{ type: 'spellcasting' }], grants: ['advantage on concentration saves'], source: 'PHB', edition: '5e14' },
  { id: 'observant', name: 'Observant', prerequisites: [{ type: 'ability', ability: 'int', min: 13 }], grants: ['+1 INT/WIS', 'lip reading'], isHalfFeat: true, source: 'PHB', edition: '5e14' },
  { id: 'resilient-con', name: 'Resilient (CON)', prerequisites: [], grants: ['+1 CON', 'CON saving throw proficiency'], isHalfFeat: true, source: 'PHB', edition: '5e14' },
  { id: 'ritual-caster', name: 'Ritual Caster', prerequisites: [{ type: 'ability', ability: 'wis', min: 13 }], grants: ['ritual book'], source: 'PHB', edition: '5e14' },
  { id: 'sharpshooter', name: 'Sharpshooter', prerequisites: [], grants: ['ranged attack benefits'], source: 'PHB', edition: '5e14' },
  { id: 'spell-sniper', name: 'Spell Sniper', prerequisites: [{ type: 'spellcasting' }], grants: ['doubles spell range'], source: 'PHB', edition: '5e14' },
  { id: 'heavy-armor-master', name: 'Heavy Armor Master', prerequisites: [{ type: 'ability', ability: 'str', min: 13 }], grants: ['+1 STR', 'damage reduction'], isHalfFeat: true, source: 'PHB', edition: '5e14' },
  { id: 'keen-mind-homebrew', name: 'Keen Mind+', prerequisites: [{ type: 'ability', ability: 'int', min: 13 }], grants: ['homebrew memory feature'], source: 'Homebrew', edition: '5e24', isHomebrew: true },
];

export const multiclassRules: MulticlassRuleRef[] = [
  { classId: 'Wizard', requirements: [{ ability: 'int', min: 13 }], grantedProficiencies: [], casterContribution: 'full', notes: 'Требуется INT 13.' },
  { classId: 'Fighter', requirements: [{ ability: 'str', min: 13 }, { ability: 'dex', min: 13 }], grantedProficiencies: ['light armor', 'medium armor', 'shields'], casterContribution: 'none', notes: 'Нужно STR 13 или DEX 13 по домашнему конфигу; в демо показываем обе проверки как причины.' },
  { classId: 'Cleric', requirements: [{ ability: 'wis', min: 13 }], grantedProficiencies: ['light armor', 'medium armor', 'shields'], casterContribution: 'full', notes: 'Требуется WIS 13.' },
];

export function getXpThreshold(level: number) {
  return XP_THRESHOLDS[level - 1] ?? null;
}

export function getNextLevelXp(level: number) {
  return XP_THRESHOLDS[level] ?? null;
}

export function getCharacterClassLevels(character: CharacterSnapshot): CharacterClassLevel[] {
  return character.classLevels?.length ? character.classLevels : [{ classId: character.heroClass, level: character.level }];
}

export function deriveCharacterProgression(character: CharacterSnapshot, campaign: CampaignConfig, currentDraft?: LevelUpDraft | null): CharacterProgression {
  const currentXp = character.experience ?? 0;
  const nextLevelXp = campaign.progressionMode === 'xp' ? getNextLevelXp(character.level) : null;
  const canLevelUp = campaign.progressionMode === 'milestone'
    ? Boolean(campaign.manualLevelUpUnlocked)
    : nextLevelXp !== null && currentXp >= nextLevelXp;

  return {
    characterId: character.id,
    currentLevel: character.level,
    currentXp,
    nextLevelXp,
    canLevelUp,
    levelUpState: currentDraft?.status === 'draft' ? 'in_progress' : canLevelUp ? 'ready' : 'none',
  };
}

function hasSpellcasting(character: CharacterSnapshot) {
  return getCharacterClassLevels(character).some(({ classId }) => Boolean(classes.find((item) => item.id === classId)?.spellcastingAbility));
}

function evaluateFeatAvailability(character: CharacterSnapshot, feat: FeatRef, config: CampaignConfig): Availability<FeatRef> {
  const reasons: BlockedReason[] = [];
  if (feat.isHomebrew && !config.includeHomebrew) {
    reasons.push({ code: 'campaign_mode_block', message: 'Homebrew отключён в кампании.' });
  }
  for (const prerequisite of feat.prerequisites) {
    if (prerequisite.type === 'ability' && character.stats[prerequisite.ability] < prerequisite.min) {
      reasons.push({
        code: 'ability_requirement',
        message: `Требуется ${prerequisite.ability.toUpperCase()} ${prerequisite.min}`,
        meta: { ability: prerequisite.ability, min: prerequisite.min },
      });
    }
    if (prerequisite.type === 'spellcasting' && !hasSpellcasting(character)) {
      reasons.push({ code: 'spellcasting_required', message: 'Нужна способность накладывать заклинания' });
    }
    if (prerequisite.type === 'classLevel') {
      const classLevel = getCharacterClassLevels(character).find((entry) => entry.classId === prerequisite.classId)?.level ?? 0;
      if (classLevel < prerequisite.min) {
        reasons.push({ code: 'class_level_requirement', message: `Недоступно без ${prerequisite.min} уровня класса`, meta: { classId: prerequisite.classId, min: prerequisite.min } });
      }
    }
  }
  if (character.takenFeatIds?.includes(feat.id)) {
    reasons.push({ code: 'feat_already_taken', message: 'Черта уже взята' });
  }
  return { item: feat, available: reasons.length === 0, reasons };
}

function evaluateMulticlassAvailability(character: CharacterSnapshot, rule: MulticlassRuleRef): Availability<MulticlassRuleRef> {
  const reasons: BlockedReason[] = [];
  for (const requirement of rule.requirements) {
    if (character.stats[requirement.ability] < requirement.min) {
      reasons.push({ code: 'ability_requirement', message: `Требуется ${requirement.ability.toUpperCase()} ${requirement.min}`, meta: { ability: requirement.ability, min: requirement.min } });
    }
  }
  return { item: rule, available: reasons.length === 0, reasons };
}

function evaluateSubclassAvailability(character: CharacterSnapshot, subclass: SubclassRef, targetClassLevel: number, draft?: LevelUpDraft): Availability<SubclassRef> {
  const reasons: BlockedReason[] = [];
  if (subclass.classId !== draft?.targetClassId) {
    reasons.push({ code: 'campaign_mode_block', message: 'Подкласс не относится к выбранному классу.' });
  }
  if (targetClassLevel <= 0) {
    reasons.push({ code: 'class_level_requirement', message: 'Недоступно без 1 уровня класса' });
  }
  return { item: subclass, available: reasons.length === 0, reasons };
}

function getClassRef(classId: string) {
  return classes.find((item) => item.id === classId);
}

function getClassLevelRef(classId: string, level: number) {
  return getClassRef(classId)?.classLevels.find((item) => item.level === level);
}

function toFeatureGrant(featureId: string, sourceType: 'class' | 'subclass'): FeatureGrant {
  const feature = classFeaturesCatalog[featureId];
  if (feature) {
    return { ...feature, sourceType };
  }
  return { id: featureId, name: featureId, description: 'Новая особенность уровня.', sourceType };
}

function getSelectableSpells(targetClassId: string, levelRef: ClassLevelRef | undefined, config: CampaignConfig): Availability<SpellRef>[] {
  const maxSpellLevel = levelRef?.spellUnlockLevel ?? 0;
  return spells
    .filter((spell) => spell.classes.includes(targetClassId) && spell.level <= maxSpellLevel && (!spell.isHomebrew || config.includeHomebrew))
    .map((spell) => ({ item: spell, available: true, reasons: [] }));
}

export function buildLevelUpPreview(character: CharacterSnapshot, campaign: CampaignConfig, draft: LevelUpDraft): LevelUpPreview {
  const progression = deriveCharacterProgression(character, campaign, draft);
  const currentClassLevels = getCharacterClassLevels(character);
  const baseClassLevel = currentClassLevels.find((entry) => entry.classId === draft.targetClassId)?.level ?? 0;
  const targetClassLevel = baseClassLevel + 1;
  const classRef = getClassRef(draft.targetClassId);
  const levelRef = getClassLevelRef(draft.targetClassId, targetClassLevel);
  const blockedOptions: BlockedReason[] = [];

  if (!progression.canLevelUp && progression.levelUpState !== 'in_progress') {
    blockedOptions.push({ code: 'no_level_up_available', message: 'Персонаж ещё не готов к повышению уровня.' });
  }

  const classFeatures = (levelRef?.features ?? []).map((featureId) => toFeatureGrant(featureId, 'class'));
  const needSubclassChoice = Boolean(levelRef?.subclassChoice) && !draft.selectedSubclassId && !character.selectedSubclassId;
  const subclassOptions = subclasses
    .filter((subclass) => subclass.classId === draft.targetClassId)
    .map((subclass) => evaluateSubclassAvailability(character, subclass, targetClassLevel, draft));

  if (needSubclassChoice) {
    blockedOptions.push({ code: 'subclass_not_selected', message: 'Подкласс ещё не выбран' });
  }

  const effectiveSubclassId = draft.selectedSubclassId ?? (character.heroClass === draft.targetClassId ? character.selectedSubclassId ?? character.subclass?.toLowerCase().replace(/\s+/g, '-') : undefined);
  const subclassFeatures = effectiveSubclassId
    ? (subclasses.find((item) => item.id === effectiveSubclassId)?.featuresByLevel[targetClassLevel] ?? []).map((featureId) => ({ id: featureId, name: featureId, description: 'Особенность подкласса.', sourceType: 'subclass' as const }))
    : [];

  const featOptions = feats.map((feat) => evaluateFeatAvailability(character, feat, campaign));
  const multiclassOptions = multiclassRules.map((rule) => evaluateMulticlassAvailability(character, rule));
  const spellOptions = getSelectableSpells(draft.targetClassId, levelRef, campaign);
  const missingSelections: string[] = [];

  if (levelRef?.asi && !draft.selectedFeatId && !draft.selectedAbilityIncrease) {
    missingSelections.push('Выберите ASI или feat');
  }
  if (needSubclassChoice) {
    missingSelections.push('Выберите подкласс');
  }
  if ((levelRef?.spellChoices ?? 0) > 0 && draft.selectedSpellIds.length === 0 && spellOptions.length > 0) {
    missingSelections.push(`Выберите ${levelRef?.spellChoices} заклинания`);
  }

  const summary = [
    `${character.name}: ${character.level} → ${character.level + 1} уровень`,
    draft.isMulticlass ? `Мультикласс в ${draft.targetClassId}` : `Продолжение класса ${draft.targetClassId}`,
    classFeatures.length ? `Классовые особенности: ${classFeatures.map((item) => item.name).join(', ')}` : 'Новых классовых особенностей нет.',
    subclassFeatures.length ? `Подкласс: ${subclassFeatures.map((item) => item.name).join(', ')}` : 'Новых особенностей подкласса нет.',
    levelRef?.asi ? 'Открыто окно ASI / feat.' : 'ASI / feat на этом уровне нет.',
    spellOptions.length ? `Доступны заклинания: ${spellOptions.map(({ item }) => item.name).join(', ')}` : 'Новых заклинаний нет.',
    multiclassOptions.some((option) => option.available) ? `Доступны мультиклассы: ${multiclassOptions.filter((option) => option.available).map((option) => option.item.classId).join(', ')}` : 'Доступных мультиклассов нет.',
  ];

  return {
    currentLevel: character.level,
    targetCharacterLevel: character.level + 1,
    targetClassId: draft.targetClassId,
    targetClassLevel,
    isMulticlass: draft.isMulticlass,
    classFeatures,
    subclassFeatures,
    spells: spellOptions,
    feats: featOptions,
    asi: { available: Boolean(levelRef?.asi), points: levelRef?.asi ? 2 : 0 },
    subclassOptions,
    multiclassOptions,
    blockedOptions,
    missingSelections,
    summary,
  };
}

export function startLevelUp(character: CharacterSnapshot, campaign: CampaignConfig, targetClassId?: string): LevelUpDraft {
  const progression = deriveCharacterProgression(character, campaign, null);
  const currentClassId = character.heroClass;
  const draft: LevelUpDraft = {
    characterId: character.id,
    status: 'draft',
    targetClassId: targetClassId ?? currentClassId,
    isMulticlass: Boolean(targetClassId && targetClassId !== currentClassId),
    selectedSpellIds: [],
    selectedCantripIds: [],
    selectedChoices: [],
  };
  draft.previewSnapshot = buildLevelUpPreview(character, campaign, draft);
  if (!progression.canLevelUp && campaign.progressionMode !== 'milestone') {
    draft.previewSnapshot.blockedOptions.push({ code: 'no_level_up_available', message: 'Недостаточно XP для начала прокачки.' });
  }
  return draft;
}

export function confirmLevelUp(character: CharacterSnapshot, campaign: CampaignConfig, draft: LevelUpDraft): CharacterSnapshot {
  const preview = buildLevelUpPreview(character, campaign, draft);
  if (preview.blockedOptions.length || preview.missingSelections.length) {
    throw new Error(`Level up is incomplete: ${[...preview.blockedOptions.map((item) => item.message), ...preview.missingSelections].join('; ')}`);
  }
  const classLevels = getCharacterClassLevels(character);
  const existing = classLevels.find((item) => item.classId === draft.targetClassId);
  const nextClassLevels = existing
    ? classLevels.map((item) => item.classId === draft.targetClassId ? { ...item, level: item.level + 1 } : item)
    : [...classLevels, { classId: draft.targetClassId, level: 1 }];
  const featuresText = [character.features, ...preview.classFeatures.map((item) => item.name), ...preview.subclassFeatures.map((item) => item.name)].filter(Boolean).join('\n');
  const featsText = draft.selectedFeatId
    ? [character.feats, feats.find((item) => item.id === draft.selectedFeatId)?.name].filter(Boolean).join('\n')
    : character.feats;
  const spellsText = draft.selectedSpellIds.length
    ? [character.spells, ...draft.selectedSpellIds.map((spellId) => spells.find((item) => item.id === spellId)?.name ?? spellId)].filter(Boolean).join(', ')
    : character.spells;
  return {
    ...character,
    level: character.level + 1,
    heroClass: draft.isMulticlass ? character.heroClass : draft.targetClassId,
    subclass: draft.selectedSubclassId ? subclasses.find((item) => item.id === draft.selectedSubclassId)?.name ?? character.subclass : character.subclass,
    selectedSubclassId: draft.selectedSubclassId ?? character.selectedSubclassId,
    classLevels: nextClassLevels,
    takenFeatIds: draft.selectedFeatId ? Array.from(new Set([...(character.takenFeatIds ?? []), draft.selectedFeatId])) : character.takenFeatIds,
    knownSpellIds: Array.from(new Set([...(character.knownSpellIds ?? []), ...draft.selectedSpellIds, ...draft.selectedCantripIds])),
    features: featuresText,
    feats: featsText,
    spells: spellsText,
  };
}

export function applyXp(character: CharacterSnapshot, campaign: CampaignConfig, xpDelta: number) {
  const nextCharacter = { ...character, experience: Math.max(0, (character.experience ?? 0) + xpDelta) };
  return {
    character: nextCharacter,
    progression: deriveCharacterProgression(nextCharacter, campaign),
  };
}

export function getProgressionOptions(character: CharacterSnapshot, campaign: CampaignConfig) {
  const progression = deriveCharacterProgression(character, campaign, null);
  const currentClassId = character.heroClass;
  const baseDraft = startLevelUp(character, campaign, currentClassId);
  const currentClassPreview = buildLevelUpPreview(character, campaign, baseDraft);
  return {
    progression,
    continueClass: currentClassPreview,
    multiclassOptions: multiclassRules.map((rule) => evaluateMulticlassAvailability(character, rule)),
  };
}
