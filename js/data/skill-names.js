// Chinese display names for every subSkill used across the 12 units.
// Shared by the stats dashboard and the review/error-notebook view.

export const SUB_SKILL_NAMES = {
  // Unit 1 - Present Simple & Continuous
  'third_person_s': '一般现在时 - 第三人称单数',
  'state_verbs': '状态动词（不用进行时）',
  'time_markers': '时态时间标志词',
  'negative_forms': '否定句构成',
  'question_forms': '疑问句构成',
  // Unit 2 - Past Simple & Continuous
  'irregular_verbs': '不规则动词过去式',
  'was_were': 'was / were 的用法',
  'when_while': 'when / while 引导时间',
  'negative_past': '一般过去时 - 否定句',
  'question_past': '一般过去时 - 疑问句',
  // Unit 3 - Present Perfect vs Past Simple
  'past_participle': '过去分词',
  'ever_never': 'ever / never 的用法',
  'already_yet': 'already / yet 的用法',
  'for_since': 'for / since 的用法',
  'specific_time_marker': '具体时间标志词',
  // Unit 4 - Comparatives & Superlatives
  'short_adj_er_est': '短形容词 -er / -est',
  'long_adj_more_most': '长形容词 more / most',
  'irregular_comparison': '不规则比较级',
  'as_as': 'as ... as 同级比较',
  'than_usage': 'than 的用法',
  // Unit 5 - Modal Verbs
  'ability_can_could': 'can / could 表能力',
  'obligation_must_haveto': 'must / have to 表义务',
  'advice_should': 'should 表建议',
  'possibility_might': 'might / may 表可能',
  'permission': '请求许可',
  // Unit 6 - Future Forms
  'will_prediction': 'will 表预测',
  'will_spontaneous': 'will 表临时决定',
  'going_to_plans': 'going to 表计划',
  'present_cont_future': '现在进行时表将来安排',
  'shall_offers': 'shall 表提议',
  // Unit 7 - Conditionals
  'first_conditional': '第一条件句',
  'second_conditional': '第二条件句',
  'unless': 'unless 的用法',
  'mixed_conditionals': '混合条件句',
  'wish': 'wish 句型',
  // Unit 8 - Passive Voice
  'present_passive': '一般现在时被动语态',
  'past_passive': '一般过去时被动语态',
  'by_agent': 'by + 动作执行者',
  'passive_questions': '被动语态疑问句',
  'active_vs_passive': '主动与被动转换',
  // Unit 9 - Relative Clauses
  'who_people': 'who 指人',
  'which_things': 'which 指物',
  'that_usage': 'that 的用法',
  'where_places': 'where 指地点',
  'whose_possession': 'whose 表所属',
  // Unit 10 - Gerunds & Infinitives
  'verb_plus_ing': '动词 + -ing',
  'verb_plus_to': '动词 + to do',
  'both_forms': '两种形式皆可',
  'preposition_plus_ing': '介词 + -ing',
  'as_subject': '动名词作主语',
  // Unit 11 - Reported Speech
  'tense_shift': '时态后移',
  'say_tell': 'say / tell 的用法',
  'reported_questions': '转述疑问句',
  'time_place_change': '时间地点状语变化',
  'reporting_verbs': '转述动词',
  // Unit 12 - Articles & Quantifiers
  'a_an_the': '冠词 a / an / the',
  'zero_article': '零冠词',
  'some_any': 'some / any 的用法',
  'much_many': 'much / many 的用法',
  'few_little': 'few / little 的用法',
};

export function skillName(skill) {
  return SUB_SKILL_NAMES[skill] || skill;
}
