// 未登录时看到的「示例数据」。
//
// 网站改成注册后才能用：没登录的人能逛，但看到的进度、错题、作品都是这里编的一位
// 「示例同学」（学了 10 天、连续 6 天），每一页顶上都有横条说明这是示例。
// 三套内置课程各编一份，首页切课程时看到的也是那套课的示例。
//
// 这份数据只在内存里：从不写进 localStorage、不上传云端（见 store.js 的 state getter）。
// 以前没注册就做过练习的人，本机真实进度原样留着，注册时带进新账号。

import { curriculum } from './curriculum.js';
import { BUILTIN_COURSES, BUILT_IN_ID } from './data/builtinCourses.js';

export const DEMO_NAME = '示例同学';

function dayOffset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 每门课第 1 单元写作任务的示例作品（和该单元的写作要求对得上）
const SAMPLE_ESSAYS = {
  [BUILT_IN_ID]: 'Every morning, I wake up at half past six and have breakfast with my family. '
    + 'After school, I usually play basketball with my friends. '
    + 'Right now, I am sitting in my room and finishing my English homework.',
  'preset-ielts6': 'Every day, I read for thirty minutes before bed. '
    + 'Last weekend, I visited my grandparents and learned to make dumplings. '
    + 'Next summer, I will travel to Yunnan with my cousins.',
  'preset-ielts7': "Young people's relationship with cooking has changed enormously. "
    + 'Since food delivery apps became widespread, many students in my city have stopped cooking for themselves. '
    + 'By the time my grandparents were twenty, they had already been cooking for their families for years. '
    + 'If this trend continues, basic cooking skills will have become surprisingly rare by 2040.',
};

// 练习记录：[几天前, 单元, 关, 星, 答对, 共几题]。最近 6 天天天有练习（连续 6 天），7 天前断过一次。
// 星数按真实规则：全对 3 星，错 1–2 题 2 星，错到第 3 题这一轮结束、0 星。
const SESSIONS = [
  [-9, 1, 1, 3, 8, 8],
  [-8, 1, 2, 3, 8, 8],
  [-7, 1, 3, 2, 6, 8],
  [-5, 1, 4, 3, 8, 8],
  [-5, 1, 5, 2, 6, 8],
  [-4, 2, 1, 3, 8, 8],
  [-3, 2, 2, 2, 6, 8],
  [-2, 2, 3, 0, 2, 5],
  [-1, 2, 4, 0, 3, 6],
  [-1, 2, 3, 2, 6, 8],
  [0, 3, 1, 2, 6, 8],
];

function sessionScore(stars, correct) {
  return correct * 10 + stars * 5;
}

