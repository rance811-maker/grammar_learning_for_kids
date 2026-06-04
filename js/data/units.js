// Grammar Quest - Normalized Unit Data
//
// The raw unit batches (units-01-03.js ... units-10-12.js) are authored in a
// compact format. This module normalizes them into the exact shape the engine
// and views expect:
//   - `units` is an OBJECT keyed by unit id (not an array)
//   - practice questions live under `unit.levels[n].questions`
//   - every question carries a stable `id`
//   - per-type field names are unified (correctIndex / correctSentence / words / text-pairs)
//   - discover.story is an object { title, text, highlights }
//   - mission exposes a single `grammarType` plus normalized scaffolds
//
// The normalizers are intentionally defensive: they accept either the raw field
// name or the already-normalized one, so the app keeps working even if a batch
// is authored slightly differently.

import { unitsBatch as batch1 } from './units-01-03.js';
import { unitsBatch as batch2 } from './units-04-06.js';
import { unitsBatch as batch3 } from './units-07-09.js';
import { unitsBatch as batch4 } from './units-10-12.js';

const RAW_UNITS = [...batch1, ...batch2, ...batch3, ...batch4];

function isPlayerSpeaker(speaker) {
  return /^(you|player|me)$/i.test(String(speaker || '').trim());
}

function normalizeQuestion(q, id) {
  const base = {
    id,
    type: q.type,
    instruction: q.instruction || '',
    explanation: q.explanation || '',
    subSkill: q.subSkill || '',
  };

  switch (q.type) {
    case 'choice':
      return {
        ...base,
        sentence: q.sentence || '',
        options: q.options || [],
        correctIndex: q.correctIndex ?? q.correct ?? 0,
      };

    case 'scenario':
      return {
        ...base,
        context: q.context || '',
        dialogue: (q.dialogue || []).map((d) => ({
          speaker: isPlayerSpeaker(d.speaker) ? 'player' : d.speaker,
          text: d.text || '',
        })),
        options: q.options || [],
        correctIndex: q.correctIndex ?? q.correct ?? 0,
      };

    case 'reorder':
      return {
        ...base,
        words: q.words || [],
        correctSentence: q.correctSentence ?? q.correct ?? '',
      };

    case 'error':
      // The view renders `words`; raw data stores the word array under `sentence`.
      return {
        ...base,
        words: q.words ?? q.sentence ?? [],
        errorIndex: q.errorIndex ?? 0,
        correction: q.correction || '',
      };

    case 'match': {
      const left = q.left || [];
      const right = q.right || [];
      const rawPairs = q.correctPairs || [];
      // The engine compares text pairs; raw data may use [leftIndex, rightIndex].
      const correctPairs = rawPairs.map((p) => {
        if (typeof p[0] === 'number') return [left[p[0]], right[p[1]]];
        return p;
      });
      return { ...base, left, right, correctPairs };
    }

    case 'fill': {
      const acceptableAnswers =
        q.acceptableAnswers && q.acceptableAnswers.length
          ? q.acceptableAnswers
          : q.answer
          ? [q.answer]
          : [];
      return {
        ...base,
        sentence: q.sentence || '',
        hint: q.hint || '',
        acceptableAnswers,
        correctAnswer: acceptableAnswers[0] || '',
      };
    }

    default:
      return { ...base, ...q };
  }
}

function normalizeDiscover(raw, unitTitle) {
  const d = raw || {};
  return {
    story: {
      title: d.storyTitle ?? d.story?.title ?? unitTitle,
      text: typeof d.story === 'string' ? d.story : d.story?.text ?? '',
      highlights: d.highlightWords ?? d.story?.highlights ?? [],
    },
    questions: (d.questions || []).map((q) => ({
      question: q.question || '',
      options: q.options || [],
      correctIndex: q.correctIndex ?? q.correct ?? 0,
      explanation: q.explanation || '',
    })),
    tip: d.tip ?? d.grammarTip ?? '',
  };
}

function normalizeMission(raw) {
  const m = raw || {};
  const scaffolds = (m.scaffolds || []).map((s) => ({
    prefix: s.prefix || '',
    suffix: s.suffix || '',
    hint: s.hint || '',
    grammarCheck: s.grammarCheck || '',
    example: s.example || '',
  }));
  return {
    title: m.title || '',
    description: m.description ?? m.taskDescription ?? '',
    icon: m.icon || '🎯',
    scenario: m.scenario || '',
    grammarType: m.grammarType ?? scaffolds[0]?.grammarCheck ?? '',
    scaffolds,
    completionMessage: m.completionMessage || '',
  };
}

function normalizeUnit(raw) {
  const levels = {};
  const practice = raw.practice || {};
  for (const levelKey of Object.keys(practice)) {
    const questions = (practice[levelKey] || []).map((q, i) =>
      normalizeQuestion(q, `${raw.id}-${levelKey}-${i}`)
    );
    levels[levelKey] = { questions };
  }

  return {
    id: raw.id,
    title: raw.title || `Unit ${raw.id}`,
    description: raw.description || '',
    icon: raw.icon || '📘',
    discover: normalizeDiscover(raw.discover, raw.title),
    levels,
    mission: normalizeMission(raw.mission),
    badge: raw.badge || {
      name: `Unit ${raw.id}`,
      icon: '🏅',
      description: '',
    },
  };
}

export const units = {};
for (const raw of RAW_UNITS) {
  units[raw.id] = normalizeUnit(raw);
}

export default units;
