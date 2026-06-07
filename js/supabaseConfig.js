// Supabase 连接配置。
//
// 把你 Supabase 项目里的两个值填进来（控制台 -> Project Settings -> API）：
//   - Project URL              填到 SUPABASE_URL
//   - Project API keys: anon   填到 SUPABASE_ANON_KEY
//
// anon key 是可以公开的（前端本来就要用），真正的安全由数据库里的
// RLS + 安全函数保证（见 docs/supabase-setup.sql）。
//
// 这两个值留空时，应用会自动以"纯访客 / 仅本机"模式运行，登录入口会隐藏。

export const SUPABASE_URL = "https://womdtayzftvaggjyyaej.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_EMMRx_9BBdXO5vWoFApk4w_tLhg2sv1";
