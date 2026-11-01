import { cloud } from '../cloud.js';

/* 口语实战场。

   原来是独立产品 Spoken Grammar（spoken-grammar.netlify.app），2026-11 并进 Grammar Quest。
   功能一点没改：录音直传 Deepgram 转写 → 后台函数调 Claude 逐句批改 → 跨课统计反复犯的错。
   改的只是外壳：登录换成 GQ 的账号、去掉自带的顶栏和安装引导、颜色换成 GQ 的 token。

   为什么整棵界面只建一次、常驻内存（ROOT）：
   GQ 的路由每切一次页面就把整个 #app 重写一遍，没有「离开页面」的钩子。如果每次进来都重建，
   切去别的菜单再回来，正在跑的批改进度、正在录的音、播放器都没了。所以 render() 只吐一个
   占位，mount() 把常驻的 ROOT 挂到占位的位置；切走时 ROOT 只是被摘下来，并不销毁，
   里面还在跑的异步任务继续往 ROOT 里写，回来时一切都在。
   代价：录音中途切走，麦克风不会停（录到上限会自己停）。

   下面的业务代码基本是独立版原样，所以注释里提到的「CLAUDE.md」指的是
   speakgrammar/CLAUDE.md，那里有每条设计决定的来由。 */

let ROOT = null;
let bootedFor = null;     // 当前这棵界面属于哪个账号；换了账号要整个重建

const SKELETON = `
  <div class="sg-head">
    <p class="sg-lead">把你真实开口说的英语拿来批改——一节外教课的录音，或者对着题目自己说三分钟。按八类语法挑错，攒几节课之后告诉你反复犯的是哪几类。</p>
    <div class="pills" id="sg-quota"></div>
  </div>
  <nav id="sg-tabs">
    <button data-t="home" aria-selected="true">导入录音</button>
    <button data-t="fix" aria-selected="false">批改</button>
    <button data-t="rec" aria-selected="false">现录现测</button>
    <button data-t="text" aria-selected="false">原文</button>
    <button data-t="pat" aria-selected="false">规律</button>
    <button data-t="hist" aria-selected="false">历史</button>
    <button data-t="set" aria-selected="false">设置</button>
    <button data-t="adm" aria-selected="false" hidden>管理</button>
  </nav>
  <section id="sg-v-home" hidden></section>
  <section id="sg-v-fix" hidden></section>
  <section id="sg-v-rec" hidden></section>
  <section id="sg-v-text" hidden></section>
  <section id="sg-v-pat" hidden></section>
  <section id="sg-v-hist" hidden></section>
  <section id="sg-v-set" hidden></section>
  <section id="sg-v-adm" hidden></section>
  <div class="player" id="sg-player" hidden><div class="wrap">
    <span class="nm" id="sg-pnm">—</span>
    <audio id="sg-au" controls preload="metadata"></audio>
    <button class="ghost" id="sg-newbtn">导入新录音</button>
  </div></div>
  <input type="file" id="sg-picker" accept="audio/*,.m4a,.mp3,.wav,.aac,.caf,.webm" class="offscreen">
  <input type="file" id="sg-jsonpicker" accept=".json,application/json" multiple class="offscreen">
`;

export function render() {
  return '<div class="view view-oral" id="sg-host"></div>';
}

export function mount() {
  const host = document.getElementById('sg-host');
  if (!host) return;
  const uid = (cloud.currentUser() || {}).id || '';
  if (ROOT && uid !== bootedFor) {
    // 换了账号：上一个人的批改、录音一样都不能留在界面上
    if (S.audioUrl) URL.revokeObjectURL(S.audioUrl);
    ROOT = null;
    S = freshS();
    R.weakCats = [];
  }
  if (!ROOT) {
    ROOT = document.createElement('div');
    ROOT.className = 'view view-oral';
    ROOT.innerHTML = SKELETON;
    wire();
    bootedFor = uid;
    host.replaceWith(ROOT);
    boot();
    return;
  }
  host.replaceWith(ROOT);
  // 离开期间额度可能变了（比如后台批改跑完扣了次数），顺手刷一下，失败无所谓
  api('me').then(me => { S.me = me; renderQuota(); }).catch(() => {});
}

/* ================================================================ 配置 */
const CFG = {
  ASR_MODEL: "nova-3",
  LLM_MODEL: "claude-opus-5",
  MINC: 0.7,                      // 低于此置信度不计入
  ANCHOR: "",     // 默认留空：每个人的开场句不一样，空的时候走手动选声道
};

const CATS = {articles:"冠词",tense:"时态",number:"单复数/可数性",
  preposition:"介词",agreement:"主谓一致",modal:"情态动词",
  word_order:"语序",collocation:"搭配"};
const CAT_LABEL = {...CATS, asr_suspect:"疑似听错"};
// ASR 难以伪造、可信的五类；冠词和介词单列打折看（CLAUDE.md 第 6 条）
const SOLID = ["tense","agreement","word_order","collocation","number"];

/* ================================================================ 小工具 */
const $ = s => ROOT.querySelector(s);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c;
  if (x !== undefined) n.textContent = x; return n; };
