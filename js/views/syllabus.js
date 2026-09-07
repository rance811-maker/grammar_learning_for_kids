import { store } from '../store.js';
import { curriculum, BUILT_IN_ID } from '../curriculum.js';
import { SUB_SKILL_NAMES } from '../data/skill-names.js';

// 语法提纲：把这套课程"到底教哪些语法点、按什么顺序教"摊开给家长看。
//
// 为什么要有这一页：首页只显示一个课程名字（比如"学习雅思6分水平所需的语法知识"），
// 家长无从判断这套 AI 生成的东西到底靠不靠谱。把 12 个单元、每个单元的子技能、
// 以及孩子在每个单元的进度列出来，才谈得上信任。

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function skillLabel(id) {
  if (!id) return '';
  return SUB_SKILL_NAMES[id] || id.replace(/_/g, ' ');
}

/** 内置课程没有 syllabus 字段，从单元题目里把用到的 subSkill 收集出来。 */
function skillsFromUnit(unitData) {
  const seen = new Set();
  for (const lv of Object.values(unitData?.levels || {})) {
    for (const q of lv.questions || []) {
      if (q.subSkill) seen.add(q.subSkill);
    }
  }
  for (const q of unitData?.discover?.questions || []) {
    if (q.subSkill) seen.add(q.subSkill);
  }
  return [...seen];
}

/** 把课程统一成一份提纲：[{ id, title, description, skills, generated }] */
function buildOutline() {
  const units = curriculum.getUnits();
  const isBuiltIn = curriculum.isBuiltIn();
  const currId = curriculum.getActiveId();
  const curr = isBuiltIn ? null : store.state.curricula?.[currId];
  const syllabus = curr?.syllabus || [];

  const ids = Object.keys(units).map(Number).sort((a, b) => a - b);
  return ids.map((uid, i) => {
    const u = units[uid];
    const s = syllabus[i] || {};
    return {
      id: uid,
      title: s.title || u.title || `Unit ${uid}`,
      description: s.description || u.description || '',
      skills: (s.skills && s.skills.length ? s.skills : skillsFromUnit(u)),
      generated: isBuiltIn || !u._needsGeneration,
    };
  });
}

/** 孩子在这个单元的进度：完成的关卡数 / 总关卡数，以及写作任务是否做过。 */
function unitProgress(uid) {
  const st = store.state.units[uid];
  if (!st) return { done: 0, total: 0, mission: false, locked: true };
  const levels = Object.values(st.practiceLevels || {});
  return {
    done: levels.filter((lv) => lv.completed).length,
    total: levels.length,
    mission: !!st.missionCompleted,
    locked: !st.unlocked,
  };
}

export function render() {
  const title = curriculum.getActiveTitle();
  const isBuiltIn = curriculum.isBuiltIn();
  const currId = curriculum.getActiveId();
  const curr = isBuiltIn ? null : store.state.curricula?.[currId];
  const cefr = curr?.profile?.cefr || (isBuiltIn ? 'B1' : '');
  const goal = curr?.goal || '';
  const outline = buildOutline();

  const generatedCount = outline.filter((o) => o.generated).length;

  const rows = outline.map((o) => {
    const p = unitProgress(o.id);
    const chips = o.skills.length
      ? `<div class="syl-item__skills">${o.skills
          .map((s) => `<span class="syl-chip">${esc(skillLabel(s))}</span>`)
          .join('')}</div>`
      : '';

    let statusHtml;
    if (!o.generated) {
      statusHtml = '<span class="syl-item__status syl-item__status--pending">待生成</span>';
    } else if (p.total && p.done === p.total && p.mission) {
      statusHtml = '<span class="syl-item__status syl-item__status--done">已完成</span>';
    } else if (p.done > 0) {
      statusHtml = `<span class="syl-item__status">${p.done}/${p.total} 关</span>`;
    } else {
      statusHtml = `<span class="syl-item__status syl-item__status--todo">${p.locked ? '未解锁' : '未开始'}</span>`;
    }

    const clickable = o.generated && !p.locked;
    return `
      <div class="syl-item${clickable ? ' syl-item--link' : ''}" ${clickable ? `data-unit-id="${o.id}"` : ''}>
        <div class="syl-item__head">
          <span class="syl-item__no">Unit ${o.id}</span>
          ${statusHtml}
        </div>
        <div class="syl-item__title">${esc(o.title)}</div>
        ${o.description ? `<div class="syl-item__desc">${esc(o.description)}</div>` : ''}
        ${chips}
      </div>`;
  }).join('');

  return `
    <div class="view view-syllabus">
      <div class="card mb-md">
        <div class="syl-head__title">📚 ${esc(title)}</div>
        <div class="syl-head__meta">
          ${cefr ? `<span class="badge">CEFR ${esc(cefr)}</span>` : ''}
          <span class="badge">${outline.length} 个单元</span>
          <span class="badge">已生成 ${generatedCount}/${outline.length}</span>
        </div>
        ${goal ? `<div class="syl-head__goal">学习目标：${esc(goal)}</div>` : ''}
      </div>

      <div class="syl-list">${rows}</div>

      <div class="card mt-md syl-note">
        <div class="syl-note__title">关于这份提纲</div>
        <p>
          这是一份对照 ${cefr ? `CEFR ${esc(cefr)} ` : 'CEFR '}等级、参考剑桥英语语法纲要（English Grammar Profile）
          编排的<strong>语法教学提纲</strong>，由 AI 依据你设定的学习目标生成，并按从基础到进阶排序。
        </p>
        <p>
          需要说明的是：<strong>它不是官方考纲</strong>。剑桥并不公布固定的语法清单，
          任何声称"覆盖官方考点百分之多少"的说法都不成立。这份提纲的作用是让你看清孩子在练什么、
          按什么顺序练，而不是替代考试大纲。
        </p>
        ${isBuiltIn ? '' : '<p>觉得编排不合适，可以到「家长专区 → 创建课程」重新生成一套。</p>'}
      </div>
    </div>`;
}

export function mount() {
  document.querySelectorAll('.syl-item--link').forEach((el) => {
    el.addEventListener('click', () => {
      const uid = el.dataset.unitId;
      if (uid) location.hash = `unit/${uid}`;
    });
  });
}
