import { curriculum } from './curriculum.js';
import { store } from './store.js';

const PROVIDERS = {
  gemini: { keyStorageKey: 'gq-ai-key-gemini' },
  claude: { keyStorageKey: 'gq-ai-key-claude' },
};

function getProvider() {
  try { return localStorage.getItem('gq-ai-provider') || 'gemini'; } catch { return 'gemini'; }
}

function getAiKey() {
  const p = getProvider();
  const info = PROVIDERS[p];
  if (!info) return null;
  if (p === 'gemini') {
    try {
      const old = localStorage.getItem('gq-ai-key');
      if (old && !localStorage.getItem(info.keyStorageKey)) {
        localStorage.setItem(info.keyStorageKey, old);
        localStorage.removeItem('gq-ai-key');
      }
    } catch { /* */ }
  }
  try { return localStorage.getItem(info.keyStorageKey); } catch { return null; }
}

export function hasApiKey() { return !!getAiKey(); }

const SYLLABUS_PROMPT = `You are an English language education expert designing curricula for Chinese students (elementary school, grades 3-6).

Based on the learning goal, create a 12-unit curriculum syllabus. Units progress from basic to advanced within the topic scope.

Return a JSON array of exactly 12 objects:
- "title": Grammar/skill topic in English (e.g. "Present Simple Tense")
- "description": Brief Chinese description (e.g. "一般现在时的基本用法")
- "skills": Array of 3-5 sub-skill identifiers in snake_case (e.g. ["third_person_s","negative_forms"])

Return ONLY the JSON array, no markdown code blocks, no other text.`;

const UNIT_PROMPT = `You are an English language education expert. Generate practice content for one unit of a curriculum for Chinese students (elementary grades 3-6).

Generate the following for the given unit topic:

1. "discover": A learning story section:
   - "story": { "title": string, "text": string (150-250 word English story demonstrating the grammar), "highlights": [key grammar words] }
   - "questions": array of 3 objects { "question": string, "options": [4 strings], "correctIndex": number, "explanation": string (Chinese) }
   - "tip": string (a concise Chinese grammar tip)

2. "levels": An object with keys "1" through "5", each is an array of 8 practice questions. Progressively harder:
   - Level 1: Mostly "choice" (easy recognition)
   - Level 2: "choice" + "fill"
   - Level 3: "fill" + "reorder"
   - Level 4: "choice" + "fill" + "error"
   - Level 5: Mixed types, harder

Question formats:
- choice: { "type":"choice", "instruction":"(Chinese)", "sentence":"She ___ to school.", "options":["go","goes","going","went"], "correctIndex":1, "explanation":"(Chinese)", "subSkill":"skill_id" }
- fill: { "type":"fill", "instruction":"(Chinese)", "sentence":"He (play) ___ now.", "acceptableAnswers":["is playing"], "explanation":"(Chinese)", "subSkill":"skill_id" }
- reorder: { "type":"reorder", "instruction":"(Chinese)", "words":["she","is","reading"], "correctSentence":"She is reading.", "explanation":"(Chinese)", "subSkill":"skill_id" }
- error: { "type":"error", "instruction":"(Chinese)", "words":["She","go","to","school"], "errorIndex":1, "correction":"goes", "explanation":"(Chinese)", "subSkill":"skill_id" }

3. "mission": A writing task:
   - "title": string, "description": string (Chinese), "scenario": string (Chinese)
   - "grammarType": main subSkill ID
   - "scaffolds": array of 2-3 { "prefix":"", "suffix":"", "hint":"", "grammarCheck":"skill_id", "example":"" }

Return a single JSON object { "discover":{...}, "levels":{...}, "mission":{...} }.
Return ONLY the JSON, no markdown code blocks, no other text.`;

async function callAI(systemPrompt, userText) {
  const provider = getProvider();
  const apiKey = getAiKey();
  if (!apiKey) throw new Error('请先在家长专区 → AI 生成课程中配置 API key');

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `API 返回 ${res.status}`);
    }
    const data = await res.json();
    return data?.content?.find(b => b.type === 'text')?.text || '';
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + '\n\n' + userText }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `API 返回 ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseJSON(raw) {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(text);
}

export async function generateSyllabus(goal) {
  const raw = await callAI(SYLLABUS_PROMPT, `Learning goal: ${goal}`);
  const syllabus = parseJSON(raw);
  if (!Array.isArray(syllabus) || syllabus.length < 12) {
    throw new Error('AI 返回的大纲不完整，请重试');
  }
  return syllabus.slice(0, 12);
}

export async function generateUnitContent(unitId) {
  const id = store.state.activeCurriculumId;
  const curr = store.state.curricula?.[id];
  if (!curr) throw new Error('无活跃课程体系');

  const sylItem = curr.syllabus[unitId - 1];
  if (!sylItem) throw new Error('单元不在大纲中');

  const userText = [
    `Unit ${unitId}: ${sylItem.title}`,
    `Description: ${sylItem.description}`,
    `Sub-skills to use: ${(sylItem.skills || []).join(', ')}`,
  ].join('\n');

  const raw = await callAI(UNIT_PROMPT, userText);
  const data = parseJSON(raw);

  if (!data.discover || !data.levels) {
    throw new Error('AI 返回的内容结构不完整，请重试');
  }

  curriculum.saveUnitData(unitId, data);
  return data;
}
