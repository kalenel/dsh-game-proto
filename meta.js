/* ============================================================================
 * 《合成塔》元游戏层  meta.js   —— 零 DOM 依赖的纯逻辑模块
 * ============================================================================
 *
 * 为什么有这个文件
 * ----------------
 * 1. 分层（《游戏开发工作流程.md》§1.3：逻辑与表现分离）
 *    存档 / 星尘 / 主题 / 商店 / 每日挑战 / 统计 —— 这些都不需要像素，
 *    却和渲染代码混在同一个 HTML 里，导致它们**无法被测试**。
 *    上一轮 49 项测试全绿却漏掉 `gemName is not defined`，根因就是
 *    "只检查字符串是否存在、从不执行代码"。本文件把可执行逻辑抽出来，
 *    让 Node 能在没有任何浏览器的情况下把它真的跑一遍。
 *
 * 2. 协作（并发编辑隔离）
 *    表现层工程师与元游戏工程师若同时编辑同一个 HTML，
 *    上轮已发生互相覆盖。元游戏全部收敛到本文件后，两边不再碰同一处。
 *
 * 加载方式（两种都支持，file:// 直接打开也能用）
 * ---------------------------------------------
 *   浏览器（推荐，file:// 可用）：<script src="meta.js"></script> → globalThis.MergeMeta
 *   Node ESM：  const M = (await import('./meta.js')).default
 *   Node CJS：  const M = require('./meta.js')
 *   ⚠️ 浏览器不要用 <script type="module">：file:// 下 ESM 会被 CORS 拦掉，
 *      而「手机离线双击打开」是本项目的硬约束。所以这里用 UMD 而非纯 ESM。
 *
 * 本文件不出现的浏览器对象：document / window / self / navigator / location。
 * 唯一被访问的宿主能力是 globalThis.localStorage（且在 Node 里会安全降级为内存存储），
 * 因此整个文件可以在 Node 里 import 并单测 —— 见 spike/test-meta.mjs。
 *
 * 存档键沿用 tower5 的 'merge_tower_v5'，老存档可无损迁移（见 migrate）。
 * ==========================================================================*/

