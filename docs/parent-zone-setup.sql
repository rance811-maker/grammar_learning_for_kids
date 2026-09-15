-- ============================================================================
-- Grammar Quest · 家长专区建表脚本
-- 在 Supabase 控制台 → SQL Editor 运行此脚本（可重复运行）
-- ============================================================================

-- gq_profiles 加 parent_pin_hash 列（如果还没有）
-- 存家长密码的哈希；RLS 沿用 gq_profiles 自身的策略（见 supabase-setup.sql）。
ALTER TABLE public.gq_profiles
  ADD COLUMN IF NOT EXISTS parent_pin_hash text;

-- 说明：这里原本还有一张 gq_course_packs 表，配套「云端课程包」功能。
-- 那张表从未在任何环境建起来过，功能也没有界面入口，已随代码一并删除。
-- 自定义课程现在走本地存储 + 家长专区的导出 / 导入，不依赖数据库。
