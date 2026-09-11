// 随代码发布、所有人打开就能用的课程。
//
// 为什么放代码里而不是灌进用户的 localStorage：
// 这些内容对每个用户都一模一样。复制进 state.curricula 的话，每次 save()
// 都要序列化几百 KB，每次云端同步都要把同样的内容再传一遍——纯属浪费，
// 而且会把 Supabase 的同步体积推到危险区间。
// 用户那边只存自己的学习进度（switchCurriculum 已经按 id 分别保存）。
//
// 加一套新课程：把「家长专区 → 导出」产出的 .json 转成 js/data/courses/xxx.js，
// 在下面数组里加一条即可。

import { units as petUnits } from './units.js';
import { course as ielts6 } from './courses/ielts6.js';
import { course as ielts7 } from './courses/ielts7.js';

export const BUILT_IN_ID = '__pet__';

// PET 是最早的内置课程，数据形状和后来的不同（已经是展开好的 units），
// 所以用 units 字段直接给出；其余课程用 syllabus + unitsData。
export const BUILTIN_COURSES = [
  {
    id: BUILT_IN_ID,
    title: 'PET 语法训练',
    description: '内置 PET 考试语法训练课程',
    goal: '剑桥 PET 语法（CEFR B1）',
    cefr: 'B1',
    units: petUnits,
  },
  {
    id: ielts6.id,
    title: ielts6.title,
    description: ielts6.description,
    goal: ielts6.goal,
    cefr: ielts6.cefr,
    syllabus: ielts6.syllabus,
    unitsData: ielts6.unitsData,
  },
  {
    id: ielts7.id,
    title: ielts7.title,
    description: ielts7.description,
    goal: ielts7.goal,
    cefr: ielts7.cefr,
    syllabus: ielts7.syllabus,
    unitsData: ielts7.unitsData,
  },
];

const BY_ID = Object.fromEntries(BUILTIN_COURSES.map((c) => [c.id, c]));

export function getBuiltinCourse(id) {
  return BY_ID[id] || null;
}

export function isBuiltinId(id) {
  return Boolean(BY_ID[id || BUILT_IN_ID]);
}