(function (root, factory) {
  /* eslint-disable no-undef */
  if (typeof module === 'object' && module && module.exports) module.exports = factory();
  else root.MergeMeta = factory();
  /* eslint-enable no-undef */
})(typeof globalThis !== 'undefined' ? globalThis : {}, function () {
  'use strict';

  var SAVE_KEY = 'merge_tower_v5';
  var SAVE_VERSION = 2;

  /* ======================================================================
     一、主题表（点缀玩法的落点）
     ======================================================================
     设计约束：
       · 'origin' 必须与现网视觉基线**逐字节相同**（背景/棋盘/方块/强调色），
         否则选了默认主题反而改变外观，会打破既有 13 项 smoke 断言。
         这里抄的是 tower5.html 的实测值：body #12111E、#board #191728、
         COLORS 数组 10 色、强调色 #FFD479 / #6FD8C8。
       · 每个主题的 gems 必须是 10 色，与 GEMS 表（1~10 级）一一对应。

     价格不是拍脑袋，是用真实引擎跑出来的，见下方 DUST_CALIBRATION。
     ====================================================================== */
  var ORIGIN_GEMS = ['#B9B2C8', '#B07BE8', '#7FD8E8', '#4FC98A', '#E8506B',
                     '#F0B429', '#3A6BE0', '#DCE8F5', '#E857B8', '#FFD479'];

  var THEMES = [
    {
      id: 'origin', name: '原色', price: 0,
      desc: '默认配色，与当前线上版本完全一致',
      colors: {
        bg: '#12111E', text: '#EDEAF5', muted: '#8E88A8', faint: '#565073',
        panel: '#221F36', panelRing: '#37335A',
        board: '#191728', boardRing: '#262340', cell: 'rgba(255,255,255,.035)',
        accent: '#FFD479', accent2: '#6FD8C8',
        danger: '#FF6B6B', win: '#FFD479', lose: '#FF8A8A',
        bonusCol: '#FFD479', recycleCol: '#6FD8C8',
        comboBar: ['#8B7BF7', '#FF9BD0', '#FFD479'],
        gems: ORIGIN_GEMS
      }
    },
    {
      id: 'neon', name: '霓虹', price: 60,
      desc: '夜店霓虹，方块会发光',
      colors: {
        bg: '#0A0618', text: '#F2ECFF', muted: '#9C8FC0', faint: '#5B4E80',
        panel: '#1B1233', panelRing: '#3A2A63',
        board: '#120C24', boardRing: '#2E2050', cell: 'rgba(180,140,255,.06)',
        accent: '#00E5FF', accent2: '#FF2D95',
        danger: '#FF3B5C', win: '#00E5FF', lose: '#FF5C7A',
        bonusCol: '#FFE600', recycleCol: '#39FF14',
        comboBar: ['#B026FF', '#FF2D95', '#00E5FF'],
        gems: ['#8A7BA8', '#B026FF', '#00E5FF', '#39FF14', '#FF3B5C',
               '#FFE600', '#2D6BFF', '#C8FFFF', '#FF2D95', '#FFD400']
      }
    },
    {
      id: 'mineral', name: '矿物', price: 200,
      desc: '岩层与矿脉，暖色调',
      colors: {
        bg: '#171512', text: '#F0E9DC', muted: '#9C9081', faint: '#60584C',
        panel: '#2B2620', panelRing: '#453D33',
        board: '#221E19', boardRing: '#3A332A', cell: 'rgba(240,210,150,.05)',
        accent: '#E0B15C', accent2: '#7FBF9A',
        danger: '#E05A3C', win: '#E0B15C', lose: '#E0846A',
        bonusCol: '#F0C868', recycleCol: '#7FBF9A',
        comboBar: ['#8C6A3A', '#D6A94C', '#F0C868'],
        gems: ['#8C8577', '#B07BD8', '#5E7FA8', '#6FBF9B', '#B03A4A',
               '#D6B23C', '#3A6FA8', '#E6E0D4', '#C4708F', '#F0C868']
      }
    },
    {
      id: 'midnight', name: '深夜', price: 600,
      desc: '凌晨三点的深蓝，最安静的一套',
      colors: {
        bg: '#070B18', text: '#E6ECFA', muted: '#8394B8', faint: '#4A5878',
        panel: '#141C33', panelRing: '#26314F',
        board: '#0E1526', boardRing: '#1E2942', cell: 'rgba(140,180,255,.05)',
        accent: '#7AA2FF', accent2: '#4DD8C0',
        danger: '#FF6B7A', win: '#7AA2FF', lose: '#FF8A96',
        bonusCol: '#FFD479', recycleCol: '#4DD8C0',
        comboBar: ['#3A5BA8', '#7AA2FF', '#4DD8C0'],
        gems: ['#7C89A8', '#9B7BE8', '#5FC8E8', '#4DC98A', '#E8506B',
               '#E8B44A', '#3A6BE0', '#DCE8F5', '#D07BD8', '#FFD479']
      }
    }
  ];

  /* ----------------------------------------------------------------------
     星尘收入实测表（价格校准的依据，必须可复算）
     ----------------------------------------------------------------------
     测量方法（2026 轮次，只读未改 tower5.html）：
       1. 从 spike/proto/tower5.html 里 eval 出真实的 Logic 模块（16 关关卡表 + 落子规则）
       2. 用 5 种 AI 策略（均衡/压高度/求势能/贪高分/拼连击）逐关自动通关取中位数
       3. 星尘公式与 tower5 win() 完全一致：max(5, round(score/80))
       4. 每天首局另有连胜奖励 +min(streak,15)*2

     ★ 本表的唯一权威复算入口是 spike/recalib-meta.mjs（只读 eval tower5.html）：
          node spike/recalib-meta.mjs           # 打印实测表
          node spike/recalib-meta.mjs --check   # 与下面两个数组比对，不一致 exit 1
       test-meta.mjs 的 G6 会在单测里调用它做**跨文件**复算，
       所以这里不再是"两个手写数组互相自洽"的循环自证。

     ⚠️ 量级归一化（否则"5 策略取中位数"是假的）：
       原始权重把 mx 项写成 mx*w.mx*1000，量级约 3000~7000，
       而 potential/vertical 项只有几百 —— 结果是 16 关里有 14 关
       五套策略**得分完全相同**（策略签名去重仅 3/5），中位数实际退化成 1 策略。
       recalib-meta.mjs 把 pot/vert 抬到同量级后：签名去重 5/5、得分分叉 6/16。
       该脚本内置 assertDivergence()，一旦再退化就直接抛错而不是算个假中位数。

     实测（中位玩家，首通）：
       第 1 关   5   第 5 关   6   第 9 关   5   第 13 关  10
       第 2 关   5   第 6 关   5   第 10 关 14   第 14 关  41
       第 3 关  15   第 7 关  51   第 11 关 64   第 15 关  16
       第 4 关   5   第 8 关  10   第 12 关 20   第 16 关 211

     ⚠️ 两种口径必须分开写，混用会让数字对不上（历史教训：注释里曾写"全通 666"，
        而 666 在任何口径下都复算不出来：单日每日挑战奖励上限是
        6+10+16+18+6=56，纯主线 483 + 56 = 539 才是含每日挑战的天花板）。
        复算方式见 spike/recalib-meta.mjs 与 test-meta.mjs 的 G3b/G6。

       口径 A「纯主线」（只累加 perLevel，不含任何每日挑战奖励）：
         累计 1关 5 → 4关 30 → 7关 92 → 11关 185 → 全通 483
       口径 B「含每日挑战」（按 medianScore 连打 16 关，won:true，
         与 test-meta.mjs 的 simulateFirstDay 同口径；实测跨 120 个日期恒定）：
         累计 1关 5 → 4关 30 → 7关 102 → 11关 241 → 全通 539

     定价推导（两套口径的实测值，均可复算）：
       霓虹   60 = 第 7 关的累计（口径 A 92 / 口径 B 102；首次游戏当天就能买到
                  → 立刻建立"星尘有出口"的认知）
       矿物  200 = 第 11 关（口径 A 185 / 口径 B 241）
       深夜  600 = 口径 B 全通 539 也买不起（差 61），必须靠每日挑战攒
     反例保证：三个主题总价 860 > 主线全通 483（纯主线）/ 539（含每日挑战），
       所以**不可能只靠通关全解锁**。
     ---------------------------------------------------------------------- */
  var DUST_CALIBRATION = {
    formula: 'max(5, round(score/80))',
    perLevel: [5, 5, 15, 5, 6, 5, 51, 10, 5, 14, 64, 20, 10, 41, 16, 211],
    // 产生上面每个星尘值的「该关中位分」（AI 实跑中位数，原始测量数据）
    medianScore: [0, 0, 1200, 420, 490, 360, 4080, 770, 410, 1110, 5080, 1600, 810, 3310, 1300, 16880],
    measuredBy: 'spike/recalib-meta.mjs 只读 eval tower5.html 的真实 Logic + 5 策略实跑中位数',
    firstThemeLevel: 7   // 打通第 7 关（口径A 92 / 口径B 102）即可买下第一个主题『霓虹』60
  };

  /* 每日挑战：奖励配置（星尘出口的第二条水源） */
  var DAILY_REWARDS = { task: [6, 10, 16], allClear: 18, streakPerDay: 6, streakCapDays: 5 };
  // 单日满清 = 6+10+16+18 = 50，再加连胜 6*min(streak,5)

  /* ======================================================================
     二、存储后端（可注入）
     ======================================================================
     localStorage 在 Node 里不存在；Safari 无痕模式下 setItem 会抛异常。
     两者都必须降级成内存存储，而不能让页面白屏。
     ====================================================================== */
  function memoryStorage() {
    var m = Object.create(null);
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; },
      __memory: true
    };
  }

  function defaultStorage() {
    try {
      var g = (typeof globalThis !== 'undefined') ? globalThis : null;
      var ls = g && g.localStorage;                       // 不写裸标识符，Node 里不会 ReferenceError
      if (!ls || typeof ls.getItem !== 'function' || typeof ls.setItem !== 'function') return memoryStorage();
      var probe = '__merge_tower_probe__';
      ls.setItem(probe, '1');                             // 无痕模式在这里抛异常
      ls.removeItem(probe);
      return ls;
    } catch (e) {
      return memoryStorage();
    }
  }

  function coerceStorage(s) {
    if (s && typeof s.getItem === 'function' && typeof s.setItem === 'function') return s;
    // ⚠️ 这里必须走 defaultStorage()，**不能**直接 return memoryStorage()。
    // 踩过的坑：早先写成 memoryStorage()，于是浏览器里 createMeta() 不传 storage 时
    // 悄悄用了内存后端 —— 存档永远不落盘，玩家每次重开都从零开始，
    // 而页面毫无报错。单测 A7 现在专门盯着这条路径。
    return defaultStorage();
  }

  /* ======================================================================
     三、小工具（与 tower5 Logic 里的实现同构，避免两套日期/哈希语义）
     ====================================================================== */

  /* 与 Logic.hashStr 逐位一致：FNV-1a 32 位。纯整数运算，跨平台确定。 */
  function hashStr(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* 由 (日期, 盐) 确定性地取一个 [0,1) 的数 —— 同一天所有人拿到同一套目标 */
  function rand01(seed, salt) { return hashStr(seed + '|' + salt) / 4294967296; }
  function pickIndex(seed, salt, n) { return Math.min(n - 1, Math.floor(rand01(seed, salt) * n)); }

  /* 本地日期 'YYYY-MM-DD'（与 tower5 dayKey 同语义：用本地时区，跨日按手机时钟） */
  function dateKey(d) {
    return d.getFullYear() + '-' +
      ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
      ('0' + d.getDate()).slice(-2);
  }
  function shiftDay(d, off) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + off);
    return x;
  }

  function isPlainObject(o) {
    return !!o && typeof o === 'object' && Object.prototype.toString.call(o) === '[object Object]';
  }
  function toInt(v, dflt) {
    var n = (typeof v === 'number') ? v : parseInt(v, 10);
    if (!isFinite(n)) return dflt;
    return Math.floor(n);
  }
  function clampInt(v, lo, hi, dflt) {
    var n = toInt(v, dflt);
    if (n < lo) return lo;
    if (n > hi) return hi;
    return n;
  }
  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

  /* ======================================================================
     四、每日挑战：按日期确定性生成 3 项目标
     ======================================================================
     目标必须「跨关卡累计」而不是「在某关内完成」，原因：
       · 每日挑战要对新玩家可用 —— 新号还没解锁第 10 关，就不该被要求"合出 6 级"
       · 通关进度不应该成为每日挑战的门槛
     所以三项分别是：今天最高合到 N 级 / 今天触发 X 次连锁 / 今天累计 S 分。
     ====================================================================== */
  var DAILY_LEVEL_CHOICES = [5, 6, 7];
  var DAILY_CHAIN_CHOICES = [2, 3, 4];
  var DAILY_SCORE_CHOICES = [6000, 8000, 10000, 12000];

  function makeDaily(dateKeyStr) {
    var lv = DAILY_LEVEL_CHOICES[pickIndex(dateKeyStr, 'lv', DAILY_LEVEL_CHOICES.length)];
    var ch = DAILY_CHAIN_CHOICES[pickIndex(dateKeyStr, 'chain', DAILY_CHAIN_CHOICES.length)];
    var sc = DAILY_SCORE_CHOICES[pickIndex(dateKeyStr, 'score', DAILY_SCORE_CHOICES.length)];
    return {
      date: dateKeyStr,
      tasks: [
        { id: 'level',  kind: 'level',  target: lv, reward: DAILY_REWARDS.task[0],
          text: '今天合出一个 ' + lv + ' 级方块' },
        { id: 'chain',  kind: 'chain',  target: ch, reward: DAILY_REWARDS.task[1],
          text: '今天触发 ' + ch + ' 次连锁' },
        { id: 'score',  kind: 'score',  target: sc, reward: DAILY_REWARDS.task[2],
          text: '今天累计拿到 ' + sc + ' 分' }
      ]
    };
  }

  /* ======================================================================
     五、存档：默认值 / 读取 / 迁移 / 修复 / 写入
     ====================================================================== */
  function defaultState() {
    return {
      v: SAVE_VERSION,
      unlocked: 0,
      bestScore: 0,
      dust: 0,
      streak: 0,            // 每日首胜的连续打卡天数（沿用 tower5 语义）
      lastDay: '',
      codexSeen: {},
      theme: 'origin',
      themes: ['origin'],
      stats: {
        games: 0, wins: 0, losses: 0,
        bestLevel: 0, bestChain: 0, bestCombo: 0,
        totalScore: 0, totalDust: 0,
        dailyCleared: 0, dailyStreak: 0, lastDailyDate: ''
      },
      daily: { date: '', progress: { level: 0, chain: 0, score: 0 }, done: {}, claimed: false }
    };
  }

  function isThemeId(id) { return THEMES.some(function (t) { return t.id === id; }); }

  /*
    修复：任何字段形状不对都就地改成合法值，**绝不抛异常**。
    这是"存档坏了就白屏"这个静默失败的最后一道防线 —— 宁可丢一点进度，
    也不能让玩家打不开游戏。返回修复后的对象（可能与入参同一个引用）。
  */
  function repair(raw, maxLevelIndex) {
    var s = defaultState();
    if (!isPlainObject(raw)) return s;

    s.unlocked = clampInt(raw.unlocked, 0, maxLevelIndex, 0);
    s.bestScore = Math.max(0, toInt(raw.bestScore, 0));
    s.dust = Math.max(0, toInt(raw.dust, 0));
    s.streak = Math.max(0, toInt(raw.streak, 0));
    s.lastDay = (typeof raw.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastDay)) ? raw.lastDay : '';

    // codexSeen 只接受「数字键 → 真值」，其余一律丢弃。
    // 这不只是洁癖：JSON.parse('{"__proto__":1}') 会产生一个名为 __proto__ 的
    // **自有属性**，随后 Object.assign({}, seen) 走 [[Set]] 会改写原型链
    // （原型污染）。白名单数字键从根上堵掉这条路。
    if (isPlainObject(raw.codexSeen)) {
      var seen = {};
      Object.keys(raw.codexSeen).forEach(function (k) {
        if (/^\d+$/.test(k) && raw.codexSeen[k]) seen[k] = 1;
      });
      s.codexSeen = seen;
    }

    s.theme = (typeof raw.theme === 'string' && isThemeId(raw.theme)) ? raw.theme : 'origin';

    var owned = ['origin'];
    if (Array.isArray(raw.themes)) {
      raw.themes.forEach(function (t) { if (isThemeId(t) && owned.indexOf(t) < 0) owned.push(t); });
    }
    // 历史遗留：老版本没有 themes 字段但存了 theme —— 视为已拥有，避免"选中的主题丢了"
    if (owned.indexOf(s.theme) < 0) owned.push(s.theme);
    s.themes = owned;

    if (isPlainObject(raw.stats)) {
      var st = raw.stats;
      s.stats.games = Math.max(0, toInt(st.games, 0));
      s.stats.wins = Math.max(0, toInt(st.wins, 0));
      s.stats.losses = Math.max(0, toInt(st.losses, 0));
      s.stats.bestLevel = Math.max(0, toInt(st.bestLevel, 0));
      s.stats.bestChain = Math.max(0, toInt(st.bestChain, 0));
      s.stats.bestCombo = Math.max(0, toInt(st.bestCombo, 0));
      s.stats.totalScore = Math.max(0, toInt(st.totalScore, 0));
      s.stats.totalDust = Math.max(0, toInt(st.totalDust, 0));
      s.stats.dailyCleared = Math.max(0, toInt(st.dailyCleared, 0));
      s.stats.dailyStreak = Math.max(0, toInt(st.dailyStreak, 0));
      s.stats.lastDailyDate = (typeof st.lastDailyDate === 'string') ? st.lastDailyDate : '';
    }

    if (isPlainObject(raw.daily) && /^\d{4}-\d{2}-\d{2}$/.test(String(raw.daily.date))) {
      s.daily.date = raw.daily.date;
      if (isPlainObject(raw.daily.progress)) {
        s.daily.progress.level = Math.max(0, toInt(raw.daily.progress.level, 0));
        s.daily.progress.chain = Math.max(0, toInt(raw.daily.progress.chain, 0));
        s.daily.progress.score = Math.max(0, toInt(raw.daily.progress.score, 0));
      }
      if (isPlainObject(raw.daily.done)) s.daily.done = raw.daily.done;
      s.daily.claimed = raw.daily.claimed === true;
    }
    return s;
  }

  /* ======================================================================
     六、工厂
     ======================================================================
     createMeta({ storage, now, key, maxLevelIndex })
       storage        可注入；默认 globalThis.localStorage，不可用则内存
       now            可注入；返回 Date 或毫秒数（测试里用来"跨日"）
       key            存档键；默认沿用 tower5 的 'merge_tower_v5'
       maxLevelIndex  最后一关的下标；tower5 是 15（16 关）
     ====================================================================== */
  function createMeta(opts) {
    opts = opts || {};
    var storage = coerceStorage(opts.storage);
    var key = opts.key || SAVE_KEY;
    var maxLevelIndex = Math.max(0, toInt(opts.maxLevelIndex, 15));
    var requireExplicitWon = opts.requireExplicitWon === true;
    var nowFn = (typeof opts.now === 'function') ? opts.now : function () { return new Date(); };

    function now() {
      var r = nowFn();
      return (r instanceof Date) ? r : new Date(r);
    }
    function today() { return dateKey(now()); }

    /* ---------- 读 ---------- */
    var state;
    var loadError = null;      // 诊断用：上次读取是否走了兜底
    function load() {
      loadError = null;
      var raw = null;
      try {
        raw = storage.getItem(key);
      } catch (e) {
        loadError = 'read:' + (e && e.message);
        state = defaultState();
        return state;
      }
      if (raw === null || raw === undefined || raw === '') { state = defaultState(); return state; }
      var parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        loadError = 'parse:' + (e && e.message);
        state = defaultState();               // 损坏 → 全新开局，而不是抛异常
        return state;
      }
      state = repair(parsed, maxLevelIndex);  // 形状不对 → 就地修复
      return state;
    }

    /* ---------- 写 ---------- */
    var writeError = null;
    function save() {
      writeError = null;
      try {
        storage.setItem(key, JSON.stringify(state));
        return true;
      } catch (e) {
        writeError = 'write:' + (e && e.message); // 配额满/无痕模式：内存里继续跑，不崩
        return false;
      }
    }

    /* ---------- 每日挑战：惰性跨日重置 ----------
       注意：这里**不调 save()** —— 读操作不应该产生写副作用（否则只打开一次
       游戏就会写盘）。跨日重置后的新状态会在下一次任何写操作时一起落盘；
       即使玩家当天没玩就关掉，下次打开时 makeDaily(新日期) 仍会生成同一套目标
       （确定性保证），所以"没落盘"不会导致目标漂移。 */
    function syncDaily() {
      var t = today();
      if (state.daily.date !== t) {
        state.daily = {
          date: t, progress: { level: 0, chain: 0, score: 0 }, done: {}, claimed: false,
          tasks: makeDaily(t).tasks
        };
      }
      if (!state.daily.tasks || !state.daily.tasks.length) {
        state.daily.tasks = makeDaily(t).tasks;   // 老存档 daily 形状不全时补齐
      }
      return t;
    }

    /* ---------- 主题访问 ---------- */
    function owned(id) { return state.themes.indexOf(id) >= 0; }
    function findTheme(id) {
      for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
      return null;
    }
    /*
      返回**隔离副本**：colors 必须深一层拷贝（含数组字段 slice）。
      踩过的坑：早先直接返回 t.colors 的引用，表现层只要做一次"就地调色"
      （例如按当前主题混色、把 gems 规范化成 rgba），就会永久改掉全局 THEMES 表，
      之后所有实例、所有存档看到的配色都被污染，且**完全不报错**。
      gems / comboBar 是数组，浅拷贝对象还不够，必须单独 slice。
    */
    function copyColors(c) {
      var o = Object.assign({}, c);
      if (Array.isArray(c.gems)) o.gems = c.gems.slice();
      if (Array.isArray(c.comboBar)) o.comboBar = c.comboBar.slice();
      return o;
    }
    function themeView(t) {
      return {
        id: t.id, name: t.name, price: t.price, desc: t.desc,
        colors: copyColors(t.colors),
        owned: owned(t.id),
        selected: state.theme === t.id,
        affordable: state.dust >= t.price
      };
    }

    /* ---------- 星尘 ---------- */
    function addDust(n) {
      var d = toInt(n, 0);
      if (d <= 0) return state.dust;
      state.dust += d;
      state.stats.totalDust += d;
      save();
      return state.dust;
    }
    function spendDust(n) {
      var d = toInt(n, 0);
      if (!isFinite(d) || d <= 0) return { ok: false, reason: 'invalid', balance: state.dust, spent: 0 };
      if (state.dust < d) return { ok: false, reason: 'insufficient', balance: state.dust, spent: 0, short: d - state.dust };
      state.dust -= d;
      save();
      return { ok: true, balance: state.dust, spent: d };
    }

    /* ---------- 商店 ---------- */
    function buyTheme(id) {
      var t = findTheme(id);
      if (!t) return { ok: false, reason: 'unknown_theme', balance: state.dust };
      if (owned(id)) return { ok: false, reason: 'already_owned', balance: state.dust, theme: themeView(t) };
      if (state.dust < t.price) {
        return { ok: false, reason: 'insufficient', balance: state.dust, short: t.price - state.dust, theme: themeView(t) };
      }
      state.dust -= t.price;
      state.themes.push(id);
      save();   // totalDust 记录"累计获得"，不因消费回退 —— 它与余额是两个指标
      return { ok: true, reason: '', balance: state.dust, spent: t.price, theme: themeView(t) };
    }

    function selectTheme(id) {
      if (!isThemeId(id)) return { ok: false, reason: 'unknown_theme' };
      if (!owned(id)) return { ok: false, reason: 'locked' };
      state.theme = id;
      save();
      return { ok: true, theme: themeView(findTheme(id)) };
    }

    /* ---------- 图鉴（codexSeen） ----------
       tower5/tower6 原本自己读写 localStorage 的 codexSeen，接线到 meta.js 之后
       必须走这里 —— 否则两套存档互相覆盖：HTML 那份只写 6 个字段，
       会把 meta.js 的 themes / stats / daily 全部抹掉（实测：一次 save() 之后
       dust 归 0、已购主题丢失）。
       所以这两个写入口内部一定调 save()，且只增不减。 */
    function getCodexSeen() {
      return Object.assign({}, state.codexSeen);
    }
    /* 单个等级：首次发现返回 true（表现层据此播"新图鉴"提示），重复返回 false */
    function markCodexSeen(level) {
      var lv = toInt(level, -1);
      if (lv < 0) return false;
      var k = String(lv);
      if (state.codexSeen[k]) return false;
      state.codexSeen[k] = 1;
      save();
      return true;
    }
    /* 整表合并（从老存档/外部批量导入）：只并入合法键，不删除已有键。
       键必须是纯数字（与 repair 的白名单一致）—— 否则这里写进去、
       下次 reload 又被 repair 丢掉，出现"写成功但读不回"的静默不一致。 */
    function setCodexSeen(obj) {
      if (!isPlainObject(obj)) return getCodexSeen();
      Object.keys(obj).forEach(function (k) {
        if (/^\d+$/.test(k) && obj[k]) state.codexSeen[k] = 1;
      });
      save();
      return getCodexSeen();
    }
    function codexSeenCount() {
      return Object.keys(state.codexSeen).filter(function (k) { return !!state.codexSeen[k]; }).length;
    }

    /* ---------- 关卡 ---------- */
    function setUnlocked(n) {
      var v = clampInt(n, 0, maxLevelIndex, 0);
      if (v > state.unlocked) { state.unlocked = v; save(); }
      return state.unlocked;
    }

    /* ==================================================================
       七、一局结束：唯一入口 applyRun
       ==================================================================
       表现层只需要在每局结束时调用一次，它负责：
         星尘结算（含每日首胜连胜）→ 统计 → 每日挑战进度/发奖 → 落盘
       ================================================================== */
    function applyRun(run) {
      run = isPlainObject(run) ? run : {};
      /*
        ⚠️ won 的契约（接线方必须知道，test-meta.mjs 的 F6/F7 把它钉死）：
          · 漏传 won 等价于 won:true —— 失败局会被当成过关发星尘。
          · applyRun 不是幂等的：同一局调用两次会重复发放过关星尘。
            所以表现层「一局结束只调一次」，别在结算界面重绘时再调。
        默认保留"漏传=true"（向后兼容 t2 已公布的接口），
        但接线方可以开 createMeta({ requireExplicitWon: true }) 把它变成硬错误，
        漏传时立刻抛错而不是静默多发星尘。
      */
      if (requireExplicitWon && run.won !== true && run.won !== false) {
        throw new Error('applyRun: requireExplicitWon=true 时必须显式传 won（true/false）；' +
          '漏传会被当成过关，让失败局也发星尘');
      }
      var score = Math.max(0, toInt(run.score, 0));
      var maxLevel = Math.max(0, toInt(run.maxLevel, 0));
      var chains = Math.max(0, toInt(run.chains, 0));
      var combo = Math.max(0, toInt(run.combo, 0));
      var won = run.won !== false;             // 默认按过关处理（与 tower5 win() 对齐）

      var out = {
        dustGained: 0, dustFromWin: 0, dustFromStreak: 0,
        dustFromDaily: 0, dustFromDailyStreak: 0,
        records: [], daily: null, dailyCleared: false, dailyTasksDone: []
      };

      state.stats.games++;
      state.stats.totalScore += score;
      if (maxLevel > state.stats.bestLevel) { state.stats.bestLevel = maxLevel; out.records.push('bestLevel'); }
      if (chains > state.stats.bestChain) { state.stats.bestChain = chains; out.records.push('bestChain'); }
      if (combo > state.stats.bestCombo) { state.stats.bestCombo = combo; out.records.push('bestCombo'); }
      if (score > state.bestScore) { state.bestScore = score; out.records.push('bestScore'); }

      if (won) {
        state.stats.wins++;
        // 星尘公式与 tower5 win() 完全一致，保持经济连续性
        var gained = Math.max(5, Math.round(score / 80));
        out.dustFromWin = gained;

        var t = today();
        if (state.lastDay !== t) {
          if (state.lastDay === dateKey(shiftDay(now(), -1))) {
            state.streak = state.streak + 1;
            // 封顶：无上限的 streak*2 会让长期玩家的星尘失控，破坏商店定价
            var bs = Math.min(state.streak, 15) * 2;
            out.dustFromStreak = bs;
            gained += bs;
          } else {
            state.streak = 1;
          }
          state.lastDay = t;
        }
        state.dust += gained;
        state.stats.totalDust += gained;
        out.dustGained += gained;
      } else {
        state.stats.losses++;
      }

      /* ---- 每日挑战进度（只按最高值/累计值推进，不倒退） ---- */
      var d = dailyInternal();
      if (maxLevel > d.progress.level) d.progress.level = maxLevel;
      d.progress.chain += chains;
      d.progress.score += score;

      d.tasks.forEach(function (task) {
        if (d.done[task.id]) return;
        var cur = d.progress[task.kind] || 0;
        if (cur >= task.target) {
          d.done[task.id] = true;
          state.dust += task.reward;
          state.stats.totalDust += task.reward;
          out.dustFromDaily += task.reward;
          out.dailyTasksDone.push(task.id);
        }
      });

      if (d.tasks.every(function (task) { return !!d.done[task.id]; }) && !d.claimed) {
        d.claimed = true;
        var st = today();
        var prev = state.stats.lastDailyDate;
        if (prev === dateKey(shiftDay(now(), -1))) state.stats.dailyStreak += 1;
        else if (prev !== st) state.stats.dailyStreak = 1;
        state.stats.lastDailyDate = st;
        state.stats.dailyCleared++;
        var sb = DAILY_REWARDS.streakPerDay * Math.min(state.stats.dailyStreak, DAILY_REWARDS.streakCapDays);
        out.dustFromDailyStreak = DAILY_REWARDS.allClear + sb;
        state.dust += out.dustFromDailyStreak;
        state.stats.totalDust += out.dustFromDailyStreak;
        out.dailyCleared = true;
      }

      out.dustGained += out.dustFromDaily + out.dustFromDailyStreak;
      save();
      out.daily = dailyView();
      return out;
    }

    /* ---------- 每日挑战：内部状态 / 对外视图 ---------- */
    function dailyInternal() {
      syncDaily();
      state.daily.progress = state.daily.progress || { level: 0, chain: 0, score: 0 };
      state.daily.done = state.daily.done || {};
      return state.daily;
    }

    function dailyView() {
      var d = dailyInternal();
      var tasks = d.tasks.map(function (task) {
        var cur = d.progress[task.kind] || 0;
        return {
          id: task.id, kind: task.kind, text: task.text, target: task.target, reward: task.reward,
          progress: Math.min(cur, task.target), done: !!d.done[task.id]
        };
      });
      var doneCount = tasks.filter(function (x) { return x.done; }).length;
      return {
        date: d.date,
        tasks: tasks,
        doneCount: doneCount,
        total: tasks.length,
        allDone: doneCount === tasks.length,
        claimed: !!d.claimed,
        streak: state.stats.dailyStreak,
        allClearReward: DAILY_REWARDS.allClear
      };
    }

    /* ---------- 对外接口 ---------- */
    load();

    return {
      /* 常量（表现层要用） */
      SAVE_KEY: key,
      VERSION: SAVE_VERSION,
      THEMES: THEMES,
      DAILY_REWARDS: DAILY_REWARDS,
      DUST_CALIBRATION: DUST_CALIBRATION,

      /* 存档 */
      /* 注意：导出前先跑一次 dailyInternal()，让 daily.tasks 一定是补齐过的。
         否则"存下来 → 读回去"会丢失当日目标清单（任务只挂在内存里），
         这是 B4 用例抓到的真实缺陷。dailyInternal 是幂等且由日期确定的，
         不产生新的持久化副作用。 */
      getState: function () { dailyInternal(); return deepCopy(state); },
      reload: function () { load(); return state; },
      save: save,
      reset: function () { state = defaultState(); save(); return deepCopy(state); },
      lastLoadError: function () { return loadError; },
      lastWriteError: function () { return writeError; },
      usedMemoryStorage: function () { return storage.__memory === true; },

      /* 星尘 */
      getDust: function () { return state.dust; },
      addDust: addDust,
      spendDust: spendDust,

      /* 主题 / 商店 */
      listThemes: function () { return THEMES.map(themeView); },
      getThemeId: function () { return state.theme; },
      getTheme: function () { return themeView(findTheme(state.theme)); },
      isThemeOwned: function (id) { return owned(id); },
      buyTheme: buyTheme,
      selectTheme: selectTheme,

      /* 关卡 / 统计 */
      getUnlocked: function () { return state.unlocked; },
      setUnlocked: setUnlocked,
      getBestScore: function () { return state.bestScore; },
      getStats: function () { return deepCopy(state.stats); },

      /* 图鉴（接线后 tower6 必须走这里，不许自己碰 localStorage） */
      getCodexSeen: getCodexSeen,
      markCodexSeen: markCodexSeen,
      setCodexSeen: setCodexSeen,
      codexSeenCount: codexSeenCount,

      /* 每日挑战 */
      todayKey: today,
      getDaily: dailyView,
      /* 纯函数版本：给定日期字符串 → 目标清单（同一天所有人一致，可离线核对） */
      dailyForDate: function (dateKeyStr) { return makeDaily(String(dateKeyStr)); },

      /* 一局结束 */
      applyRun: applyRun
    };
  }

  /* ======================================================================
     八、导出（供表现层直接使用，也供单测逐项验证）
     ====================================================================== */
  return {
    createMeta: createMeta,
    THEMES: THEMES,
    /* 每日挑战的候选值集合。暴露出来是为了让测试能比较"选中下标"而不是目标数值 ——
       level∈{5,6,7} 与 chain∈{2,3,4} 取值集合不相交，比数值会得到恒为 0 的
       相同率，那是测错了而不是分布好。 */
    DAILY_TARGETS: {
      level: DAILY_LEVEL_CHOICES.slice(),
      chain: DAILY_CHAIN_CHOICES.slice(),
      score: DAILY_SCORE_CHOICES.slice()
    },
    DAILY_REWARDS: DAILY_REWARDS,
    DUST_CALIBRATION: DUST_CALIBRATION,
    SAVE_KEY: SAVE_KEY,
    SAVE_VERSION: SAVE_VERSION,
    /* 纯函数，单独导出便于测试与表现层复用 */
    hashStr: hashStr,
    dateKey: dateKey,
    makeDaily: makeDaily,
    repairSave: function (raw, maxLevelIndex) { return repair(raw, maxLevelIndex); },
    defaultState: defaultState,
    memoryStorage: memoryStorage
  };
});
