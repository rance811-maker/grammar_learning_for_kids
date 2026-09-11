// 预置课程：随代码一起发布、所有人打开就能用的课程。
//
// 为什么用这种形式，而不是再做一套"内置课程"机制：
// 自定义课程（store.state.curricula）那条路已经跑通了——课程切换、进度隔离、
// 语法提纲、单元渲染全都复用现成代码。预置课程只是"出厂时就装好的自定义课程"，
// 数据形状和「导出」按钮产出的 .json 完全一致。
//
// 加一套新课程 = 往下面数组里加一条，不需要改任何逻辑。
//
// 字段说明（与导出文件一一对应）：
//   id          稳定不变，用户删掉后靠它记住"别再装回来"
//   version     内容更新时 +1，会覆盖用户本地的旧内容但保留学习进度
//   title/description/goal/profile/syllabus/unitsData  同导出文件
//
// 注意：unitsData 不全的课程不要放进来。缺单元的课程在界面上显示「待生成」，
// 而预置课程的使用者多半没有配 API key，点进去只会卡住。

export const PRESET_COURSES = [
  // 例：
  // {
  //   id: 'preset-ielts6',
  //   version: 1,
  //   title: '雅思 6 分语法',
  //   description: '...',
  //   goal: '雅思 6.0 语法（CEFR B2）',
  //   profile: { cefr: 'B2' },
  //   syllabus: [ ...12 条... ],
  //   unitsData: { 1: {...}, ..., 12: {...} },
  // },
];

/** 只有 12 个单元都备齐的课程才配作为预置课程发布。 */
export function isPresetComplete(c) {
  return Boolean(
    c &&
    Array.isArray(c.syllabus) &&
    c.syllabus.length >= 12 &&
    c.unitsData &&
    Object.keys(c.unitsData).length >= 12
  );
}
