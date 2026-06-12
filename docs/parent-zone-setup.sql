-- 家长专区：在 gq_profiles 表新增 parent_pin_hash 列
-- 在 Supabase 控制台 → SQL Editor 运行此脚本

ALTER TABLE public.gq_profiles
  ADD COLUMN IF NOT EXISTS parent_pin_hash text;