const mmss = s => s == null ? "--:--" :
  `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
const words = t => t.split(/\s+/).filter(Boolean).length;
// 本地时间的 ISO 串（不带时区），和本地版 speakgrammar.py 的 analyzed_at 同一口径，排序才不会乱
const localIso = () => { const d = new Date();
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0,19); };
const isReal = e => e.severity === "error" && CATS[e.category]
  && Number(e.confidence || 0) >= CFG.MINC;

// localStorage 可能被禁用（隐私模式等），读写都得兜住
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
             catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; }
             catch { return false; } },
};

const freshS = () => ({ sess:null, index:[], tab:"fix", audioUrl:null, me:null, cache:new Map() });
let S = freshS();

/* ================================================================ 本地数据库
   sessions：分析结果（和本地版 ~/.speakgrammar/sessions/*.json 同一格式）
   audio：原始录音，时间戳回放要用
   transcripts：Deepgram 原始返回，按音频哈希缓存，重跑不重复扣费 */
const DB = (() => {
  let p;
  const open = () => p ||= new Promise((res, rej) => {
    const r = indexedDB.open("speakgrammar", 1);
    r.onupgradeneeded = () => {
      for (const n of ["sessions","audio","transcripts"])
        if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const run = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req.result);
      t.onerror = t.onabort = () => rej(t.error);
    });
  };
  return {
    get: (s, k) => run(s, "readonly", st => st.get(k)),
    put: (s, k, v) => run(s, "readwrite", st => st.put(v, k)),
    del: (s, k) => run(s, "readwrite", st => st.delete(k)),
    clear: s => run(s, "readwrite", st => st.clear()),
    all: s => run(s, "readonly", st => st.getAll()),
  };
})();

// 上传前先在本地量一下时长：超额度、超单次上限的，别等花了转写的钱才发现。
// 自录的 webm 常常读不到时长（Infinity），所以自录直接用计时器的秒数。
function audioDuration(file){
  return new Promise(res => {
    const a = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const done = v => { URL.revokeObjectURL(url); res(v); };
    const t = setTimeout(() => done(null), 8000);
    a.preload = "metadata";
    a.onloadedmetadata = () => { clearTimeout(t);
      done(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : null); };
    a.onerror = () => { clearTimeout(t); done(null); };
    a.src = url;
  });
}

async function fileHash(file){
  const buf = await file.arrayBuffer();
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  return [...d].map(b => b.toString(16).padStart(2,"0")).join("").slice(0,16);
}

/* ================================================================ 调后端
   身份是 Grammar Quest 的 Supabase 账号（独立版时期是 Netlify Identity）。
   令牌由 cloud.js 管：过期了它会自己续，续不上就是真的要重新登录了。 */
async function api(path, opt = {}){
  let tok;
  try { tok = await cloud.accessToken(); }
  catch (e){
    throw new Error(e?.message === "NETWORK" ? "网络连不上，检查一下再试。" : "登录过期了，请重新登录。");
  }
  const r = await fetch("/.netlify/functions/api/" + path, { ...opt,
    headers: { ...(opt.headers || {}), "content-type":"application/json",
               authorization: "Bearer " + tok } });
  const d = await r.json().catch(() => ({ error:"服务器返回的不是 JSON（可能是部署没生效）" }));
  if (!r.ok) throw new Error(d.error || ("请求失败 " + r.status));
  return d;
}

/* ================================================================ 1. 转写 */
function deepgram(file, token, model, onProgress){
  const params = new URLSearchParams({
    model,
    filler_words: "true",    // ← 命门：默认会删掉语气词并顺手规整
    diarize: "true",
    utterances: "true",
    punctuate: "true",
    smart_format: "false",   // ← 避免任何"美化"改写
    language: "en",
  });
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("POST", "https://api.deepgram.com/v1/listen?" + params);
    x.setRequestHeader("Authorization", "Bearer " + token);   // 短命令牌，不是 key
    x.setRequestHeader("Content-Type", "application/octet-stream");
    x.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      if (x.status === 401 || x.status === 403)
        return rej(new Error("转写令牌被拒或已过期。重试一次；如果一直失败，告诉管理员。"));
      if (x.status >= 400)
        return rej(new Error(`Deepgram 返回 ${x.status}：${x.responseText.slice(0,500)}`));
      try { res(JSON.parse(x.responseText)); }
      catch { rej(new Error("Deepgram 返回的不是 JSON：" + x.responseText.slice(0,300))); }
    };
    x.onerror = () => rej(new Error("连不上 Deepgram。检查网络后重试。"));
    x.send(file);
  });
}

function utterancesOf(data){
  const us = data?.results?.utterances;
  if (!us) throw new Error("转写结果里没有 utterances。检查 diarize/utterances 参数是否生效。");
  return us.filter(u => (u.transcript || "").trim()).map(u => ({
    speaker: u.speaker ?? 0,
    text: u.transcript.trim(),
    start: u.start ?? 0,
    end: u.end ?? u.start ?? 0,
  }));
}

/* 把被切碎的句子拼回去（CLAUDE.md 第 4 条，不能删）。
   Deepgram 按停顿切 utterance，一句话经常横跨三四段。
   上一段没以 . ? ! 结尾、且间隔不超过 maxGap 秒，就合并。 */
function stitch(utts, maxGap = 2.5){
  const out = [];
  for (const u of utts){
    const prev = out[out.length - 1];
    if (prev && !/[.!?]"?$/.test(prev.text) && u.start - prev.end <= maxGap){
      prev.text = `${prev.text} ${u.text}`.replace(/  /g, " ");
      prev.end = u.end;
      continue;
    }
    out.push({...u});
  }
  return out;
}

/* ================================================================ 2. 挑声道 */
// 靠开场锚点句确定哪个 speaker 是你；找不到返回 null，交给界面让用户选
function pickSpeaker(utts, anchor){
  const speakers = [...new Set(utts.map(u => u.speaker))].sort();
  if (speakers.length === 1) return { spk: speakers[0], why: "音频里只有一个说话人" };
  const norm = anchor.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  for (const u of utts.slice(0, 25)){            // 锚点句应该在开头
    const t = u.text.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    if (norm && t.includes(norm))
      return { spk: u.speaker, why: `锚点句命中："${u.text.slice(0,60)}"` };
  }
  return null;
}

/* 后台任务轮询。为什么要有它：云函数硬上限 30 秒，批改经常超（超了返回的是一个
   HTML 超时页，前端只看到"返回的不是 JSON"）。现在批改在后台函数里跑，上限 15 分钟，
   结果由服务端自己存，所以中途关掉页面也不会白跑。 */
async function waitJob(id, onTick){
  const t0 = Date.now();
  const LIMIT = 16 * 60 * 1000;
  let wait = 2000;
  while (true){
    await new Promise(r => setTimeout(r, wait));
    wait = Math.min(wait + 1000, 6000);      // 递增退避，别把函数调用烧在轮询上
    let d;
    try { d = await api("job?id=" + encodeURIComponent(id)); }
    catch (e){
      if (Date.now() - t0 > LIMIT) throw e;
      continue;                      // 偶发网络抖动不算失败，接着等
    }
    if (d.quota && S.me){ S.me.quota = d.quota; renderQuota(); }
    if (d.status === "done"){
      api("job?id=" + encodeURIComponent(id), { method:"DELETE" }).catch(()=>{});
      return d.result || {};
    }
    if (d.status === "error") throw new Error(d.error || "后台任务失败了。");
    if (onTick) onTick(d.progress
      ? `分析中 ${Math.min(d.progress.done + 1, d.progress.total)}/${d.progress.total} 段`
      : "排队中");
    if (Date.now() - t0 > LIMIT)
      throw new Error("等了十几分钟还没结果。去「历史」看看是不是其实已经好了。");
  }
}

/* ================================================================ 4. 整条链路 */
async function run(file, { solo = false, knownSeconds = null } = {}){
  show("fix");
  const v = $("#sg-v-fix"); v.innerHTML = "";
  const p = el("div","prog");
  const head = el("div");
  head.append(el("span","spin"), document.createTextNode(" "), el("b", null, file.name));
  const stage = el("div", "note", "准备中…"); stage.style.paddingLeft = "0";
  const logBox = el("div","log");
  p.append(head, stage, logBox); v.append(p);
  const lines = [];
  const log = s => { lines.push(s); stage.textContent = s + "…";
    logBox.textContent = lines.slice(-14).join("\n"); logBox.scrollTop = logBox.scrollHeight; };

  try {
    log(`计算文件指纹（${(file.size/1e6).toFixed(1)}MB）`);
    const h = await fileHash(file);

    const secs = knownSeconds ?? await audioDuration(file);
    const pl = S.me?.plan || {};
    const maxMin = pl.one_minutes ?? 10;
    const paid = pl.plan === "paid";
    const leftMin = Math.max(0, (S.me?.quota?.minutes_limit ?? 0) - (S.me?.quota?.minutes ?? 0));
    if (pl.left != null && pl.left <= 0)
      throw new Error(paid ? "本月额度用完了，下个月 1 号重置。"
        : `免费体验的 ${pl.free_total ?? 3} 次用完了。去「设置」页看怎么继续用。`);
    if (secs){
      const mins = secs / 60;
      log(`这段 ${mins < 1 ? Math.round(secs) + " 秒" : Math.round(mins) + " 分钟"}`);
      if (mins > maxMin)
        throw new Error(paid
          ? `这段有 ${Math.round(mins)} 分钟，单次最长 ${maxMin} 分钟，请先切成几段。`
          : `这段有 ${Math.round(mins)} 分钟，免费额度单次最长 ${maxMin} 分钟。`
            + "先切一段来试，或者去「设置」页看怎么继续用。");
      if (paid && pl.left != null && mins > leftMin)
        throw new Error(`这段有 ${Math.round(mins)} 分钟，本月只剩 ${Math.round(leftMin)} 分钟额度。`
          + "下个月 1 号重置。");
    }
    if (S.index.some(r => r.hash === h)){
      log("这段录音已经分析过，直接打开");
      return loadSession(h);
    }

    let data = await DB.get("transcripts", h);
    if (data) log("转写缓存命中，不重复扣费");
    else {
      log("申请转写令牌");
      const t = await api("dg-token", { method:"POST",
        body: JSON.stringify({ minutes: secs ? secs / 60 : 0 }) });
      S.me && (S.me.quota = t.quota); renderQuota();
      log(`上传转写（${t.asr_model}）`);
      data = await deepgram(file, t.token, t.asr_model, f => {
        stage.textContent = f < 1 ? `上传中 ${Math.round(f*100)}%…` : "转写中…"; });
      await DB.put("transcripts", h, data);
    }
    const utts = utterancesOf(data);
    if (!utts.length) throw new Error("转写结果是空的——录音里可能没有英语内容，或者没收到声音。");
    const dur = data?.metadata?.duration || 0;

    let mine, how;
    if (solo){
      // 自录是独白，全部算你的；不走分声道，免得 Deepgram 把一个人误切成两个
      mine = stitch(utts); how = "自录独白，全部算你的";
    } else {
      let pick = pickSpeaker(utts, LS.get("sg.anchor", CFG.ANCHOR) || "");
      if (!pick) pick = await chooseSpeaker(utts);
      if (pick.spk === "all"){ mine = stitch(utts); how = "手动指定：全部算你的"; }
      else { mine = stitch(utts.filter(u => u.speaker === pick.spk)); how = `分声道：${pick.why}`; }
      $("#sg-v-fix").innerHTML = ""; $("#sg-v-fix").append(p);
    }
    if (!mine.length) throw new Error("没有识别到属于你的内容。");
    log(`归属方式：${how}，拼成 ${mine.length} 句`);

    // 批改这一步最容易被网络打断，单独拆出来可以重试；
    // 转写结果已经缓存，重试不会重复扣转写的钱
    const owner = u => mine.some(m => u.start >= m.start - 0.01 && u.end <= m.end + 0.01)
      ? "me" : "other";
    const payload = {
      hash: h, audio_name: file.name, duration: dur, attribution: how,
      analyzed_at: localIso(),
      my_words: mine.reduce((n, u) => n + words(u.text), 0),
      my_lines: mine.map(u => ({ start:u.start, end:u.end, text:u.text })),
      transcript: utts.map(u => ({ who: owner(u), start:u.start, end:u.end, text:u.text })),
    };

    const analyzeAndSave = async () => {
      log("送去批改，这一步慢（关掉页面也没关系，结果会存进「历史」）");
      const start = await api("analyze-start", { method:"POST",
        body: JSON.stringify({ session: payload }) });
      await waitJob(start.job, log);
      S.cache.delete(h);
      // 录音只留在本机：回放要用，也不想把别人的录音堆到服务器上
      try {
        await DB.put("audio", h, { name:file.name, type:file.type, buf: await file.arrayBuffer() });
      } catch { log("⚠ 本机空间不够，这节课存不下录音，时间戳没法回放"); }
      askPersist();
      await refreshIndex();
      await loadSession(h);
    };

    try { await analyzeAndSave(); }
    catch (err){
      v.innerHTML = "";
      v.append(el("div","err", (err.message || String(err))
        + "\n转写已经存下来了，重试不会重复扣转写的钱。"));
      const again = el("button","bigbtn","重试批改");
      again.style.padding = "12px 26px"; again.style.fontSize = "14px";
      again.onclick = () => { v.innerHTML = ""; v.append(p); analyzeAndSave().catch(e => {
        v.innerHTML = ""; v.append(el("div","err", e.message || String(e))); }); };
      const back = el("button","ghost","算了，回到导入页");
      back.onclick = () => { S.sess = null; show("fix"); };
      const row = el("div","rrow"); row.style.justifyContent = "flex-start";
      row.append(again, back); v.append(row);
    }
  } catch (err){
    v.innerHTML = "";
    v.append(el("div","err", err.message || String(err)));
    const b = el("button","ghost","回到导入页"); b.onclick = () => { S.sess = null; show("fix"); };
    v.append(b);
  }
}

// 没找到锚点句：列出每个声道的前几句让用户自己挑
function chooseSpeaker(utts){
  return new Promise(res => {
    const v = $("#sg-v-fix"); v.innerHTML = "";
    v.append(el("div","hint",
      (LS.get("sg.anchor", "")
        ? `没找到开场锚点句「${LS.get("sg.anchor", "")}」，没法自动判断哪个声道是你。`
        : "这段录音里有两个人。点一下哪个是你——想以后自动认出来，可以去设置页填一句固定的开场白。")
      + "看看每个声道的前几句，点你自己那个。转写已经存下了，不会重复扣费。"));
    const speakers = [...new Set(utts.map(u => u.speaker))].sort();
    for (const s of speakers){
      const c = el("div","card");
      const own = utts.filter(u => u.speaker === s);
      c.append(el("div","tag", `声道 ${s} · ${own.length} 段`));
      own.slice(0,3).forEach(u => { const r = el("div","turn other");
        r.append(tsBtn(u.start), el("p", null, u.text)); c.append(r); });
      const b = el("button","ghost","这个是我"); b.style.marginTop = "8px";
      b.onclick = () => res({ spk: s, why: `手动指定声道 ${s}` });
      c.append(b); v.append(c);
    }
    const all = el("button","ghost","全部都是我（这是独白）");
    all.onclick = () => res({ spk: "all" });
    v.append(all);
  });
}

async function askPersist(){
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted()))
    await navigator.storage.persist(); } catch {}
}

/* ================================================================ 界面：通用 */
function diff(a, b){
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  const m = A.length, n = B.length;
  const L = Array.from({length:m+1}, () => new Int32Array(n+1));
  for (let i=m-1;i>=0;i--) for (let j=n-1;j>=0;j--)
    L[i][j] = A[i] === B[j] ? L[i+1][j+1]+1 : Math.max(L[i+1][j], L[i][j+1]);
  const oa=[], ob=[];
  let i=0, j=0;
  while (i<m && j<n){
    if (A[i]===B[j]){ oa.push([0,A[i]]); ob.push([0,B[j]]); i++; j++; }
    else if (L[i+1][j] >= L[i][j+1]){ oa.push([1,A[i]]); i++; }
    else { ob.push([1,B[j]]); j++; }
  }
  while (i<m) oa.push([1,A[i++]]);
  while (j<n) ob.push([1,B[j++]]);
  return [oa, ob];
}
function marked(parts){
  const f = document.createDocumentFragment();
  for (const [ch, t] of parts){
    if (ch && t.trim()) f.appendChild(el("mark", null, t));
    else f.appendChild(document.createTextNode(t));
  }
  return f;
}
function pairLines(original, corrected){
  const [da, db] = diff(original || "", corrected || "");
  const l1 = el("div", "line x"); l1.append(el("i", null, "✗"));
  const s1 = el("span"); s1.append(marked(da)); l1.append(s1);
  const l2 = el("div", "line v"); l2.append(el("i", null, "✓"));
  const s2 = el("span"); s2.append(marked(db)); l2.append(s2);
  return [l1, l2];
}

function seek(t){
  const au = $("#sg-au");
  if (!au.src || t == null) return;
  au.currentTime = Math.max(0, t - 0.4);
  au.play().catch(()=>{});
}
function tsBtn(t){
  const b = el("button", "ts", mmss(t));
  b.title = "跳到录音这一秒";
  b.onclick = () => seek(t);
  return b;
}

/* ================================================================ 首页
   登录后落在这里。原来直接落在上一节课的批改页，一进来就是一堆旧数据，
   不知道该干什么。首页只回答三件事：攒了多少、现在最该练什么、接下来干什么。 */
async function renderHome(){
  const v = $("#sg-v-home"); v.innerHTML = "";
  const n = S.index.length;
  const totalWords = S.index.reduce((a, r) => a + (r.words || 0), 0);
  const q = S.me?.quota || {};

  const hero = el("div","hero");
  const steps = arr => {
    const ul = el("ul","steps");
    arr.forEach(t => ul.append(el("li", null, t)));
    return ul;
  };
  if (!n){
    hero.append(el("h3", null, "开始攒你的口语错题本"));
    hero.append(steps([
      "录一段你说的英语：自己讲三分钟，或者导入一整节外教课的录音。",
      "按八类语法挑出错误，每条都能点回录音那一秒核对。",
      "攒够 8 到 10 节课，告诉你反复犯的是哪三四个问题——这才是真正的产出。",
    ]));
  } else {
    hero.append(el("h3", null, `已经攒了 ${n} 节课`));
    hero.append(el("p", null, `你一共说了 ${totalWords} 词。`));
    hero.append(el("p", null, n < 8
      ? `再跑 ${Math.max(0, 8 - n)} 节，「规律」页的判定才开始可信——单节课的错误列表基本是噪音。`
      : "够看规律了，去「规律」页看反复犯的是哪几类。"));
  }
  const pl = S.me?.plan || {};
  hero.append(el("p", null,
    pl.plan === "owner"
      ? `单次录音最长 ${pl.one_minutes} 分钟，不限次数。本月这个账号花了 $${pl.spend_usd ?? 0}。`
    : pl.plan === "paid"
      ? `单次录音最长 ${pl.one_minutes} 分钟；本月还剩 ${pl.left} 段、`
        + `${Math.max(0, (q.minutes_limit ?? 0) - (q.minutes ?? 0))} 分钟。`
      : `免费体验还剩 ${pl.left ?? 0} / ${pl.free_total ?? 3} 次，每次最长 ${pl.one_minutes ?? 10} 分钟。`));
  const row = el("div","rrow");
  const b1 = el("button","bigbtn","开始录音");
  b1.style.padding = "14px 30px"; b1.style.fontSize = "15px";
  b1.onclick = () => show("rec");
  const b2 = el("button","ghost","导入整节课的录音");
  b2.onclick = () => $("#sg-picker").click();
  row.append(b1, b2);
  hero.append(row);
  v.append(hero);

  const bar = el("div","bar");
  const add = (x, lab) => { const d = el("div","stat");
    d.append(el("b", null, x), el("span", null, lab)); bar.append(d); };
  add(n, "已录课数");
  add(totalWords, "你说过的词数");
  add(`${q.left ?? "—"}`, "本月还能录（段）");
  v.append(bar);

  // 有顽固模式就直接摆在首页——这是整个工具最该被看见的结论
  const weak = (R.weakCats || []).map(k => CATS[k]).filter(Boolean);
  if (weak.length){
    const f = el("div","focus");
    f.append(el("b", null, "目前最顽固：" + weak.join("、")));
    const go = el("button","linkbtn","去「规律」页看具体例子");
    go.onclick = () => show("pat");
    f.append(el("div"), go);
    v.append(f);
  }

  // 从微信等 App 里打开的，先劝去浏览器——那里录音才能用
  if (inAppBrowser()) v.append(openInBrowserTip("录音"));

  if (n){
    v.append(el("h2", null, "最近"));
    const ul = el("ul","rowlist");
    S.index.slice(0, 3).forEach(r => {
      const li = el("li");
      li.append(el("span", null, r.name));
      li.append(el("span","meta", `${r.at.slice(0,10)} · ${r.words} 词 · ${r.errors} 处`));
      li.onclick = () => loadSession(r.hash);
      ul.append(li);
    });
    v.append(ul);
    if (n > 3){
      const more = el("button","linkbtn", `看全部 ${n} 节课`);
      more.onclick = () => show("hist");
      v.append(more);
    }
  }
}

/* 重新批改当前这节课：转写不动，只重跑模型那一步。
   模型偶尔会返回空结果（想太久把 max_tokens 耗光），有个重跑入口比解释半天强。 */
function reanalyzeBtn(){
  const b = el("button","ghost","重新批改这节课");
  b.style.marginTop = "6px";
  b.onclick = async () => {
    if (!S.sess) return;
    b.disabled = true; b.textContent = "排队中…";
    try {
      const { rewrite, errors, ...rest } = S.sess;      // 重跑只换 errors
      const start = await api("analyze-start", { method:"POST",
        body: JSON.stringify({ session: rest }) });
      await waitJob(start.job, t => { b.textContent = t; });
      S.cache.delete(S.sess.hash);
      await refreshIndex();
      await loadSession(S.sess.hash);
    } catch (e){
      b.disabled = false; b.textContent = "重新批改这节课";
      b.after(el("div","err", e.message));
    }
  };
  return b;
}

/* ================================================================ 批改 */
function cardOf(e){
  const c = el("div", "card" + (e.severity === "style" ? " style" : ""));
  const h = el("div", "chead");
  h.append(tsBtn(e.at));
  h.append(el("span", "tag", e.severity === "style" ? "不够地道"
    : (CAT_LABEL[e.category] || e.category)));
  if (e.confidence != null)
    h.append(el("span", "conf", "置信度 " + Number(e.confidence).toFixed(2)));
  c.append(h, ...pairLines(e.original, e.corrected));
  if (e.note) c.append(el("div", "note", e.note));
  return c;
}

function renderFix(){
  const v = $("#sg-v-fix"); v.innerHTML = "";
  if (!S.sess) return v.append(dropZone());

  v.append(el("div","who", S.sess.audio_name
    + (S.sess.duration ? ` · ${Math.round(S.sess.duration / 60)} 分钟` : "")));
  const errs = S.sess.errors || [];
  const real = errs.filter(isReal);
  const low = errs.filter(e => e.severity === "error" && CATS[e.category]
    && Number(e.confidence || 0) < CFG.MINC);
  const style = errs.filter(e => e.severity === "style");
  const asr = errs.filter(e => e.category === "asr_suspect");
  const w = S.sess.my_words || 0;

  const bar = el("div", "bar");
  const add = (n, lab) => { const d = el("div","stat"); d.append(el("b",null,n),
    el("span",null,lab)); bar.append(d); };
  add(w, "你说的词数");
  add(real.length, "语法错误");
  add(w ? (real.length / w * 100).toFixed(1) : "0", "每百词");
  add(style.length, "不够地道");
  const dur = S.sess.duration || 0;
  const wpm = dur ? w / (dur / 60) : 0;
  if (dur) add(Math.round(wpm), "每分钟词数");
  v.append(bar);

  /* 说话密度太低要明说。本地版一直有这条检查，搬到网页版时被我漏掉了：
     结果用户说了 40 秒只出 31 词、界面却只显示"0 处错误"，
     根本看不出中间有十几秒没被识别到。 */
  if (dur > 20 && wpm < 60)
    v.append(el("div","hint",
      `这段 ${Math.round(dur)} 秒里每分钟只有 ${Math.round(wpm)} 词，偏低`
      + "（正常口语 100 词上下）。可能是停顿多，也可能有话没被识别到——"
      + "离麦太远、说得轻、或者环境吵都会这样。去「原文」页对一下，"
      + "记得说过但原文里没有的，就是漏识别了。"));

  if (S.noAudio)
    v.append(el("div","hint","这节课的录音没存在这个浏览器里（空间不够，或是从备份导入的），时间戳暂时点不了。"));
  if (S.sess.attribution)
    v.append(el("div", "hint", "本次归属方式：" + S.sess.attribution +
      "。任何一条觉得不像你说的，点时间戳回放确认。"));

  if (!real.length && !style.length){
    v.append(el("div", "empty", w < 80
      ? `这段只有 ${w} 词，没挑出语法错误——样本这么短，这不说明什么。多录几段再看。`
      : "这段没挑出语法错误。几百词一条都没有的话，多半是批改没跑成，重跑一次试试。"));
    // 词数不少却一条都没有，几乎肯定是批改出问题了，把重跑的入口直接放这儿
    if (w >= 200) v.append(reanalyzeBtn());
  }

  const byCat = {};
  real.forEach(e => (byCat[e.category] ||= []).push(e));
  Object.entries(byCat).sort((a,b) => b[1].length - a[1].length)
    .forEach(([k, items]) => {
      v.append(el("h2", null, `${CATS[k] || k} · ${items.length}`));
      items.forEach(e => v.append(cardOf(e)));
    });

  if (style.length){
    v.append(el("h2", null, `语法没错，但不够地道 · ${style.length}`));
    style.forEach(e => v.append(cardOf(e)));
  }
  if (low.length){
    v.append(el("h2", null, `低置信度，没计入 · ${low.length}`));
    v.append(el("div","hint","这些是模型自己都拿不准的。看看就好，别往心里去。"));
    low.forEach(e => v.append(cardOf(e)));
  }
  renderRewrite(v);

  if (asr.length){
    v.append(el("h2", null, `疑似机器听错 · ${asr.length}`));
    v.append(el("div","hint","这些不是你的语法问题，是转写可能识别错了。点时间戳听一下你实际说的是什么。"));
    asr.forEach(e => v.append(cardOf(e)));
  }
}

/* 更地道的说法。跟错误列表刻意分开：这里给的是"母语者会怎么说"，
   属于表达建议，不计入错误库，也不进「规律」统计。点按钮才生成，省钱。 */
// 重新生成（会再花一次额度）。旧格式的记录靠它换成按段对照。
function regenBtn(){
  const b = el("button","linkbtn","重新生成（会用掉一次额度）");
  b.onclick = async () => {
    b.disabled = true; b.textContent = "生成中…";
    try {
      const st = await api("rewrite-start", { method:"POST",
        body: JSON.stringify({ hash: S.sess.hash, force: true }) });
      const d = st.done ? st : await waitJob(st.job, t => { b.textContent = t.replace("分析", "生成"); });
      S.sess.rewrite = d.rewrite;
      S.cache.set(S.sess.hash, S.sess);
      renderFix();
    } catch (e){
      b.disabled = false; b.textContent = "重新生成（会用掉一次额度）";
      b.after(el("div","err", e.message));
    }
  };
  return b;
}

function renderRewrite(v){
  v.append(el("h2", null, "更地道的说法"));
  const card = el("div","card");
  const rw = S.sess.rewrite;

  if (rw && rw.parts?.length){
    // 一段一段对照。整篇一次性铺出来没法跟自己的原话对上，等于没给。
    v.append(el("div","hint",
      "下面按小段对照：上面是你说的，下面是更自然的说法。点时间戳能回放那一段。"
      + "这块只是表达建议，不算错误，也不进「规律」统计。"));
    rw.parts.forEach((p, i) => {
      const c = el("div","card");
      const h = el("div","chead");
      if (p.at != null) h.append(tsBtn(p.at));
      h.append(el("span","tag", `第 ${i+1} 段`));
      c.append(h);
      if (p.original){
        const l0 = el("div","line o");
        l0.append(el("span","rwlab","你说"));
        const s0 = el("span"); s0.textContent = p.original; l0.append(s0);
        c.append(l0);
      }
      const l1 = el("div","line v");
      l1.append(el("span","rwlab","更自然"));
      const s1 = el("span"); s1.textContent = p.rewrite; l1.append(s1);
      c.append(l1);
      (p.notes || []).forEach(n => c.append(el("div","note", "· " + n)));
      v.append(c);
    });
    if (rw.truncated)
      v.append(el("div","note","（录音较长，只改写了前面几段）"));
    // 旧版是整段一次给出的，没有原话可对照，提示一下可以重做
    if (!rw.parts.some(p => p.original))
      v.append(el("div","hint","这条是旧版格式（整段一次给出）。重新生成会改成按小段对照。"));
    v.append(regenBtn());
    return;                       // 上面已经自己往 v 里塞了卡片
  } else {
    card.append(el("div","note",
      "想知道同样的意思母语者会怎么说，点一下生成。只给一个版本，附几条关键改动说明。"
      + "这块不计入错误库和规律统计。"));
    const b = el("button","ghost","生成");
    b.style.marginTop = "10px";
    b.onclick = async () => {
      b.disabled = true; b.textContent = "生成中…";
      try {
        const st = await api("rewrite-start", { method:"POST",
          body: JSON.stringify({ hash: S.sess.hash }) });
        const d = st.done ? st
          : await waitJob(st.job, t => { b.textContent = t.replace("分析", "生成"); });
        S.sess.rewrite = d.rewrite;
        S.cache.set(S.sess.hash, S.sess);
        if (d.quota && S.me){ S.me.quota = d.quota; renderQuota(); }
        renderFix();
      } catch (e){
        b.disabled = false; b.textContent = "生成";
        card.append(el("div","err", e.message));
      }
    };
    card.append(b);
  }
  v.append(card);
}

// 没打开课程时的空状态。以前「批改」和「原文」都摆同一个拖拽区，
// 两个标签页看着一模一样，用户以为坏了。
function emptyPick(what){
  const box = el("div","empty");
  box.append(el("div", null, what + "先打开一节课："));
  const row = el("div","rrow");
  const a = el("button","ghost","去首页");
  a.onclick = () => show("home");
  const b = el("button","ghost","看历史课程");
  b.onclick = () => show("hist");
  row.append(a, b);
  box.append(row);
  return box;
}

/* ================================================================ 原文 */
function renderText(){
  const v = $("#sg-v-text"); v.innerHTML = "";
  if (!S.sess) return v.append(emptyPick("这里看完整转写原文。"));
  v.append(el("div","who", S.sess.audio_name));
  const tr = S.sess.transcript || [];
  if (!tr.length) return v.append(el("div","empty","没有转写内容。"));

  const lg = el("div", "legend");
  lg.append(el("em", null, "你说的"));
  lg.append(el("span", null, "灰色缩进 = 对方说的"));
  lg.append(el("span", null, "红底 = 这句里有被标出的错误"));
  v.append(lg);

  const errAt = new Set((S.sess.errors||[])
    .filter(e => e.severity === "error" && e.at != null)
    .map(e => Math.round(e.at * 10)));

  let prevEnd = null;
  tr.forEach(t => {
    const row = el("div", "turn " + (t.who === "me" ? "me" : "other"));
    if (prevEnd != null && t.start - prevEnd > 4) row.classList.add("gap");
    prevEnd = t.end;
    if (t.who === "me" && errAt.has(Math.round(t.start * 10)))
      row.classList.add("hasErr");
    row.append(tsBtn(t.start));
    row.append(el("p", null, t.text));
    v.append(row);
  });
}

/* ================================================================ 规律 */
async function fullSession(h){
  if (S.cache.has(h)) return S.cache.get(h);
  const d = await api("session?h=" + encodeURIComponent(h));
  S.cache.set(h, d);
  return d;
}

async function patterns(){
  const sess = [];
  for (const row of [...S.index].sort((a,b) => String(a.at).localeCompare(String(b.at))))
    sess.push(await fullSession(row.hash));
  const cats = {}, per = [];
  for (const d of sess){
    const errs = (d.errors || []).filter(isReal);
    for (const e of errs){
      const c = cats[e.category] ||= { count:0, sessions:new Set(), examples:[] };
      c.count++;
      c.sessions.add(d.hash);
      if (c.examples.length < 6 && e.original)
        c.examples.push({ original:e.original, corrected:e.corrected || "", name:d.audio_name });
    }
    const w = d.my_words || 0;
    per.push({ name:d.audio_name, words:w, errors:errs.length,
               rate: w ? Math.round(errs.length / w * 1000) / 10 : 0 });
  }
  const n = sess.length;
  // 出现在多少节课里，比总次数更能说明是不是"你的问题"
  const rows = Object.entries(cats).map(([k, c]) => ({
    key:k, label:CATS[k], count:c.count, sessions:c.sessions.size, examples:c.examples,
    verdict: c.sessions.size >= Math.max(3, n * .5) ? "顽固模式"
           : c.sessions.size <= 2 ? "偶发" : "在形成",
  })).sort((a, b) => b.count - a.count);
  return {
    n,
    total_words: sess.reduce((s, d) => s + (d.my_words || 0), 0),
    total_errors: per.reduce((s, p) => s + p.errors, 0),
    reliable: rows.filter(r => SOLID.includes(r.key)),
    discounted: rows.filter(r => !SOLID.includes(r.key)),
    per_session: per,
  };
}

/* ========================= 八类的「怎么改」知识卡 =========================
   写死在前端，不走模型：这八类的错因是结构性的、可穷举的（中文母语者错时态，
   根因就是中文不在动词上标记时间），讲一次就够，不必每次让模型重讲一遍——
   也就没有延迟、没有费用、不会每次说法都不一样。
   每张卡四段：为什么你会错（母语干扰）/ 判断规则 / 你的真实错例 / 这周怎么练。
   最后一段不能少：知道规则和说话时用对是两套系统，只给规则等于没给。 */
const KNOW = {
  tense: {
    why: "中文不在动词上标记时间。「我昨天去」和「我明天去」，动词都是「去」，"
       + "时间靠「昨天/明天」表达。英语反过来：时间必须落在动词形态上（go / went / will go），"
       + "哪怕句子里已经有 yesterday 也不能省。所以你不是忘了语法，是母语习惯——"
       + "时间说过一次就不用再说第二次。",
    rules: [
      "句子里只要出现 yesterday / last week / ago / 具体过去时间点，动词必须过去式，没有例外。",
      "过去语境一旦开始，后面所有动词跟着过去，包括从句：There were a lot of people because people lived together（不是 live）。",
      "「做完了但还影响现在」用现在完成（I've finished）；「单纯过去发生」用一般过去（I finished）。中文都是「了」，英语分两套。",
    ],
    practice: [
      "先立时间锚：开口讲过去的事之前，心里先说一遍「这是过去」，然后整段都用过去式。",
      "把你上面那条错句，按改正版大声读三遍。口语靠肌肉记忆，看懂不算数。",
      "录一分钟「我昨天做了什么」，只盯时态，回听时把每个动词圈出来检查。",
    ],
  },
  number: {
    why: "中文名词没有复数形态（「三个苹果」里「苹果」不变），也不区分可数不可数。"
       + "英语则要求：只要是可数名词、数量大于一，词尾必须变。而 information、advice、"
       + "bread 这些在中文里能数（一条信息、一个建议），在英语里不能数。",
    rules: [
      "数词或 many / a few / several 后面，可数名词一律复数：two apples，many books。",
      "常见不可数：information、advice、knowledge、furniture、bread、water、homework。要计量就借量词：a piece of advice。",
      "泛指「某一类东西」用复数零冠词：I like dogs（不是 I like dog）。",
    ],
    practice: [
      "说名词之前先问自己两个字：几个？能数吗？这两问养成习惯，这类错会掉一大半。",
      "练「描述你包里/桌上有什么」——这种题天然逼你连续说十几个名词。",
      "把常见不可数名词列成一张小单子贴着看，这类词数量有限，背完就不再错。",
    ],
  },
  articles: {
    why: "中文没有冠词系统。「我去超市」不需要在「超市」前面加任何东西，"
       + "英语却必须在 a / the / 零冠词里选一个。这是中文母语者最难的一类，"
       + "因为它不是记单词，是每次说名词都要做一次判断。",
    rules: [
      "第一次提到用 a/an，之后再提同一个用 the：I saw a dog. The dog was huge.",
      "双方都知道指哪一个 → the：the supermarket near my house（特指你家附近那家）。",
      "泛指一整类 → 复数不加冠词：Dogs are loyal。单数泛指才用 a dog。",
      "专有名词和抽象概念通常不加：go to school / at home / love is hard。",
    ],
    practice: [
      "练「描述你每天都用的一样东西」，强迫自己每个名词前都停半拍选冠词。",
      "回听录音时只圈名词，看哪些该加没加——这类错自己说的时候听不出来，回听才看得见。",
      "别追求一次全对。冠词是最后才会稳的一类，先保证「第一次 a、第二次 the」这一条。",
    ],
  },
  preposition: {
    why: "中英介词不是一一对应。中文靠方位词和动词表达关系（在桌子上面、到学校去），"
       + "英语靠介词，而且搭配是固定的、没道理可讲的。直译必错：等某人不是 wait somebody，"
       + "是 wait for somebody。",
    rules: [
      "时间三分法：具体时刻用 at（at 7）、某天用 on（on Monday）、月份年份和较长时段用 in（in May）。",
      "地点三分法：点用 at（at the door）、面用 on（on the wall）、空间内用 in（in the room）。",
      "动词固定搭配要整块记：arrive at（小地点）/ arrive in（城市）、depend on、listen to、wait for。",
      "go 后面加 to，但 go home / go there / go abroad 不加——这几个是副词不是名词。",
    ],
    practice: [
      "练「讲清楚怎么从你家走到最近的超市」，这种题全程都在用介词。",
      "每次遇到错的介词，把整个短语抄下来（不是单独抄介词），因为要记的是搭配不是词。",
      "回听时专挑 in/on/at，这三个占了这类错误的大半。",
    ],
  },
  agreement: {
    why: "中文动词不随主语变化：我去、他去、他们去，动词都是「去」。"
       + "英语只在第三人称单数现在时多一个 -s，恰恰因为只有这一处例外，最容易漏。",
    rules: [
      "he / she / it / 单数名词 + 现在时动词要加 -s：he has、she goes、my friend works。",
      "否定和疑问跟着变：he doesn't（不是 don't）、does he know（不是 do he）。",
      "there is + 单数 / there are + 复数，按后面那个名词定。",
      "主语被修饰语隔开时看真正的主语：The list of students is long（is 跟 list 走，不是 students）。",
    ],
    practice: [
      "专项练「描述你身边某个人平时都做什么」——一整段都是第三人称单数，错一个听一个。",
      "回听录音只盯 he/she + 动词这个组合，其他一律不管。",
      "这类是最容易练掉的一类，规则就一条，练两三次录音通常就明显改善。",
    ],
  },
  modal: {
    why: "中文的「要、会、能、应该、必须」和英语情态动词不是一一映射。"
       + "「我会去」可能是 will（意愿）也可能是 can（能力）；「你应该」可能是 should（建议）"
       + "也可能是 must（义务）。直译就会用错强度。",
    rules: [
      "按可能性排：must（几乎确定）> should（应该）> may/might（可能）> could（有可能）。",
      "按礼貌排：Could you…？比 Can you…？客气，Would you…？比 Will you…？客气。提要求时往右选。",
      "情态动词后面永远跟动词原形：he can go（不是 can goes / can to go）。",
      "表示「过去本该做却没做」用 should have done，这是中文「早该…」的对应说法。",
    ],
    practice: [
      "练「给刚入行的人三条建议」，逼自己在 should / could / might 之间做选择。",
      "练「如果多出三个小时你会做什么」，专门练 would 这一条虚拟线。",
      "同一句话用三个强度说三遍（must / should / might），体会差别。",
    ],
  },
  word_order: {
    why: "中文疑问词留在原位（你吃了什么？），靠疑问词和语气表达；"
       + "英语要把助动词提到主语前面（What did you eat?）。"
       + "而嵌入在句子里的疑问句又要变回陈述语序，这一正一反最容易乱。",
    rules: [
      "直接提问要倒装：Where did you go?（不是 Where you went?）",
      "疑问句嵌进句子里反而不倒装：I don't know where he went（不是 where did he go）。",
      "频率副词放在实义动词前、be 动词后：I often go / I am often late。",
      "多个形容词的顺序：观点 → 大小 → 年龄 → 颜色 → 来源，a nice small old brown table。",
    ],
    practice: [
      "练「你最想问某个人哪三个问题」，一次说三个直接疑问句。",
      "再练「我想知道……」句式把同样三个问题包起来，体会倒装的消失。",
      "回听时只检查疑问句，这类错在陈述句里很少出现。",
    ],
  },
  collocation: {
    why: "搭配是整块记忆，不能按字翻译。中文「开灯、学知识、身体很好」直译成"
       + " open the light / learn knowledge / my body is good 都不对，"
       + "母语者说 turn on the light / gain knowledge / I'm healthy。"
       + "这类错语法上挑不出毛病，但一听就不是母语者。",
    rules: [
      "动词+名词是一对一对记的：make a decision（不是 do）、take a photo（不是 make）、have a meeting。",
      "中文一个动词对应英语好几个：「开」= turn on（灯）/ open（门）/ drive（车）/ start（公司）。",
      "同根词不要重复：memorable memory、return back、repeat again 都是赘余。",
      "拿不准时换说法。用你确定的简单搭配，比生造一个别扭的强。",
    ],
    practice: [
      "每遇到一条搭配错误，把整个短语抄下来当一个单词记，不要拆成动词+名词分别背。",
      "练「解释你的工作是做什么的」，这种题会密集用到动宾搭配。",
      "用「更地道的说法」那个功能对照自己的原话，那里给的就是母语者的搭配。",
    ],
  },
};

// 一张知识卡：默认收起，点开才看——八类一起铺开会糊脸
function knowCard(row){
  const k = KNOW[row.key];
  const box = el("div","card");
  const head = el("button","knowhead");
  head.append(el("b", null, `${row.label}`),
              el("span","meta", `出现在 ${row.sessions} 节课 · 共 ${row.count} 次`),
              el("span","arrow", "展开"));
  const body = el("div"); body.hidden = true;
  head.onclick = () => {
    body.hidden = !body.hidden;
    head.querySelector(".arrow").textContent = body.hidden ? "展开" : "收起";
  };
  box.append(head, body);

  body.append(el("h3","kh","为什么你会错"));
  body.append(el("p","kp", k.why));

  body.append(el("h3","kh","判断规则"));
  const ol = el("ol","klist");
  k.rules.forEach(t => ol.append(el("li", null, t)));
  body.append(ol);

  const ex = (row.examples || []).filter(x => x.original && x.corrected).slice(0, 2);
  if (ex.length){
    body.append(el("h3","kh","你自己的错例"));
    ex.forEach(x => {
      const c = el("div","card"); c.style.margin = "0 0 8px";
      c.append(...pairLines(x.original, x.corrected));
      body.append(c);
    });
  }

  body.append(el("h3","kh","这周怎么练（每天 5 分钟）"));
  const ol2 = el("ol","klist");
  k.practice.forEach(t => ol2.append(el("li", null, t)));
  body.append(ol2);
  return box;
}

async function renderPat(){
  const v = $("#sg-v-pat"); v.innerHTML = "";
  const d = await patterns();
  R.weakCats = d.reliable.filter(r => r.verdict === "顽固模式").map(r => r.key);
  if (!d.n) return v.append(el("div","empty","还没有分析过任何录音。"));

  const bar = el("div","bar");
  [[d.n,"节课"],[d.total_words,"总词数"],[d.total_errors,"总错误"],
   [d.total_words ? (d.total_errors/d.total_words*100).toFixed(1) : "0","每百词"]]
    .forEach(([n,l]) => { const s = el("div","stat");
      s.append(el("b",null,n), el("span",null,l)); bar.append(s); });
  v.append(bar);

  if (d.n < 5) v.append(el("div","hint",
    `只有 ${d.n} 节课的数据。单次错误大多是噪音，跑够 8-10 节之后这页才开始有意义。`));

  const table = (rows, title, caveat) => {
    if (!rows.length) return;
    v.append(el("h2", null, title));
    if (caveat) v.append(el("div","hint",caveat));
    const box = el("div","tscroll");
    const t = el("table");
    t.innerHTML = "<tr><th>类别</th><th>总次数</th><th>出现在几节课</th><th>判定</th></tr>";
    rows.forEach(r => {
      const tr = el("tr");
      tr.append(el("td",null,r.label), el("td","num",r.count),
        el("td","num",`${r.sessions}/${d.n}`));
      const td = el("td");
      td.append(el("span","verdict"+(r.verdict==="顽固模式"?" hot":""),r.verdict));
      tr.append(td); t.append(tr);
    });
    box.append(t); v.append(box);
  };
  table(d.reliable, "反复犯的类别（可信）");
  table(d.discounted, "冠词与介词（打折看）",
    "这两类是最短最轻读的虚词，ASR 在噪声下容易整个吞掉——机器没听见会被记成你没说。数字偏高时按时间戳抽查几条再下结论。");

  const hot = d.reliable.filter(r => r.verdict === "顽固模式");
  if (hot.length){
    v.append(el("h2", null, "顽固模式的例子"));
    hot.slice(0,4).forEach(r => {
      v.append(el("h2", null, `${r.label} · ${r.count} 次`));
      r.examples.slice(0,4).forEach(x => {
        const c = el("div","card"); c.append(...pairLines(x.original, x.corrected)); v.append(c);
      });
    });
  }

  // 知道"错在哪一类"没用，得知道"为什么会错、怎么练"
  const todo = [...d.reliable, ...d.discounted]
    .filter(r => (r.verdict === "顽固模式" || r.verdict === "在形成") && KNOW[r.key])
    .sort((a, b) => b.count - a.count);
  if (todo.length){
    v.append(el("h2", null, "怎么改"));
    v.append(el("div","note",
      "只列你反复犯的那几类。一次只盯一类练，八类一起改等于没改。"));
    todo.forEach(r => v.append(knowCard(r)));
  }
}

/* ================================================================ 历史 */
async function refreshIndex(){
  S.index = await api("sessions");
  renderQuota();
}

function renderHist(){
  const v = $("#sg-v-hist"); v.innerHTML = "";
  if (!S.index.length) return v.append(el("div","empty","还没有分析过任何录音。"));
  const ul = el("ul","rowlist");
  S.index.forEach(r => {
    const li = el("li");
    li.append(el("span",null,r.name));
    li.append(el("span","meta", `${r.at.slice(0,10)} · ${r.words} 词 · ${r.errors} 处`));
    li.onclick = () => loadSession(r.hash);
    const del = el("button","ghost","删除");
    del.style.padding = "3px 9px";
    del.onclick = async ev => {
      ev.stopPropagation();
      if (!confirm(`删掉「${r.name}」？批改记录和本机录音都会删掉，不能恢复。`)) return;
      try {
        await api("session?h=" + encodeURIComponent(r.hash), { method:"DELETE" });
        await DB.del("audio", r.hash).catch(()=>{});
        await DB.del("transcripts", r.hash).catch(()=>{});
        S.cache.delete(r.hash);
        if (S.sess?.hash === r.hash) S.sess = null;
        await refreshIndex();
        renderHist();
      } catch (e){ alert(e.message); }
    };
    li.append(del);
    ul.append(li);
  });
  v.append(ul);
}

/* ================================================================ 录音
   每类至少 6 道。原来一类只有两三道，而选题又只在弱项类别里挑，
   结果「换一个题目」在两道之间来回跳。 */
const PROMPTS = [
 // 时态
 ["tense","说说你昨天做了什么，从起床讲到睡觉。","Walk me through yesterday, from waking up to going to bed."],
 ["tense","讲一件你上周完成的事，以及当时遇到的麻烦。","Tell me about something you finished last week and what went wrong."],
 ["tense","你小时候住的地方是什么样的？","What was the place you grew up in like?"],
 ["tense","讲一个你改变主意的经历——原来怎么想，后来为什么变了。","Tell me about a time you changed your mind: what you thought before and why it changed."],
 ["tense","上一个长假你是怎么过的？","How did you spend your last long holiday?"],
 ["tense","说说你学会骑车或者开车的过程。","Tell me how you learned to ride a bike or drive a car."],
 ["tense","最近一次让你意外的事是什么？当时发生了什么？","What's the most recent thing that surprised you, and what happened?"],
 // 单复数 / 可数性
 ["number","描述你办公桌上都有什么东西。","Describe everything on your desk right now."],
 ["number","你平时给家人买什么东西？为什么？","What do you usually buy for your family, and why?"],
 ["number","说说你上一次买菜买了些什么。","Talk about what you bought the last time you went grocery shopping."],
 ["number","你包里或口袋里现在装着什么？","What's in your bag or pockets right now?"],
 ["number","描述你家厨房里都有哪些东西。","Describe what's in your kitchen."],
 ["number","你收集过什么东西吗？或者家里什么东西最多？","Have you ever collected anything? What do you own the most of?"],
 // 介词
 ["preposition","不看地图，讲清楚怎么从你家走到最近的超市。","Give directions from your home to the nearest supermarket."],
 ["preposition","描述你最近一次旅行去了哪里、住在哪、怎么到的。","Describe your last trip: where you went, where you stayed, how you got there."],
 ["preposition","说说你每天上班或上学的路线。","Describe your daily commute, step by step."],
 ["preposition","描述你现在坐的这个房间，东西都放在哪。","Describe the room you're in and where things are."],
 ["preposition","讲讲你周末一般几点做什么。","Talk about what you do at different times on a weekend."],
 ["preposition","你和朋友一般约在哪见面？怎么过去？","Where do you usually meet your friends, and how do you get there?"],
 // 冠词
 ["articles","介绍一个你每天都用的东西，它长什么样、怎么用。","Describe an object you use every day and how it works."],
 ["articles","说说你最喜欢的一家餐厅，在哪、卖什么。","Talk about your favorite restaurant: where it is and what they serve."],
 ["articles","描述你住的小区或者这条街。","Describe your neighborhood or the street you live on."],
 ["articles","讲一部你最近看的电影，故事大概是什么。","Tell me about a movie you watched recently and what it's about."],
 ["articles","你有没有养过宠物？讲讲它。","Have you ever had a pet? Tell me about it."],
 ["articles","说说你用的手机或电脑，为什么选它。","Talk about the phone or computer you use and why you chose it."],
 // 情态动词
 ["modal","如果明天多出三个小时，你会做什么？为什么？","If you had three extra hours tomorrow, what would you do and why?"],
 ["modal","给一个刚入行的人三条建议。","Give three pieces of advice to someone just starting out in your field."],
 ["modal","如果可以搬去任何一个城市，你会选哪里？","If you could move to any city, where would you go?"],
 ["modal","你觉得一个人应该每天做什么才算健康？","What do you think a person should do every day to stay healthy?"],
 ["modal","中彩票的话你会怎么安排这笔钱？","If you won the lottery, what would you do with the money?"],
 ["modal","哪件事你一直想做但还没做？为什么没做？","What's something you've always wanted to do but haven't? Why not?"],
 // 语序
 ["word_order","你最想问你最崇拜的人哪三个问题？","What three questions would you ask someone you admire?"],
 ["word_order","如果要采访你自己，你会问哪些问题？","If you were interviewing yourself, what would you ask?"],
 ["word_order","你会怎么向外国朋友介绍你的城市？","How would you introduce your city to a foreign friend?"],
 ["word_order","说说你最近在纠结的一个决定，两边各是什么理由。","Talk about a decision you're torn about and the reasons on each side."],
 ["word_order","你怎么判断一个地方值不值得再去？","How do you decide whether a place is worth going back to?"],
 ["word_order","给我讲一个你听过的好笑的事。","Tell me something funny you heard recently."],
 // 搭配
 ["collocation","解释你的工作具体是做什么的，讲给完全不懂的人听。","Explain what you do at work to someone who knows nothing about it."],
 ["collocation","说说你最近在学的一样东西，学到哪儿了。","Talk about something you're learning and how far you've got."],
 ["collocation","你平时怎么安排一天的时间？","How do you organize your day?"],
 ["collocation","讲讲你怎么准备一次重要的会议或考试。","Talk about how you prepare for an important meeting or exam."],
 ["collocation","你怎么处理压力大的时候？","What do you do when you're under a lot of pressure?"],
 ["collocation","说说你做过的一个决定，后来证明是对的。","Talk about a decision you made that turned out to be right."],
 // 主谓一致
 ["agreement","你家里人各自的作息和习惯是怎样的？","Describe the daily routines and habits of the people you live with."],
 ["agreement","你的同事或同学都是些什么样的人？","What are your colleagues or classmates like?"],
 ["agreement","说说你家附近都有些什么店，分别卖什么。","Talk about the shops near your home and what each one sells."],
 ["agreement","你朋友里谁最有意思？他平时都干什么？","Who's the most interesting person among your friends, and what do they do?"],
 ["agreement","比较一下你自己和家里另一个人的性格。","Compare your personality with someone else in your family."],
 ["agreement","你们家周末一般怎么安排？","What does your family usually do on weekends?"],
];

let R = { len:180, chunks:[], rec:null, t0:0, timer:null,
          ac:null, an:null, raf:null, blob:null, peak:0, prompt:null, weakCats:[] };

/* 话题偏向弱项，但不只在弱项里打转。
   原来是"只从弱项类别出题"，弱项只剩一两类时就在两道题之间来回跳。
   现在：七成概率出弱项的题，三成出别的；而且最近出过的不重复。 */
const RECENT = [];                       // 最近几道，避免连着重复
function pickPrompt(){
  const weak = (R.weakCats || []).filter(Boolean);
  const weakPool = weak.length ? PROMPTS.filter(p => weak.includes(p[0])) : [];
  const useWeak = weakPool.length && Math.random() < 0.7;
  const src = useWeak ? weakPool : PROMPTS;
  const avoid = new Set(RECENT.slice(-Math.min(6, src.length - 1)));
  const fresh = src.filter(p => !avoid.has(p[1]) && p !== R.prompt);
  const pool = fresh.length ? fresh : src.filter(p => p !== R.prompt);
  R.prompt = (pool.length ? pool : src)[Math.floor(Math.random() * (pool.length || src.length))];
  RECENT.push(R.prompt[1]);
  if (RECENT.length > 12) RECENT.shift();
}

// 题目卡片。录音中也要一直显示——说到一半会忘了题目。
function promptCard(swappable){
  const [cat, zh, en] = R.prompt;
  const pr = el("div","prompt");
  pr.append(el("div","lab","说点什么 · 练" + (CATS[cat] || cat)));
  pr.append(el("div","q", zh));
  pr.append(el("div","en", en));
  if (swappable){
    const re = el("button","ghost re","换一个题目");
    re.onclick = () => renderRec(true);
    pr.append(re);
  }
  return pr;
}

// 只有点「换一个题目」才换题；切时长、重新录、切标签页都保留当前题目
function renderRec(newPrompt){
  const v = $("#sg-v-rec"); v.innerHTML = "";
  const box = el("div","rec");

  const seg = el("div","seg");
  [[60,"1 分钟"],[180,"3 分钟"],[300,"5 分钟"]].forEach(([s,lab]) => {
    const b = el("button",null,lab);
    b.setAttribute("aria-pressed", String(R.len === s));
    b.onclick = () => { R.len = s; renderRec(); };
    seg.append(b);
  });
  box.append(seg);

  if (newPrompt || !R.prompt) pickPrompt();
  box.append(promptCard(true));

  const go = el("button","bigbtn","开始录音");
  go.onclick = () => startRec();
  box.append(go);
  box.append(el("div","sub","录完可以先试听，满意再送去分析"));
  if (inAppBrowser()) v.append(openInBrowserTip("录音"));
  v.append(box);
  v.append(el("div","help tip",
    "想用手机自带的「语音备忘录」录也行：录完回到这里，在「批改」页点上传，选那个文件。"
    + "网页没法直接唤起系统录音 app，这是浏览器的限制。"));

  if (!window.isSecureContext)
    v.append(el("div","hint","浏览器只在 https 或 localhost 下允许录音。"));
}

async function startRec(){
  R.limit = R.len;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio:{
      echoCancellation:true, noiseSuppression:true, autoGainControl:true }});
  } catch(e){
    return $("#sg-v-rec").append(el("div","err","拿不到麦克风权限：" + e.message +
      "\n在浏览器地址栏的网站设置里允许麦克风，然后重试。"));
  }
  R.chunks = []; R.blob = null; R.peak = 0;

  const mime = ["audio/webm;codecs=opus","audio/webm","audio/mp4"]
    .find(t => window.MediaRecorder?.isTypeSupported?.(t)) || "";
  R.rec = new MediaRecorder(stream, mime ? { mimeType:mime } : undefined);
  R.rec.ondataavailable = e => { if (e.data.size) R.chunks.push(e.data); };
  R.rec.onstop = () => {
    R.blob = new Blob(R.chunks, { type: R.rec.mimeType || "audio/webm" });
    stream.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(R.raf); clearInterval(R.timer);
    R.ac?.close().catch(()=>{});
    renderReview();
  };
  R.rec.start(250);
  R.t0 = Date.now();

  // 电平表：录完才发现没声音就白花钱了
  R.ac = new (window.AudioContext || window.webkitAudioContext)();
  const src = R.ac.createMediaStreamSource(stream);
  R.an = R.ac.createAnalyser(); R.an.fftSize = 256;
  src.connect(R.an);

  renderRecording();
}

function renderRecording(){
  const v = $("#sg-v-rec"); v.innerHTML = "";
  const box = el("div","rec");
  if (R.prompt) box.append(promptCard(false));
  const clock = el("div","clock","0:00");
  const sub = el("div","sub","剩余 " + mmss(R.limit));
  const meter = el("div","meter");
  const bars = [];
  for (let i=0;i<28;i++){ const b = el("i"); bars.push(b); meter.append(b); }
  const silent = el("div","silent","");
  const stop = el("button","bigbtn stop","停止录音");
  stop.onclick = () => R.rec?.state !== "inactive" && R.rec.stop();
  box.append(clock, sub, meter, silent, stop);
  box.append(el("div","sub","到时间会自动停"));
  v.append(box);

  const buf = new Uint8Array(R.an.frequencyBinCount);
  const draw = () => {
    R.an.getByteFrequencyData(buf);
    const n = bars.length;
    let lvl = 0;
    for (let i=0;i<n;i++){
      const val = buf[Math.floor(i * buf.length / n / 2)] / 255;
      lvl = Math.max(lvl, val);
      bars[i].style.height = (4 + val * 46) + "px";
      bars[i].classList.toggle("on", val > 0.04);
    }
    R.peak = Math.max(R.peak, lvl);
    R.raf = requestAnimationFrame(draw);
  };
  draw();

  R.timer = setInterval(() => {
    const secs = Math.floor((Date.now() - R.t0) / 1000);
    const left = R.limit - secs;
    clock.textContent = mmss(secs);
    sub.textContent = "剩余 " + mmss(Math.max(0,left));
    clock.classList.toggle("warn", left <= 10);
    silent.textContent = (secs > 5 && R.peak < 0.06)
      ? "⚠ 几乎没收到声音，检查一下麦克风和系统输入音量" : "";
    if (left <= 0 && R.rec?.state !== "inactive") R.rec.stop();
  }, 250);
}

function renderReview(){
  const v = $("#sg-v-rec"); v.innerHTML = "";
  const secs = Math.round((Date.now() - R.t0) / 1000);
  const box = el("div","rec");
  if (R.prompt) box.append(promptCard(false));
  box.append(el("div","clock", mmss(secs)));
  box.append(el("div","sub",
    `约 ${(R.blob.size/1e6).toFixed(1)}MB · 先听一遍，不满意就重录`));

  const a = el("audio"); a.controls = true; a.style.width = "100%";
  a.src = URL.createObjectURL(R.blob);
  box.append(a);

  if (R.peak < 0.06)
    box.append(el("div","hint","这段几乎没有声音。送去分析大概率是白花钱，建议重录。"));
  if (secs < 25)
    box.append(el("div","hint",
      `只有 ${secs} 秒，样本太短，挑不出什么规律。建议至少说满一分钟。`));

  const row = el("div","rrow");
  const again = el("button","ghost","重新录");
  again.onclick = () => renderRec();
  const send = el("button","bigbtn","送去分析");
  send.style.padding = "14px 32px"; send.style.fontSize = "15px";
  send.onclick = () => {
    const ext = R.blob.type.includes("mp4") ? "m4a" : "webm";
    const stamp = localIso().slice(0,16).replace(/[-:T]/g,"");
    run(new File([R.blob], `自录-${stamp}.${ext}`, { type:R.blob.type }),
        { solo:true, knownSeconds: secs });
  };
  row.append(again, send);
  box.append(row);
  v.append(box);
}
/* 微信、QQ、钉钉这些 App 里的内置浏览器：既装不了主屏幕，
   麦克风也基本拿不到。国内用户多半是从微信点链接进来的，
   所以这个提示比"怎么装图标"重要得多。 */
const inAppBrowser = () =>
  /MicroMessenger|QQ\/|QQBrowser|Weibo|DingTalk|Lark|Feishu|Alipay/i.test(navigator.userAgent);
const appName = () => {
  const ua = navigator.userAgent;
  if (/MicroMessenger/i.test(ua)) return "微信";
  if (/QQ\/|QQBrowser/i.test(ua)) return "QQ";
  if (/DingTalk/i.test(ua)) return "钉钉";
  if (/Lark|Feishu/i.test(ua)) return "飞书";
  if (/Alipay/i.test(ua)) return "支付宝";
  if (/Weibo/i.test(ua)) return "微博";
  return "这个 App";
};

async function copyLink(btn){
  const url = location.origin + "/#oral";
  try {
    await navigator.clipboard.writeText(url);
    const old = btn.textContent;
    btn.textContent = "已复制 ✓";
    setTimeout(() => { btn.textContent = old; }, 2000);
  } catch {
    prompt("复制这个网址，粘到浏览器里打开：", url);
  }
}

// 在微信等内置浏览器里的引导条
function openInBrowserTip(what){
  const box = el("div","hint");
  box.append(el("div", null,
    `你现在是在${appName()}里打开的，${what}在这里${what === "录音" ? "多半用不了" : "受限"}——`
    + "点右上角的「···」，选「在浏览器中打开」（Safari 或 Chrome 都行），再继续。"));
  const r = el("div","rrow"); r.style.justifyContent = "flex-start";
  const b = el("button","ghost","复制网址");
  b.onclick = () => copyLink(b);
  r.append(b); box.append(r);
  return box;
}

/* ================================================================ 设置 */
async function renderSet(){
  const v = $("#sg-v-set"); v.innerHTML = "";
  const me = S.me || {};
  const q = me.quota || {};

  // 账号（邮箱、退出、改密码）在 GQ 侧边栏底部的账号页，这里不重复

  const pl = me.plan || {};
  const owner = pl.plan === "owner";
  const free = pl.plan === "free";
  const use = el("div","form");
  use.append(el("label", null, owner ? "你的用量（站长账号，不限额度）"
    : free ? "你的额度" : `本月用量（${q.month || ""}）`));
  use.append(el("p", null,
    owner
      ? `本月：${q.recordings || 0} 段、${q.minutes || 0} 分钟，花了 $${pl.spend_usd ?? 0}。`
        + `单次录音最长 ${pl.one_minutes ?? 60} 分钟（这是技术上限，不是额度）。`
    : free
      ? `免费体验：已用 ${pl.free_used ?? 0} / ${pl.free_total ?? 3} 次，还剩 ${pl.left ?? 0} 次。`
        + `每次录音最长 ${pl.one_minutes ?? 10} 分钟。`
      : `已用 ${q.recordings || 0} / ${q.recordings_limit || 0} 段、`
        + `${q.minutes || 0} / ${q.minutes_limit || 0} 分钟，每月 1 号重置。`
        + `单次最长 ${pl.one_minutes ?? 60} 分钟。`));

  // 费用说明：让人明白额度不是抠门，是真有成本（站长自己不用看这段）
  if (!owner) use.append(el("div","hint",
    "为什么有额度：每段录音要花两笔真钱——先把语音转成文字（按分钟计费），"
    + "再让 AI 逐句找语法错误（按字数计费）。一段 10 分钟的录音，两步加起来大约 1 块钱人民币。"
    + "这笔钱是我替你垫的，所以先给 3 次免费体验，觉得有用再谈继续。"));

  if (free){
    const up = el("div","rrow");
    const b = el("button","bigbtn", (pl.left ?? 0) > 0 ? "想长期用？" : "免费额度用完了，怎么继续");
    b.style.padding = "12px 24px"; b.style.fontSize = "14px";
    b.onclick = async () => {
      msgUp.innerHTML = "";
      b.disabled = true;
      try {
        await api("request-upgrade", { method:"POST" });   // 管理页会看到「待开通」
        msgUp.append(el("div","ok",
          "已经告诉管理员了，他看到就给你开通，一般不用等太久。"
          + (pl.contact ? `急的话直接找他：${pl.contact}。` : "")
          + "开通后每月 20 段、每次最长 60 分钟。"));
      } catch (e){
        msgUp.append(el("div","ok",
          (pl.contact ? `联系 ${pl.contact}，说一声就给你开通。` : "联系管理员开通。")
          + "开通后每月 20 段、每次最长 60 分钟。"));
      }
    };
    up.append(b); use.append(up);
  }
  const msgUp = el("div"); use.append(msgUp);
  if (me.admin) use.append(el("div","help", "全站的用量和开通请求在「管理」页。"));
  v.append(use);

  const f = el("div","form");
  f.append(el("label", null, "外教课的开场锚点句"));
  const anc = el("input"); anc.type = "text"; anc.value = LS.get("sg.anchor", CFG.ANCHOR);
  f.append(anc);
  anc.placeholder = "比如 This is Alex";
  f.append(el("div","help",
    "外教课开头说这句，工具靠它认出两个人里哪个是你。留空也行，那样每次导入会让你手动点一下。"
    + "自己一个人录用不到。"));
  const msg = el("div");
  const r1 = el("div","rrow");
  const save = el("button","bigbtn","保存");
  save.style.padding = "12px 28px"; save.style.fontSize = "15px";
  save.onclick = () => {
    msg.innerHTML = "";
    msg.append(LS.set("sg.anchor", anc.value.trim() || CFG.ANCHOR)
      ? el("div","ok","已保存。") : el("div","err","浏览器不让存数据（可能开了无痕模式）。"));
  };
  r1.append(save); f.append(r1, msg);
  v.append(f);

  const d = el("div","form");
  d.append(el("label", null, "数据"));
  d.append(el("p", null, `批改记录 ${S.index.length} 节课，存在你的账号里，换设备登录也能看到。`));
  d.append(el("div","hint",
    "录音本身只留在当前这台设备的浏览器里，不上传。所以换设备后能看到批改结果，"
    + "但点时间戳回放需要回到录音的那台设备。"));
  const local = (await DB.all("sessions")).filter(x => x && x.hash);
  const notUp = local.filter(x => !S.index.some(r => r.hash === x.hash));
  if (notUp.length){
    d.append(el("div","hint", `这台设备上还有 ${notUp.length} 节课是早期版本存在本机的，还没进账号。`));
    const b = el("button","ghost", `上传这 ${notUp.length} 节课`);
    b.onclick = async () => {
      b.disabled = true; b.textContent = "上传中…";
      let n = 0;
      for (const x of notUp){
        const { audio_path, ...clean } = x;
        try { await api("session", { method:"PUT", body: JSON.stringify({ session: clean }) }); n++; } catch {}
      }
      await refreshIndex(); show("set");
      $("#sg-v-set").prepend(el("div","ok", `上传了 ${n} 节课。`));
    };
    const row = el("div","rrow"); row.append(b); d.append(row);
  }

  const priv = el("div","form");
  priv.append(el("label", null, "你的数据在哪"));
  priv.append(el("p", null,
    "录音文件只留在你当前这台设备的浏览器里，不上传到任何地方。"
    + "转写文字和批改结果存在服务器上你自己的账号下，只有你和管理员能看到；"
    + "转写会发给 Deepgram、批改会发给 Anthropic（Claude），这两步是工具跑起来必须的。"
    + "下面的按钮可以随时把服务器上属于你的记录全部删掉。"));
  const r3 = el("div","rrow");
  const nuke = el("button","ghost","删除我的全部数据");
  nuke.style.color = "var(--bad)"; nuke.style.borderColor = "var(--bad)";
  nuke.onclick = async () => {
    if (!confirm("把服务器上你的全部批改记录删掉，同时清掉本机存的录音。不能恢复，确定？")) return;
    if (!confirm("再确认一次：真的全部删掉？")) return;
    try {
      const d = await api("delete-all", { method:"POST" });
      for (const st of ["audio","transcripts","sessions"]) await DB.clear(st).catch(()=>{});
      S.cache.clear(); S.sess = null;
      await refreshIndex();
      show("set");
      $("#sg-v-set").prepend(el("div","ok", `删掉了 ${d.deleted} 节课的记录，本机录音也清了。`));
    } catch (e){ alert(e.message); }
  };
  /* 注销账号的按钮先不给用户：后端 delete-account 接口还在（连同防刷的邮箱哈希墓碑），
     以后想开只要把按钮加回来。现在只保留「删除我的全部数据」。 */
  r3.append(nuke); priv.append(r3);
  priv.append(el("div","help","额度用量不会因为删数据而重置。"));
  v.append(priv);

  const r2 = el("div","rrow");
  const ex = el("button","ghost","导出备份");
  ex.onclick = exportBackup;
  const im = el("button","ghost","导入备份");
  im.onclick = () => $("#sg-jsonpicker").click();
  r2.append(ex, im); d.append(r2);
  d.append(el("div","help","备份是纯文字，不含录音。也能直接导入本地版 ~/.speakgrammar/sessions/ 里的 json。"));
  v.append(d);

}

/* ================================================================ 管理（只有站长看得见）
   手动收钱的闭环：用户点「想长期用」→ 这里出现「待开通」→ 你点一下「开通」。
   不用邮件来回，也不用记谁付过钱。 */
async function renderAdmin(){
  const v = $("#sg-v-adm"); v.innerHTML = "";
  if (!S.me?.admin) return v.append(el("div","empty","这页只有站长能看。"));

  const head = el("div","form");
  head.append(el("label", null, "全站花费"));
  const sum = el("div"); head.append(sum);
  v.append(head);

  const wait = el("div"); v.append(wait);

  const all = el("div","form");
  all.append(el("label", null, "所有人"));
  const box = el("div","tscroll"); all.append(box);
  v.append(all);

  const manual = el("div","form");
  manual.append(el("label", null, "按邮箱手动改（备用）"));
  const em = el("input"); em.type = "email"; em.placeholder = "他注册用的邮箱";
  manual.append(em);
  const gm = el("div");
  const gr = el("div","rrow");
  const mk = (label, plan) => {
    const b = el("button","ghost", label);
    b.onclick = async () => {
      gm.innerHTML = "";
      try {
        const d = await api("admin/set-plan", { method:"POST",
          body: JSON.stringify({ email: em.value.trim(), plan }) });
        gm.append(el("div","ok", `${d.email} 已设为 ${d.plan === "paid" ? "付费" : "免费"}。`));
        renderAdmin();
      } catch (e){ gm.append(el("div","err", e.message)); }
    };
    return b;
  };
  gr.append(mk("设为付费", "paid"), mk("改回免费", "free"));
  manual.append(gr, gm);
  v.append(manual);

  let u;
  try { u = await api("admin/usage"); }
  catch (e){ return box.append(el("div","err", e.message)); }

  sum.append(el("p", null,
    `本月全站 $${u.month_total_usd} / 上限 $${u.budget_usd}——超了除你以外所有人一起停。`));
  sum.append(el("div","help",
    `注册 ${u.users.length} 人，历史累计 $${u.total_cost_usd}。`));

  const setPlan = async (email, plan) => {
    await api("admin/set-plan", { method:"POST", body: JSON.stringify({ email, plan }) });
    renderAdmin();
  };

  // 待开通：用户自己点过「想长期用」的
  const asked = u.users.filter(r => r.requested_at && r.plan === "free");
  if (asked.length){
    const w = el("div","form");
    w.append(el("label", null, `待开通（${asked.length}）`));
    asked.forEach(r => {
      const row = el("div","rrow"); row.style.justifyContent = "flex-start";
      row.append(el("span", null, `${r.email}　申请于 ${String(r.requested_at).slice(0,10)}`));
      const b = el("button","bigbtn","开通");
      b.style.padding = "8px 18px"; b.style.fontSize = "13px";
      b.onclick = () => setPlan(r.email, "paid");
      row.append(b);
      w.append(row);
    });
    wait.append(w);
  }

  const t = el("table");
  t.innerHTML = "<tr><th>邮箱</th><th>套餐</th><th>本月段数</th><th>本月分钟</th><th>本月花费</th><th></th></tr>";
  const month = new Date().toISOString().slice(0,7);
  for (const r of u.users){
    const m = (r.usage || []).find(x => x.month === month)
      || { recordings:0, minutes:0, cost_usd:0 };
    const tr = el("tr");
    tr.append(el("td", null, r.email),
      el("td", null, r.plan === "owner" ? "站长" : r.plan === "paid" ? "付费" : "免费"),
      el("td","num", m.recordings), el("td","num", m.minutes), el("td","num", "$"+m.cost_usd));
    const td = el("td");
    if (r.plan !== "owner"){
      const b = el("button","ghost", r.plan === "paid" ? "改回免费" : "开通");
      b.style.padding = "3px 10px";
      b.onclick = () => setPlan(r.email, r.plan === "paid" ? "free" : "paid");
      td.append(b);
    }
    tr.append(td);
    t.append(tr);
  }
  box.append(t);
}

async function exportBackup(){
  const all = [];
  for (const r of S.index) all.push(await fullSession(r.hash));
  const blob = new Blob([JSON.stringify({ app:"speakgrammar", version:1,
    exported_at: localIso(), sessions: all })], { type:"application/json" });
  const a = el("a");
  a.href = URL.createObjectURL(blob);
  a.download = `spoken-grammar-备份-${localIso().slice(0,10)}.json`;
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

async function importBackup(files){
  let n = 0;
  const bad = [];
  for (const f of files){
    try {
      const d = JSON.parse(await f.text());
      const list = Array.isArray(d.sessions) ? d.sessions : [d];
      for (const x of list){
        if (!x || !x.hash || !Array.isArray(x.errors)) throw new Error("格式不对");
        const { audio_path, ...clean } = x;     // 本地版的文件路径在网页里没用
        await api("session", { method:"PUT", body: JSON.stringify({ session: clean }) });
        n++;
      }
    } catch { bad.push(f.name); }
  }
  S.cache.clear();
  await refreshIndex();
  show("set");
  const v = $("#sg-v-set");
  if (bad.length) v.prepend(el("div","err", "这些文件没导入（不是 speakgrammar 的数据）：\n" + bad.join("\n")));
  v.prepend(el("div","ok", `导入了 ${n} 节课。`));
}

/* ================================================================ 拖拽区 */
function dropZone(){
  const touch = matchMedia("(hover: none)").matches || navigator.maxTouchPoints > 0;
  const d = el("div","drop");
  d.append(el("b", null, touch ? "点这里选一段录音" : "把录音拖到这里"));
  const pl = S.me?.plan || {};
  const maxMin = pl.one_minutes ?? 10;
  d.append(el("span", null,
    pl.plan === "owner" ? `单次最长 ${maxMin} 分钟，不限次数。`
    : pl.plan === "paid" ? `单次最长 ${maxMin} 分钟，本月还剩 ${pl.left ?? 0} 段。`
    : `免费额度还剩 ${pl.left ?? 0} 次，每次最长 ${maxMin} 分钟。`));
  d.append(el("span", null, touch
    ? "手机上：选「浏览 / Choose File」，去「语音备忘录」或「文件」里找那段录音（m4a / mp3 / wav）。"
    : "支持 m4a / mp3 / wav。外教课开头记得说锚点句。"));
  d.onclick = () => $("#sg-picker").click();
  ["dragenter","dragover"].forEach(ev => d.addEventListener(ev, e => {
    e.preventDefault(); d.classList.add("hot"); }));
  ["dragleave","drop"].forEach(ev => d.addEventListener(ev, e => {
    e.preventDefault(); d.classList.remove("hot"); }));
  d.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) run(f); });
  const box = el("div");
  box.append(d);
  return box;
}

/* ================================================================ 载入 */
async function loadSession(h){
  let d;
  try { d = await fullSession(h); }
  catch (e){ $("#sg-v-fix").innerHTML = ""; $("#sg-v-fix").append(el("div","err", e.message)); return; }
  S.sess = d;
  $("#sg-pnm").textContent = d.audio_name;
  if (S.audioUrl) URL.revokeObjectURL(S.audioUrl);
  const a = await DB.get("audio", h);
  S.noAudio = !a;
  S.audioUrl = a ? URL.createObjectURL(new Blob([a.buf], { type: a.type || "audio/mp4" })) : null;
  const au = $("#sg-au");
  if (S.audioUrl) au.src = S.audioUrl; else au.removeAttribute("src");
  au.load();
  show("fix");
}


/* ================================================================ 外壳：额度、标签、启动 */

// 独立版顶栏那排 pill 的替代：只留额度一项，点它去设置页看明细
function renderQuota(){
  const me = S.me; if (!me) return;
  $('#sg-tabs button[data-t="adm"]').hidden = !me.admin;
  const box = $("#sg-quota"); box.innerHTML = "";
  const pl = me.plan || {};
  const owner = pl.plan === "owner";
  const free = pl.plan === "free";
  const left = pl.left ?? 0;
  const b = owner
    ? el("span","pill click on", `站长账号 · 本月花了 $${pl.spend_usd ?? 0}`)
    : el("span","pill click " + (left > (free ? 0 : 3) ? "on" : "off"),
        left > 0
          ? (free ? `免费体验还剩 ${left} 次` : `本月还能录 ${left} 段`)
          : (free ? "免费体验用完了" : "本月额度用完了"));
  b.title = "额度明细";
  b.onclick = () => show("set");
  box.append(b);
  if (!me.configured?.asr || !me.configured?.llm)
    box.append(el("span","pill off","服务端 key 没配好"));
}

function show(t){
  if (S.tab !== t) window.scrollTo(0, 0);
  S.tab = t;
  ROOT.querySelectorAll("#sg-tabs button").forEach(b =>
    b.setAttribute("aria-selected", String(b.dataset.t === t)));
  ["home","fix","rec","text","pat","hist","set","adm"].forEach(x => $("#sg-v-"+x).hidden = x !== t);
  ({ home:renderHome, fix:renderFix, rec:renderRec, text:renderText, pat:renderPat,
     hist:renderHist, set:renderSet, adm:renderAdmin })[t]();
}

// ROOT 里的事件只绑一次（ROOT 本身常驻，绑多了会重复触发）
function wire(){
  $("#sg-tabs").onclick = e => { const b = e.target.closest("button"); if (b) show(b.dataset.t); };
  $("#sg-picker").onchange = e => { const f = e.target.files[0]; if (f) run(f); e.target.value = ""; };
  $("#sg-jsonpicker").onchange = e => { const fs = [...e.target.files];
    if (fs.length) importBackup(fs); e.target.value = ""; };
  $("#sg-newbtn").onclick = () => $("#sg-picker").click();
}

/* 把录音拖进页面任何地方都能导入（独立版的行为）。
   监听挂在 document 上、整个网站只挂一次，而且只在口语实战场显示着的时候才管事——
   GQ 自己的排序题也用拖拽，不能被这里拦掉。 */
const onScreen = () => !!ROOT && ROOT.isConnected;
["dragenter","dragover","drop"].forEach(ev =>
  document.addEventListener(ev, e => {
    if (onScreen() && e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  }));
document.addEventListener("drop", e => {
  if (!onScreen() || e.target.closest(".drop")) return;
  const f = e.dataTransfer?.files?.[0]; if (f) run(f);
});

async function boot(){
  try { S.me = await api("me"); }
  catch (e){
    show("home");
    const v = $("#sg-v-home"); v.innerHTML = "";
    v.append(el("div","err", e.message));
    return;
  }
  $("#sg-player").hidden = false;
  renderQuota();
  try { await refreshIndex(); }
  catch (e){ show("fix"); $("#sg-v-fix").innerHTML = ""; $("#sg-v-fix").append(el("div","err", e.message)); return; }
  show("home");
  // 顽固模式要读全部课程，慢，所以后台算，算完再刷首页那一块
  patterns().then(d => {
    R.weakCats = d.reliable.filter(r => r.verdict === "顽固模式").map(r => r.key);
    if (S.tab === "home") renderHome();
  }).catch(()=>{});
}
