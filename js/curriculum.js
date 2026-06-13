import { units as petUnits } from './data/units.js';
import { store } from './store.js';

export const BUILT_IN_ID = '__pet__';

function normalizeGenQ(q, unitId, levelKey, idx) {
  const id = `gen-${unitId}-${levelKey}-${idx}`;
  const base = {
    id, type: q.type,
    instruction: q.instruction || '',
    explanation: q.explanation || '',
    subSkill: q.subSkill || '',
  };
  switch (q.type) {
    case 'choice':
      return { ...base, sentence: q.sentence || '', options: q.options || [], correctIndex: q.correctIndex ?? 0 };
    case 'scenario':
      return { ...base, context: q.context || '', dialogue: q.dialogue || [], options: q.options || [], correctIndex: q.correctIndex ?? 0 };
    case 'fill': {
      const aa = q.acceptableAnswers?.length ? q.acceptableAnswers : q.answer ? [q.answer] : [];
      return { ...base, sentence: q.sentence || '', hint: q.hint || '', acceptableAnswers: aa, correctAnswer: aa[0] || '' };
    }
    case 'reorder':
      return { ...base, words: q.words || [], correctSentence: q.correctSentence ?? '' };
    case 'error':
      return { ...base, words: q.words ?? q.sentence ?? [], errorIndex: q.errorIndex ?? 0, correction: q.correction || '' };
    case 'match': {
      const left = q.left || [];
      const right = q.right || [];
      const raw = q.correctPairs || [];
      const correctPairs = raw.map(p => typeof p[0] === 'number' ? [left[p[0]], right[p[1]]] : p);
      return { ...base, left, right, correctPairs };
    }
    default:
      return { ...base, ...q, id };
  }
}

function buildUnitsFromCurriculum(curr) {
  const result = {};
  const syllabus = curr.syllabus || [];
  const ud = curr.unitsData || {};

  for (let i = 0; i < syllabus.length && i < 12; i++) {
    const s = syllabus[i];
    const uid = i + 1;
    const gen = ud[uid];

    if (gen) {
      const levels = {};
      const raw = gen.levels || {};
      for (const lk of Object.keys(raw)) {
        const arr = Array.isArray(raw[lk]) ? raw[lk] : raw[lk]?.questions || [];
        levels[lk] = { questions: arr.map((q, idx) => normalizeGenQ(q, uid, lk, idx)) };
      }
      result[uid] = {
        id: uid,
        title: s.title || `Unit ${uid}`,
        description: s.description || '',
        icon: '📘',
        discover: gen.discover || { story: { title: s.title, text: '', highlights: [] }, questions: [], tip: '' },
        levels,
        mission: gen.mission || { title: '', description: '', scaffolds: [], grammarType: (s.skills || [])[0] || '' },
        badge: { name: `Unit ${uid}`, icon: '🏅', description: '' },
      };
    } else {
      result[uid] = {
        id: uid,
        title: s.title || `Unit ${uid}`,
        description: s.description || '',
        icon: '📘',
        discover: { story: { title: s.title, text: '', highlights: [] }, questions: [], tip: '' },
        levels: {},
        mission: { title: '', description: '', scaffolds: [], grammarType: '' },
        badge: { name: `Unit ${uid}`, icon: '🏅', description: '' },
        _needsGeneration: true,
      };
    }
  }
  return result;
}

export const curriculum = {
  getUnits() {
    if (this.isBuiltIn()) return petUnits;
    const id = store.state.activeCurriculumId;
    const curr = store.state.curricula?.[id];
    if (!curr) return petUnits;
    return buildUnitsFromCurriculum(curr);
  },

  getUnit(uid) {
    return this.getUnits()[uid] || null;
  },

  isBuiltIn() {
    const id = store.state.activeCurriculumId;
    return !id || id === BUILT_IN_ID;
  },

  getActiveId() {
    return store.state.activeCurriculumId || BUILT_IN_ID;
  },

  getActiveTitle() {
    if (this.isBuiltIn()) return 'PET 语法训练';
    const id = store.state.activeCurriculumId;
    return store.state.curricula?.[id]?.title || '自定义课程';
  },

  isUnitGenerated(uid) {
    if (this.isBuiltIn()) return true;
    const id = store.state.activeCurriculumId;
    return !!store.state.curricula?.[id]?.unitsData?.[uid];
  },

  saveUnitData(uid, data) {
    const id = store.state.activeCurriculumId;
    if (!id || id === BUILT_IN_ID) return;
    const curr = store.state.curricula?.[id];
    if (!curr) return;
    if (!curr.unitsData) curr.unitsData = {};
    curr.unitsData[uid] = data;
    store.save();
  },

  listAll() {
    const list = [{ id: BUILT_IN_ID, title: 'PET 语法训练', description: '内置 PET 考试语法训练课程', builtIn: true }];
    const cc = store.state.curricula || {};
    for (const [id, c] of Object.entries(cc)) {
      if (id === BUILT_IN_ID) continue;
      list.push({ id, title: c.title || '自定义课程', description: c.description || '', builtIn: false });
    }
    return list;
  },
};
