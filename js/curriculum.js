import { store } from './store.js';
import { BUILT_IN_ID, BUILTIN_COURSES, getBuiltinCourse, isBuiltinId } from './data/builtinCourses.js';

export { BUILT_IN_ID };

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
      return { ...base, sentence: q.sentence || '', options: q.options || [], correctIndex: Number(q.correctIndex ?? 0) };
    case 'scenario':
      return { ...base, context: q.context || '', dialogue: q.dialogue || [], options: q.options || [], correctIndex: Number(q.correctIndex ?? 0) };
    case 'fill': {
      const aa = q.acceptableAnswers?.length ? q.acceptableAnswers : q.answer ? [q.answer] : q.correctAnswer ? [q.correctAnswer] : [];
      return { ...base, sentence: q.sentence || '', hint: q.hint || '', acceptableAnswers: aa, correctAnswer: aa[0] || '' };
    }
    case 'reorder':
      return { ...base, words: q.words || [], correctSentence: q.correctSentence ?? '' };
    case 'error':
      return { ...base, words: q.words ?? q.sentence ?? [], errorIndex: Number(q.errorIndex ?? 0), correction: q.correction || '' };
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
    return this.getUnitsOf(this.getActiveId());
  },

  /** 取任意一套课程的单元，不受"当前激活的是哪套"影响。 */
  getUnitsOf(id) {
    const b = getBuiltinCourse(id);
    if (b) return b.units || buildUnitsFromCurriculum(b);
    const curr = store.state.curricula?.[id];
    if (!curr) return getBuiltinCourse(BUILT_IN_ID).units;
    return buildUnitsFromCurriculum(curr);
  },

  getUnit(uid) {
    return this.getUnits()[uid] || null;
  },

  isBuiltIn(id) {
    return isBuiltinId(id === undefined ? store.state.activeCurriculumId : id);
  },

  getActiveId() {
    return store.state.activeCurriculumId || BUILT_IN_ID;
  },

  getActiveTitle() {
    const id = this.getActiveId();
    const b = getBuiltinCourse(id);
    if (b) return b.title;
    return store.state.curricula?.[id]?.title || '自定义课程';
  },

  /** 课程的 CEFR 等级（语法提纲页要用）。自定义课程从 profile 里取。 */
  getCefrOf(id) {
    const b = getBuiltinCourse(id);
    if (b) return b.cefr || '';
    return store.state.curricula?.[id]?.profile?.cefr || '';
  },

  /** 课程大纲。内置课程直接有；PET 没有，返回空数组让调用方从题目里推。 */
  getSyllabusOf(id) {
    const b = getBuiltinCourse(id);
    if (b) return b.syllabus || [];
    return store.state.curricula?.[id]?.syllabus || [];
  },

  getGoalOf(id) {
    const b = getBuiltinCourse(id);
    if (b) return b.goal || '';
    return store.state.curricula?.[id]?.goal || '';
  },

  isUnitGenerated(uid) {
    if (this.isBuiltIn()) return true;
    const id = store.state.activeCurriculumId;
    return !!store.state.curricula?.[id]?.unitsData?.[uid];
  },

  saveUnitData(uid, data) {
    const id = store.state.activeCurriculumId;
    if (!id || isBuiltinId(id)) return;   // 内置课程是只读的
    const curr = store.state.curricula?.[id];
    if (!curr) return;
    if (!curr.unitsData) curr.unitsData = {};
    curr.unitsData[uid] = data;
    store.save();
  },

  listAll() {
    const list = BUILTIN_COURSES.map((c) => ({
      id: c.id, title: c.title, description: c.description || '', builtIn: true,
    }));
    const cc = store.state.curricula || {};
    for (const [id, c] of Object.entries(cc)) {
      if (isBuiltinId(id)) continue;   // 内置课程在 curricula 里只存进度，不算一套课
      list.push({ id, title: c.title || '自定义课程', description: c.description || '', builtIn: false });
    }
    return list;
  },
};
