/**
 * 跟后端通信的部分。
 *
 * 这里的每个函数都可能失败，而且失败是**正常情况**之一 ——
 * 因为这个网站有两种部署形态：
 *
 *   · 本地 npm start  → 有后端，排行榜可用
 *   · GitHub Pages    → 纯静态，/api 根本不存在
 *
 * 所以调用方必须准备好收错误。静态那一版游戏照常能玩，只是没有排行榜。
 * 这种「少了个零件也照样能用」的设计，叫优雅降级。
 */

export const api = {
  /** 取排行榜前几名。 */
  async top(limit = 10) {
    const res = await fetch(`/api/scores/top?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.scores ?? [];
  },

  /** 提交一条成绩。失败时抛出带原因的 Error。 */
  async submit(name, score) {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });

    // 服务器可能返回空响应或非 JSON，所以先兜住解析失败。
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return data;
  },
};