function buildProgress(courseId, createDefaultState) {
  const base = createDefaultState();
  const units = base.units;
  const allUnits = curriculum.getUnitsOf(courseId);

  // 关卡星数：每关取最好成绩
  for (const [, u, lv, stars] of SESSIONS) {
    const p = units[u].practiceLevels[lv];
    p.attempted = true;
    if (stars >= 1) p.completed = true;
    p.bestStars = Math.max(p.bestStars, stars);
  }
  // 解锁关系和真实规则一致：过了一关解锁下一关，过了 Lv.3 解锁下一单元
  for (let u = 1; u <= 3; u++) {
    units[u].unlocked = true;
    units[u].discoverCompleted = true;
    const lvs = units[u].practiceLevels;
    lvs[1].unlocked = true;
    for (let lv = 1; lv < 5; lv++) if (lvs[lv].bestStars >= 1) lvs[lv + 1].unlocked = true;
  }
  const essay = SAMPLE_ESSAYS[courseId] || SAMPLE_ESSAYS[BUILT_IN_ID];
  const mission1 = allUnits[1]?.mission || {};
  units[1].missionCompleted = true;
  units[1].missionContent = essay;
  units[1].badgeEarned = true;

  const history = SESSIONS.map(([off, u, lv, stars, correct, total]) => ({
    unitId: u, level: lv, score: sessionScore(stars, correct), stars, correct, total,
    accuracy: correct / total, maxCombo: Math.min(correct, stars === 3 ? correct : 4), date: dayOffset(off),
  }));

  // 掌握度：第 1–3 单元练过的语法点，前面的单元掌握得好一些
  const mastery = {};
  let k = 0;
  for (let u = 1; u <= 3; u++) {
    const levels = allUnits[u]?.levels || {};
    for (let lv = 1; lv <= (u === 3 ? 1 : 5); lv++) {
      for (const q of levels[lv]?.questions || []) {
        if (!q.subSkill || mastery[q.subSkill]) continue;
        const attempts = 4 + (k % 4);
        const rate = [0.92, 0.83, 0.75, 0.67, 0.58, 0.5][(k + u) % 6] - (u - 1) * 0.04;
        const correct = Math.max(1, Math.round(attempts * rate));
        mastery[q.subSkill] = {
          attempts, correct, mastery: correct / attempts, lastSeen: dayOffset(-(k % 6)),
          errorCount: attempts - correct, reviewInterval: correct / attempts > 0.8 ? 4 : 1,
        };
        k++;
      }
    }
  }

  // 错题本：从第 1–3 单元练过的关里挑 5 道真题
  const mistakes = [];
  const picks = [[1, 3], [2, 2], [2, 3], [2, 4], [3, 1]];
  picks.forEach(([u, lv], i) => {
    const qs = allUnits[u]?.levels?.[lv]?.questions || [];
    const q = qs.find((x) => (x.type === 'choice' || x.type === 'fill') && /_/.test(x.sentence || '')) || qs[0];
    if (q) mistakes.push({ question: q, unitId: u, level: lv, date: dayOffset(-(picks.length - 1 - i)) });
  });

  // 学习计划：摸底时第 1 单元答对，计划从第 2 单元排起；已完成 4 天
  const sessions = [];
  let id = 1;
  for (const u of [2, 3, 4]) {
    for (let lv = 1; lv <= 3; lv++) {
      sessions.push({ id, label: `第${id}天`, unitId: u, level: lv, type: 'practice', completed: id <= 4 });
      id++;
    }
  }
  sessions.push({ id: 10, label: '第10天', unitId: null, level: null, type: '综合测试', completed: false });

  return {
    units,
    mastery,
    history,
    mistakes,
    badges: [{ id: 'unit_1_complete', unitId: 1, name: 'Unit 1 Master', date: dayOffset(-5) }],
    portfolio: [{ unitId: 1, title: mission1.title || 'Unit 1 作品', content: essay, grammarType: mission1.grammarType || '', date: dayOffset(-5) }],
    learningPlan: {
      totalSessions: 10, completedSessions: 4, sessions,
      masteredUnits: [1], weakUnits: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], certificateEarned: false,
    },
    placementCompleted: true,
    bossCleared: false,
    bossBestAccuracy: 0,
    reviewCleared: [],
    reviewShown: [],
    practiceShown: [],
    variants: {},
  };
}

/**
 * 造一份完整的示例存档。createDefaultState 由 store.js 传进来（避免循环依赖里拿到未初始化的函数）。
 * 默认在 PET 课程上；另外两套内置课的示例进度放在 curricula 里，首页切课程时由 switchCurriculum 换上。
 */
export function buildDemoState(createDefaultState) {
  const state = createDefaultState();
  const pet = buildProgress(BUILT_IN_ID, createDefaultState);
  Object.assign(state, pet);
  const totalScore = pet.history.reduce((s, h) => s + h.score, 0);
  state.player = { name: DEMO_NAME, totalScore, currentStreak: 6, lastPracticeDate: dayOffset(0), rank: 'bronze' };
  state.startedAt = dayOffset(-9);
  state.activeCurriculumId = null;
  state.curricula = {};
  for (const c of BUILTIN_COURSES) {
    if (c.id === BUILT_IN_ID) continue;
    state.curricula[c.id] = { progress: buildProgress(c.id, createDefaultState) };
  }
  return state;
}
