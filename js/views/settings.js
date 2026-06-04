import { store } from '../store.js';

const GOAL_OPTIONS = [1, 2, 3, 4];

export function render() {
  const { settings } = store.state;
  const dailyGoal = settings.dailyGoal;
  const soundOn = settings.soundEnabled;

  const goalBtns = GOAL_OPTIONS.map(n => `
    <button class="goal-option${n === dailyGoal ? ' goal-option--active' : ''}" data-goal="${n}">
      ${n} 关
    </button>`).join('');

  return `
    <div class="view view-settings">
      <div class="settings-group">
        <div class="settings-group__title">🎯 每日目标</div>
        <div class="settings-group__desc">每天完成多少关算达标</div>
        <div class="goal-options">${goalBtns}</div>
      </div>

      <div class="settings-group">
        <div class="settings-row">
          <div>
            <div class="settings-row__label">🔊 音效</div>
            <div class="settings-row__desc">答题反馈与过关提示音</div>
          </div>
          <button class="toggle${soundOn ? ' toggle--on' : ''}" id="soundToggle" role="switch" aria-checked="${soundOn}">
            <span class="toggle__knob"></span>
          </button>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group__title">🔁 重新摸底</div>
        <div class="settings-group__desc">重新做一次摸底测试，系统会据此调整学习计划（已完成的练习进度保留）</div>
        <button class="btn btn--secondary" id="retakePlacementBtn" style="margin-top:var(--space-sm);">重新摸底测试</button>
      </div>

      <div class="settings-group settings-group--danger">
        <div class="settings-group__title">⚠️ 重置全部进度</div>
        <div class="settings-group__desc">清空所有积分、星星、错题本、徽章和学习计划，回到全新状态。此操作无法撤销。</div>
        <button class="btn btn--danger" id="resetBtn" style="margin-top:var(--space-sm);">重置全部进度</button>
      </div>

      <div class="settings-footer">
        Grammar Quest · 语法冒险<br>
        <span style="color:var(--color-muted);">数据仅保存在本机浏览器，不上传任何服务器</span>
      </div>
    </div>`;
}

export function mount() {
  // Daily goal
  document.querySelectorAll('.goal-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const goal = Number(btn.dataset.goal);
      store.state.settings.dailyGoal = goal;
      store.save();
      document.querySelectorAll('.goal-option').forEach(b =>
        b.classList.toggle('goal-option--active', Number(b.dataset.goal) === goal)
      );
    });
  });

  // Sound toggle
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      const on = !store.state.settings.soundEnabled;
      store.state.settings.soundEnabled = on;
      store.save();
      soundToggle.classList.toggle('toggle--on', on);
      soundToggle.setAttribute('aria-checked', String(on));
    });
  }

  // Retake placement
  const retakeBtn = document.getElementById('retakePlacementBtn');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      if (confirm('确定要重新做摸底测试吗？已完成的练习进度会保留。')) {
        store.state.placementCompleted = false;
        store.state.learningPlan = null;
        store.save();
        location.hash = 'placement';
      }
    });
  }

  // Reset all
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('确定要重置全部进度吗？此操作无法撤销！')) {
        store.reset();
        location.hash = '';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  }
}
