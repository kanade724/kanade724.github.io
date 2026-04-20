const TEAM_META = {
  red: { label: "红方", color: "#d8543d" },
  blue: { label: "蓝方", color: "#2f6c97" },
  neutral: { label: "中立", color: "#786650" },
};

const PRESETS = [
  { id: "hero", label: "英雄", token: "英", description: "高机动强突击点", defaultSize: 58 },
  { id: "engineer", label: "工程", token: "工", description: "取矿、互动与支援", defaultSize: 54 },
  { id: "infantry", label: "步兵", token: "步", description: "常规火力与穿插", defaultSize: 52 },
  { id: "sentry", label: "哨兵", token: "哨", description: "防区压制与补位", defaultSize: 56 },
  { id: "dart", label: "飞镖", token: "镖", description: "远程投送与压制", defaultSize: 50 },
  { id: "air", label: "空中机器人", token: "空", description: "空中侦察与协同", defaultSize: 48 },
  { id: "radar", label: "雷达", token: "雷", description: "感知、通信与反制", defaultSize: 46 },
  { id: "outpost", label: "前哨站", token: "哨站", description: "关键据点或结构目标", defaultSize: 68 },
  { id: "base", label: "基地", token: "基地", description: "基地或核心防守目标", defaultSize: 74 },
];

const STANDARD_ROSTER = ["hero", "engineer", "infantry", "infantry", "sentry"];
const BOARD_PRESET_IDS = ["hero", "engineer", "infantry", "sentry"];
const MATCH_DURATION_SECONDS = 420;
const LEGACY_STORAGE_KEY = "rm2026-sandbox-state";
const STORAGE_KEY_PREFIX = "rm2026-sandbox-state::";
const SUPABASE_URL = "https://jbiedctytmrxzelmdwxg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uJzr69moclWUdROUr5Q4tg_ge3r-PN5";
const ROOM_ID = (() => {
  const value = new URLSearchParams(window.location.search).get("room") || "public-demo";
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return sanitized || "public-demo";
})();
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function createDefaultBoardState() {
  return {
    widthMeters: 28,
    heightMeters: 15,
    gridStepMeters: 0.5,
    showGrid: true,
    snapToGrid: true,
    backgroundImage: "",
  };
}

const BUFF_RULES = [
  {
    id: "base",
    label: "基地增益点",
    tag: "占领触发",
    lines: [
      { label: "触发方向", text: "无固定方向，以占领己方基地增益点触发。" },
      { label: "占领资格", text: "己方地面机器人；同一方的多台机器人可同时占领。" },
      { label: "增益数值", text: "50% 防御增益；允许发弹量兑换；解除“虚弱”状态。" },
    ],
  },
  {
    id: "central-highground",
    label: "中央高地增益点",
    tag: "占领触发",
    lines: [
      { label: "触发方向", text: "无固定方向，以占领中央高地增益点触发。" },
      { label: "占领资格", text: "英雄、步兵、哨兵可占领；同一方多台可同时占领；若一方已占领，另一方无法同时占领。" },
      { label: "增益数值", text: "25% 防御增益。" },
    ],
  },
  {
    id: "trapezoid-highground",
    label: "梯形高地增益点",
    tag: "占领触发",
    lines: [
      { label: "触发方向", text: "无固定方向，以占领己方梯形高地增益点触发。" },
      { label: "占领资格", text: "所有己方地面机器人；同一方的多台机器人可同时占领。" },
      { label: "增益数值", text: "50% 防御增益。" },
    ],
  },
  {
    id: "road",
    label: "地形跨越增益（公路）",
    tag: "3 秒内",
    lines: [
      { label: "触发方向", text: "低处 → 高处。" },
      { label: "判定方式", text: "同一机器人需先识别较低处增益点，再识别较高处增益点；途中不能检测到其他场地交互模块卡。" },
      { label: "增益数值", text: "25% 防御增益，持续 5 秒；同一机器人在获得后 15 秒内不能重复获得公路跨越增益。" },
    ],
  },
  {
    id: "highground",
    label: "地形跨越增益（高地）",
    tag: "5 秒内",
    lines: [
      { label: "触发方向", text: "低处 → 高处。" },
      { label: "判定方式", text: "同一机器人需先识别较低处增益点，再识别较高处增益点；途中不能检测到其他场地交互模块卡。" },
      { label: "增益数值", text: "25% 防御增益，持续 30 秒。" },
    ],
  },
  {
    id: "flying-ramp",
    label: "地形跨越增益（飞坡）",
    tag: "10 秒内",
    lines: [
      { label: "触发方向", text: "低处 → 高处。" },
      { label: "判定方式", text: "同一机器人需在 10 秒内完成同类飞坡增益点识别；途中不能检测到其他场地交互模块卡。" },
      { label: "增益数值", text: "25% 防御增益，持续 30 秒。" },
    ],
  },
  {
    id: "tunnel",
    label: "地形跨越增益（隧道）",
    tag: "3 秒内",
    lines: [
      { label: "触发方向", text: "一端 → 中间 → 另一端。" },
      { label: "判定方式", text: "同一机器人需按顺序识别一端、中间、另一端 3 处隧道增益点；途中不能检测到其他场地交互模块卡。" },
      { label: "增益数值", text: "50% 防御增益，持续 10 秒；2 倍热量冷却增益，持续 120 秒。" },
    ],
  },
  {
    id: "outpost",
    label: "前哨站增益点",
    tag: "条件占领",
    lines: [
      { label: "触发方向", text: "无固定方向，以占领前哨站增益点触发。" },
      { label: "占领资格", text: "己方前哨站存活时，英雄、工程、步兵、哨兵可占己方前哨点；若对方前哨被击毁、己方前哨存活且比赛开始 5 分钟内，可反占对方前哨点。" },
      { label: "增益数值", text: "25% 防御增益；允许发弹量兑换；解除“虚弱”及其对应无敌状态。" },
    ],
  },
  {
    id: "assembly",
    label: "装配区增益点 / 科技核心装配",
    tag: "单方禁区",
    lines: [
      { label: "触发方向", text: "无固定方向，以己方工程机器人占领装配区增益点触发。" },
      { label: "占领资格", text: "仅己方工程机器人可占领；该区域用于科技核心-能量单元装配。" },
      { label: "增益数值", text: "占领中的工程机器人处于无敌状态，最长累计 180 秒；离开后重新占领，时间不重置。" },
      { label: "禁区属性", text: "装配禁区属于单方禁区，禁止对方所有机器人进入。这里按第 7 章禁区规则理解为整场比赛有效，不是某一时刻才变禁区。" },
    ],
  },
  {
    id: "supply",
    label: "补给区增益点",
    tag: "占领触发",
    lines: [
      { label: "触发方向", text: "无固定方向，以占领己方补给区增益点触发。" },
      { label: "占领资格", text: "所有地面机器人均可占领己方补给区增益点；同一方的多台机器人可同时占领。" },
      { label: "增益数值", text: "可提升复活读条速度或获得回血增益；工程机器人占领后处于无敌状态。" },
      { label: "备注", text: "官方公开片段把具体实现形式和数值指向“5.2 回血与复活机制”，这条机制页本身未在当前卡片里写死固定数值。" },
    ],
  },
  {
    id: "fortress",
    label: "堡垒增益点",
    tag: "条件占领",
    lines: [
      { label: "触发方向", text: "无固定方向，以占领己方/对方堡垒增益点触发。" },
      { label: "占领资格", text: "步兵、哨兵可占领；己方前哨首次被击毁后，己方堡垒点生效；比赛开始 3 分钟且对方前哨被击毁后，可占对方堡垒点。" },
      { label: "己方占领数值", text: "50% 防御增益；射击热量冷却增益 w = floor(Δ / 40)，上限 75；储备允许发弹量 N = 100 + 2 × floor(Δ / 15)，上限 500。这里 Δ = 基地血量上限 - 现有基地血量。" },
      { label: "对方占领数值", text: "占领对方堡垒点时，正在占点的机器人获得 100% 易伤；单次占领累计 20 秒后，对方基地护甲展开；基地护甲展开后，占点机器人不再获得易伤。" },
    ],
  },
];

const BOARD_ICON_SLOTS = [
  { key: "hero", code: "1", label: "英雄", presetId: "hero" },
  { key: "engineer", code: "2", label: "工程", presetId: "engineer" },
  { key: "infantry3", code: "3", label: "步兵", presetId: "infantry", index: 0 },
  { key: "infantry4", code: "4", label: "步兵", presetId: "infantry", index: 1 },
  { key: "sentry", code: "哨", label: "哨兵", presetId: "sentry" },
];

const TIMELINE_LANES = [
  {
    id: "always",
    label: "常驻增益点",
    segments: [
      { start: 0, end: MATCH_DURATION_SECONDS, label: "基地 / 高地 / 补给 / 装配 / 地形跨越", tone: "always" },
    ],
    markers: [],
  },
  {
    id: "energy",
    label: "能量机关",
    segments: [
      { start: 0, end: 180, label: "小能量阶段", tone: "energy-small" },
      { start: 180, end: MATCH_DURATION_SECONDS, label: "大能量阶段", tone: "energy-big" },
    ],
    markers: [
      { time: 0, short: "小①", title: "双方各获得第 1 次激活小能量机关机会" },
      { time: 90, short: "小②", title: "双方各获得第 2 次激活小能量机关机会" },
      { time: 180, short: "大①", title: "双方各获得第 1 次激活大能量机关机会" },
      { time: 255, short: "大②", title: "双方各获得第 2 次激活大能量机关机会" },
      { time: 330, short: "大③", title: "双方各获得第 3 次激活大能量机关机会" },
    ],
  },
  {
    id: "dart",
    label: "飞镖系统",
    segments: [
      { start: 0, end: 30, label: "未开放", tone: "locked" },
      { start: 30, end: 240, label: "第 1 次开闸机会可累计", tone: "dart" },
      { start: 240, end: MATCH_DURATION_SECONDS, label: "第 2 次开闸机会发放", tone: "dart-strong" },
    ],
    markers: [
      { time: 30, short: "闸①", title: "第 1 次飞镖闸门开启机会发放" },
      { time: 240, short: "闸②", title: "第 2 次飞镖闸门开启机会发放" },
    ],
  },
  {
    id: "outpost",
    label: "前哨站",
    segments: [
      { start: 0, end: 300, label: "可反占 / 可重建窗口", tone: "outpost-open" },
      { start: 300, end: MATCH_DURATION_SECONDS, label: "反占与重建关闭", tone: "outpost-closed" },
    ],
    markers: [
      { time: 180, short: "停旋", title: "比赛开始 3 分钟后，前哨站装甲因时间条件停止旋转" },
      { time: 300, short: "封窗", title: "比赛开始 5 分钟后，前哨站不可再重建，也不能再反占对方前哨增益点" },
    ],
  },
  {
    id: "fortress",
    label: "堡垒增益点",
    segments: [
      { start: 0, end: 180, label: "对方堡垒不可占", tone: "locked" },
      { start: 180, end: MATCH_DURATION_SECONDS, label: "3:00 后满足条件可占对方堡垒", tone: "conditional" },
    ],
    markers: [
      { time: 180, short: "开放", title: "3:00 后若对方前哨被击毁，步兵 / 哨兵可占领对方堡垒增益点" },
    ],
  },
  {
    id: "sentry",
    label: "哨兵补给",
    segments: [
      { start: 0, end: MATCH_DURATION_SECONDS, label: "每分钟可累计 100 发", tone: "sentry" },
    ],
    markers: [
      { time: 60, short: "+100", title: "哨兵补给累计节点 1" },
      { time: 120, short: "+100", title: "哨兵补给累计节点 2" },
      { time: 180, short: "+100", title: "哨兵补给累计节点 3" },
      { time: 240, short: "+100", title: "哨兵补给累计节点 4" },
      { time: 300, short: "+100", title: "哨兵补给累计节点 5" },
      { time: 360, short: "+100", title: "哨兵补给累计节点 6" },
    ],
  },
  {
    id: "air-ammo",
    label: "无人机发弹量",
    segments: [
      { start: 0, end: MATCH_DURATION_SECONDS, label: "开局自带 750 发 17mm；比赛中不可额外兑换", tone: "air-ammo" },
    ],
    markers: [
      { time: 0, short: "750", title: "空中机器人开局初始允许发弹量为 750 发 17mm" },
    ],
  },
  {
    id: "economy",
    label: "固定经济",
    segments: [
      { start: 0, end: 360, label: "每分钟固定金币 +50", tone: "economy" },
      { start: 360, end: MATCH_DURATION_SECONDS, label: "终盘 0:59 起固定金币 +150", tone: "economy-end" },
    ],
    markers: [
      { time: 60, short: "+50", title: "固定金币增量节点 1" },
      { time: 120, short: "+50", title: "固定金币增量节点 2" },
      { time: 180, short: "+50", title: "固定金币增量节点 3" },
      { time: 240, short: "+50", title: "固定金币增量节点 4" },
      { time: 300, short: "+50", title: "固定金币增量节点 5" },
      { time: 360, short: "+150", title: "进入最后一分钟，固定金币增量提升到 150" },
    ],
  },
];

const state = {
  board: createDefaultBoardState(),
  units: [],
  selectedUnitId: null,
  placingPresetId: null,
  placingTeam: null,
  drawingRoute: false,
  dragging: null,
  timelineSeconds: 0,
  boardIcons: createDefaultBoardIcons(),
  modes: [],
  selectedModeId: null,
  modeDraftName: "",
};

let remoteVersion = -1;
let isApplyingRemote = false;
let lastSyncedSnapshot = "";
let syncTimer = null;
let roomChannel = null;

let pendingBoardIconSlot = null;

const refs = {
  presetList: document.querySelector("#presetList"),
  board: document.querySelector("#board"),
  boardSurface: document.querySelector(".board-surface"),
  boardHint: document.querySelector("#boardHint"),
  modeBadge: document.querySelector("#modeBadge"),
  routeLayer: document.querySelector("#routeLayer"),
  unitLayer: document.querySelector("#unitLayer"),
  ghostMarker: document.querySelector("#ghostMarker"),
  gridLayer: document.querySelector("#gridLayer"),
  backgroundImage: document.querySelector("#backgroundImage"),
  iconSlotList: document.querySelector("#iconSlotList"),
  cursorMeters: document.querySelector("#cursorMeters"),
  routeCount: document.querySelector("#routeCount"),
  timelineSlider: document.querySelector("#timelineSlider"),
  timelineScale: document.querySelector("#timelineScale"),
  timelineLanes: document.querySelector("#timelineLanes"),
  timelineElapsedLabel: document.querySelector("#timelineElapsedLabel"),
  timelineCountdownLabel: document.querySelector("#timelineCountdownLabel"),
  timelineActiveList: document.querySelector("#timelineActiveList"),
  timelineEventList: document.querySelector("#timelineEventList"),
  terrainBuffList: document.querySelector("#terrainBuffList"),
  modeNameInput: document.querySelector("#modeNameInput"),
  saveModeBtn: document.querySelector("#saveModeBtn"),
  updateModeBtn: document.querySelector("#updateModeBtn"),
  clearModeSelectionBtn: document.querySelector("#clearModeSelectionBtn"),
  modeLibraryMeta: document.querySelector("#modeLibraryMeta"),
  modeList: document.querySelector("#modeList"),
  unitList: document.querySelector("#unitList"),
  emptyState: document.querySelector("#emptyState"),
  detailForm: document.querySelector("#detailForm"),
  boardWidthInput: document.querySelector("#boardWidthInput"),
  boardHeightInput: document.querySelector("#boardHeightInput"),
  gridStepInput: document.querySelector("#gridStepInput"),
  showGridInput: document.querySelector("#showGridInput"),
  snapGridInput: document.querySelector("#snapGridInput"),
  unitNameInput: document.querySelector("#unitNameInput"),
  unitTypeInput: document.querySelector("#unitTypeInput"),
  unitTeamInput: document.querySelector("#unitTeamInput"),
  unitTokenInput: document.querySelector("#unitTokenInput"),
  unitSizeInput: document.querySelector("#unitSizeInput"),
  unitColorInput: document.querySelector("#unitColorInput"),
  routeColorInput: document.querySelector("#routeColorInput"),
  unitNoteInput: document.querySelector("#unitNoteInput"),
  selectedCoords: document.querySelector("#selectedCoords"),
  selectedRouteMeta: document.querySelector("#selectedRouteMeta"),
  drawRouteBtn: document.querySelector("#drawRouteBtn"),
  finishRouteBtn: document.querySelector("#finishRouteBtn"),
  undoPointBtn: document.querySelector("#undoPointBtn"),
  clearRouteBtn: document.querySelector("#clearRouteBtn"),
  duplicateBtn: document.querySelector("#duplicateBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  loadBundleBtn: document.querySelector("#loadBundleBtn"),
  exportOfflineBtn: document.querySelector("#exportOfflineBtn"),
  saveLocalBtn: document.querySelector("#saveLocalBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importBtn: document.querySelector("#importBtn"),
  clearBoardBtn: document.querySelector("#clearBoardBtn"),
  seedDemoBtn: document.querySelector("#seedDemoBtn"),
  addRedRosterBtn: document.querySelector("#addRedRosterBtn"),
  addBlueRosterBtn: document.querySelector("#addBlueRosterBtn"),
  goHomeBtn: document.querySelector("#goHomeBtn"),
  uploadBackgroundBtn: document.querySelector("#uploadBackgroundBtn"),
  clearBackgroundBtn: document.querySelector("#clearBackgroundBtn"),
  backgroundInput: document.querySelector("#backgroundInput"),
  importInput: document.querySelector("#importInput"),
  boardIconInput: document.querySelector("#boardIconInput"),
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `unit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function isPortableBundlePage() {
  return Boolean(window.RM2026_PORTABLE_PAGE);
}

function getStorageScope() {
  return isPortableBundlePage() ? "portable" : "project";
}

function getPortableBundleStorageId() {
  if (!isPortableBundlePage()) {
    return "";
  }

  const bundleState = window.RM2026_BUNDLE_STATE;
  if (bundleState && typeof bundleState.savedAt === "string" && bundleState.savedAt) {
    return bundleState.savedAt;
  }

  return "default";
}

function getStorageKey() {
  const originPath = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  const bundleId = getPortableBundleStorageId();
  return `${STORAGE_KEY_PREFIX}${getStorageScope()}::${bundleId}::${originPath}`;
}

function getRestoreStorageKeys() {
  const keys = [getStorageKey()];

  if (!isPortableBundlePage()) {
    keys.push(LEGACY_STORAGE_KEY);
  }

  return [...new Set(keys)];
}

function readStorageValue(storageKey) {
  try {
    return localStorage.getItem(storageKey);
  } catch (error) {
    console.warn("无法读取本地存储", error);
    return null;
  }
}

function writeStorageValue(storageKey, value) {
  try {
    localStorage.setItem(storageKey, value);
    return true;
  } catch (error) {
    console.warn("无法写入本地存储", error);
    return false;
  }
}

function removeStorageValue(storageKey) {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn("无法删除损坏的本地存储", error);
  }
}

function getPresetById(presetId) {
  return PRESETS.find((preset) => preset.id === presetId);
}

function getSelectedUnit() {
  return state.units.find((unit) => unit.id === state.selectedUnitId) || null;
}

function createDefaultBoardIcons() {
  return {
    hero: "",
    engineer: "",
    infantry3: "",
    infantry4: "",
    sentry: "",
  };
}

function normalizeBoardIcons(icons) {
  const normalized = createDefaultBoardIcons();

  for (const slot of BOARD_ICON_SLOTS) {
    if (icons && typeof icons[slot.key] === "string") {
      normalized[slot.key] = icons[slot.key];
    }
  }

  return normalized;
}

function normalizeSnapshot(snapshot) {
  return {
    board: { ...createDefaultBoardState(), ...((snapshot && snapshot.board) || {}) },
    boardIcons: normalizeBoardIcons(snapshot && (snapshot.boardIcons || (snapshot.minimap && snapshot.minimap.icons))),
    timelineSeconds: clamp(Number(snapshot && snapshot.timelineSeconds) || 0, 0, MATCH_DURATION_SECONDS),
    units: Array.isArray(snapshot && snapshot.units) ? snapshot.units.map(normalizeUnit) : [],
  };
}

function createModeSnapshot() {
  return normalizeSnapshot({
    board: cloneValue(state.board),
    boardIcons: cloneValue(state.boardIcons),
    timelineSeconds: state.timelineSeconds,
    units: cloneValue(state.units),
  });
}

function normalizeMode(mode, index = 0) {
  const snapshotSource = mode && typeof mode === "object"
    ? (mode.snapshot || {
        board: mode.board,
        boardIcons: mode.boardIcons || (mode.minimap && mode.minimap.icons),
        timelineSeconds: mode.timelineSeconds,
        units: mode.units,
      })
    : {};

  return {
    id: mode && mode.id ? mode.id : createId(),
    name: mode && typeof mode.name === "string" && mode.name.trim() ? mode.name.trim() : `模式 ${index + 1}`,
    savedAt: mode && typeof mode.savedAt === "string" ? mode.savedAt : new Date().toISOString(),
    snapshot: normalizeSnapshot(snapshotSource),
  };
}

function getSelectedMode() {
  return state.modes.find((mode) => mode.id === state.selectedModeId) || null;
}

function createDefaultModeName() {
  const names = new Set(state.modes.map((mode) => mode.name));
  let index = state.modes.length + 1;
  let candidate = `模式 ${index}`;

  while (names.has(candidate)) {
    index += 1;
    candidate = `模式 ${index}`;
  }

  return candidate;
}

function createDuplicateModeName(baseName) {
  const names = new Set(state.modes.map((mode) => mode.name));
  let index = 1;
  let candidate = `${baseName} 副本`;

  while (names.has(candidate)) {
    index += 1;
    candidate = `${baseName} 副本 ${index}`;
  }

  return candidate;
}

function selectMode(modeId, options = {}) {
  const { renderUI = true, keepDraft = false } = options;
  const mode = state.modes.find((item) => item.id === modeId) || null;

  state.selectedModeId = mode ? mode.id : null;
  if (!keepDraft) {
    state.modeDraftName = mode ? mode.name : "";
  }

  if (renderUI) {
    render();
  }

  return mode;
}

function createSnapshotUnitFactory(prefix) {
  const counters = {};

  return (presetId, team, x, y, route = [], overrides = {}) => {
    const preset = getPresetById(presetId);
    const key = `${team}:${presetId}`;
    counters[key] = (counters[key] || 0) + 1;
    const sequence = counters[key];
    const color = TEAM_META[team].color;

    return {
      id: `${prefix}-${team}-${presetId}-${sequence}`,
      presetId,
      name: `${TEAM_META[team].label}${preset.label}${sequence}`,
      type: preset.label,
      token: preset.token,
      team,
      color,
      routeColor: color,
      size: preset.defaultSize,
      note: "",
      x,
      y,
      route: route.map((point) => ({ x: point.x, y: point.y })),
      ...overrides,
    };
  };
}

function createBundledPackagePayload() {
  const createMainUnit = createSnapshotUnitFactory("bundle-main");
  const createOpeningUnit = createSnapshotUnitFactory("bundle-opening");

  const mainSnapshot = {
    board: createDefaultBoardState(),
    boardIcons: createDefaultBoardIcons(),
    timelineSeconds: 180,
    units: [
      createMainUnit("hero", "red", 10, 48, [{ x: 20, y: 52 }, { x: 34, y: 44 }, { x: 48, y: 38 }]),
      createMainUnit("engineer", "red", 12, 68, [{ x: 18, y: 66 }, { x: 28, y: 74 }, { x: 40, y: 76 }]),
      createMainUnit("infantry", "red", 18, 36, [{ x: 26, y: 32 }, { x: 34, y: 30 }]),
      createMainUnit("infantry", "red", 20, 58, [{ x: 30, y: 56 }, { x: 42, y: 52 }]),
      createMainUnit("sentry", "red", 24, 78, []),
      createMainUnit("hero", "blue", 90, 52, [{ x: 80, y: 48 }, { x: 66, y: 42 }, { x: 54, y: 38 }]),
      createMainUnit("engineer", "blue", 88, 32, [{ x: 82, y: 34 }, { x: 72, y: 26 }, { x: 60, y: 24 }]),
      createMainUnit("infantry", "blue", 82, 64, [{ x: 74, y: 68 }, { x: 66, y: 70 }]),
      createMainUnit("infantry", "blue", 80, 42, [{ x: 70, y: 44 }, { x: 58, y: 48 }]),
      createMainUnit("sentry", "blue", 76, 22, []),
    ],
  };

  const openingSnapshot = {
    board: createDefaultBoardState(),
    boardIcons: createDefaultBoardIcons(),
    timelineSeconds: 60,
    units: [
      createOpeningUnit("hero", "red", 10, 48, [{ x: 18, y: 46 }, { x: 28, y: 40 }]),
      createOpeningUnit("engineer", "red", 12, 68, [{ x: 18, y: 72 }, { x: 24, y: 80 }]),
      createOpeningUnit("infantry", "red", 18, 36, [{ x: 26, y: 30 }]),
      createOpeningUnit("infantry", "red", 20, 58, [{ x: 28, y: 58 }, { x: 36, y: 54 }]),
      createOpeningUnit("sentry", "red", 24, 78, []),
      createOpeningUnit("hero", "blue", 90, 52, [{ x: 82, y: 54 }, { x: 72, y: 60 }]),
      createOpeningUnit("engineer", "blue", 88, 32, [{ x: 82, y: 28 }, { x: 76, y: 20 }]),
      createOpeningUnit("infantry", "blue", 82, 64, [{ x: 74, y: 70 }]),
      createOpeningUnit("infantry", "blue", 80, 42, [{ x: 72, y: 42 }, { x: 64, y: 46 }]),
      createOpeningUnit("sentry", "blue", 76, 22, []),
    ],
  };

  return {
    app: "RoboMaster 2026 Tactical Sandbox Bundle",
    savedAt: "2026-04-18T16:45:00+08:00",
    board: cloneValue(mainSnapshot.board),
    boardIcons: cloneValue(mainSnapshot.boardIcons),
    timelineSeconds: mainSnapshot.timelineSeconds,
    units: cloneValue(mainSnapshot.units),
    modes: [
      {
        id: "bundle-mode-main",
        name: "标准对推示例",
        savedAt: "2026-04-18T16:45:00+08:00",
        snapshot: cloneValue(mainSnapshot),
      },
      {
        id: "bundle-mode-opening",
        name: "开局抢中高地",
        savedAt: "2026-04-18T16:45:00+08:00",
        snapshot: cloneValue(openingSnapshot),
      },
    ],
    selectedModeId: "bundle-mode-main",
    modeDraftName: "标准对推示例",
  };
}

function getBundledPackagePayload() {
  if (window.RM2026_BUNDLE_STATE && typeof window.RM2026_BUNDLE_STATE === "object") {
    return cloneValue(window.RM2026_BUNDLE_STATE);
  }
  return createBundledPackagePayload();
}

function getBoardIconSlotByKey(slotKey) {
  return BOARD_ICON_SLOTS.find((slot) => slot.key === slotKey) || null;
}

function getBoardDisplaySlotKey(unit) {
  if (unit.presetId === "hero") {
    return "hero";
  }

  if (unit.presetId === "engineer") {
    return "engineer";
  }

  if (unit.presetId === "sentry") {
    return "sentry";
  }

  if (unit.presetId !== "infantry") {
    return null;
  }

  const sameTeamInfantries = state.units.filter(
    (candidate) => candidate.team === unit.team && candidate.presetId === "infantry",
  );
  const infantryIndex = sameTeamInfantries.findIndex((candidate) => candidate.id === unit.id);

  if (infantryIndex === 0) {
    return "infantry3";
  }

  if (infantryIndex === 1) {
    return "infantry4";
  }

  return null;
}

function isBoardDisplayUnit(unit) {
  return Boolean(getBoardDisplaySlotKey(unit));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function metersToPercentX(meters) {
  return (meters / state.board.widthMeters) * 100;
}

function metersToPercentY(meters) {
  return (meters / state.board.heightMeters) * 100;
}

function percentToMetersX(percent) {
  return (percent / 100) * state.board.widthMeters;
}

function percentToMetersY(percent) {
  return (percent / 100) * state.board.heightMeters;
}

function snapPercent(xPercent, yPercent) {
  if (!state.board.snapToGrid || state.board.gridStepMeters <= 0) {
    return { x: clamp(xPercent, 0, 100), y: clamp(yPercent, 0, 100) };
  }

  const stepX = metersToPercentX(state.board.gridStepMeters);
  const stepY = metersToPercentY(state.board.gridStepMeters);

  const snappedX = stepX ? Math.round(xPercent / stepX) * stepX : xPercent;
  const snappedY = stepY ? Math.round(yPercent / stepY) * stepY : yPercent;

  return {
    x: clamp(roundTo(snappedX), 0, 100),
    y: clamp(roundTo(snappedY), 0, 100),
  };
}

function clampPercentPoint(xPercent, yPercent, shouldSnap = true) {
  const point = {
    x: clamp(roundTo(xPercent), 0, 100),
    y: clamp(roundTo(yPercent), 0, 100),
  };

  return shouldSnap ? snapPercent(point.x, point.y) : point;
}

function getBoardContentRect() {
  const rect = refs.boardSurface.getBoundingClientRect();
  const styles = window.getComputedStyle(refs.boardSurface);
  const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
  const borderRight = Number.parseFloat(styles.borderRightWidth) || 0;
  const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
  const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0;

  return {
    left: rect.left + borderLeft,
    top: rect.top + borderTop,
    width: rect.width - borderLeft - borderRight,
    height: rect.height - borderTop - borderBottom,
  };
}

function pointFromClient(clientX, clientY, options = {}) {
  const { snap = true } = options;
  const rect = getBoardContentRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return clampPercentPoint(x, y, snap);
}

function pointFromEvent(event, options = {}) {
  return pointFromClient(event.clientX, event.clientY, options);
}

function screenPointToRoutePoint(clientX, clientY) {
  return pointFromClient(clientX, clientY, { snap: false });
}

function getRenderedUnitCenter(unitId) {
  const unitElement = refs.unitLayer.querySelector(`[data-unit-id="${unitId}"]`);
  if (!unitElement) {
    return null;
  }

  const rect = unitElement.getBoundingClientRect();
  return screenPointToRoutePoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function formatMeters(xPercent, yPercent) {
  const xMeters = percentToMetersX(xPercent).toFixed(1);
  const yMeters = percentToMetersY(yPercent).toFixed(1);
  return `x ${xMeters}m / y ${yMeters}m`;
}

function formatClock(totalSeconds) {
  const seconds = clamp(Math.floor(totalSeconds), 0, MATCH_DURATION_SECONDS);
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${minutesPart}:${String(secondsPart).padStart(2, "0")}`;
}

function formatOfficialCountdown(elapsedSeconds) {
  const remaining = Math.max(0, MATCH_DURATION_SECONDS - 1 - Math.floor(elapsedSeconds));
  const minutesPart = Math.floor(remaining / 60);
  const secondsPart = remaining % 60;
  return `${minutesPart}:${String(secondsPart).padStart(2, "0")}`;
}

function timelinePercent(seconds) {
  return `${(clamp(seconds, 0, MATCH_DURATION_SECONDS) / MATCH_DURATION_SECONDS) * 100}%`;
}

function countIssuedOpportunities(times, currentSeconds) {
  return times.filter((time) => time <= currentSeconds).length;
}

function getSortedTimelineMarkers() {
  return TIMELINE_LANES.flatMap((lane) =>
    lane.markers.map((marker) => ({
      ...marker,
      laneLabel: lane.label,
    })),
  ).sort((a, b) => a.time - b.time);
}

function countSameType(team, type) {
  return state.units.filter((unit) => unit.team === team && unit.type === type).length;
}

function createUnit(presetId, team, x, y) {
  const preset = getPresetById(presetId);
  const sequence = countSameType(team, preset.label) + 1;
  const color = TEAM_META[team].color;

  return {
    id: createId(),
    presetId,
    name: `${TEAM_META[team].label}${preset.label}${sequence}`,
    type: preset.label,
    token: preset.token,
    team,
    color,
    routeColor: color,
    size: preset.defaultSize,
    note: "",
    x,
    y,
    route: [],
  };
}

function normalizeUnit(unit) {
  const team = TEAM_META[unit.team] ? unit.team : "neutral";
  const preset = getPresetById(unit.presetId) || PRESETS.find((item) => item.label === unit.type);
  const fallbackColor = TEAM_META[team].color;
  const presetId = preset ? preset.id : "infantry";
  const presetLabel = preset ? preset.label : "单位";
  const presetToken = preset ? preset.token : "点";
  const presetSize = preset ? preset.defaultSize : 52;

  return {
    id: unit.id || createId(),
    presetId,
    name: unit.name || `${TEAM_META[team].label}${presetLabel}`,
    type: unit.type || presetLabel,
    token: unit.token || presetToken,
    team,
    color: unit.color || fallbackColor,
    routeColor: unit.routeColor || unit.color || fallbackColor,
    size: Number(unit.size) || presetSize,
    note: unit.note || "",
    x: clamp(Number(unit.x) || 0, 0, 100),
    y: clamp(Number(unit.y) || 0, 0, 100),
    route: Array.isArray(unit.route)
      ? unit.route.map((point) => ({
          x: clamp(Number(point.x) || 0, 0, 100),
          y: clamp(Number(point.y) || 0, 0, 100),
        }))
      : [],
  };
}

function applySnapshot(snapshot, options = {}) {
  const { renderUI = true } = options;
  const normalized = normalizeSnapshot(snapshot);

  state.board = normalized.board;
  state.units = normalized.units;
  state.boardIcons = normalized.boardIcons;
  state.timelineSeconds = normalized.timelineSeconds;
  state.selectedUnitId = state.units[0] ? state.units[0].id : null;
  cancelPlacement();
  stopDrawingRoute();
  state.dragging = null;

  if (renderUI) {
    render();
  }
}

function applyAppPayload(payload, options = {}) {
  const { renderUI = true } = options;

  applySnapshot(payload, { renderUI: false });
  state.modes = Array.isArray(payload && payload.modes) ? payload.modes.map(normalizeMode) : [];
  state.selectedModeId = state.modes.some((mode) => mode.id === (payload && payload.selectedModeId))
    ? payload.selectedModeId
    : null;
  state.modeDraftName = payload && typeof payload.modeDraftName === "string"
    ? payload.modeDraftName
    : (getSelectedMode() ? getSelectedMode().name : "");

  if (renderUI) {
    render();
  }
}

function createPortablePayload() {
  const snapshot = createModeSnapshot();
  return {
    savedAt: new Date().toISOString(),
    app: "RoboMaster 2026 Tactical Sandbox",
    board: snapshot.board,
    boardIcons: snapshot.boardIcons,
    timelineSeconds: snapshot.timelineSeconds,
    units: snapshot.units,
    modes: state.modes.map((mode) => ({
      id: mode.id,
      name: mode.name,
      savedAt: mode.savedAt,
      snapshot: cloneValue(mode.snapshot),
    })),
    selectedModeId: state.selectedModeId,
    modeDraftName: state.modeDraftName,
  };
}

function toSnapshotText(payload) {
  return JSON.stringify(payload);
}

function scheduleRealtimeSync() {
  if (isApplyingRemote) {
    return;
  }
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(() => {
    void pushStateToRoom();
  }, 120);
}

async function ensureRoomExists() {
  const seed = createPortablePayload();
  await supabase
    .from("rm_rooms")
    .upsert({ room_id: ROOM_ID, state: seed }, { onConflict: "room_id", ignoreDuplicates: true });
}

async function loadRoomState() {
  const { data, error } = await supabase
    .from("rm_rooms")
    .select("state,version")
    .eq("room_id", ROOM_ID)
    .single();

  if (error || !data || !data.state) {
    return;
  }

  isApplyingRemote = true;
  applyAppPayload(data.state);
  isApplyingRemote = false;
  remoteVersion = Number(data.version) || 0;
  lastSyncedSnapshot = toSnapshotText(data.state);
}

async function pushStateToRoom() {
  if (isApplyingRemote) {
    return;
  }

  const payload = createPortablePayload();
  const text = toSnapshotText(payload);
  if (text === lastSyncedSnapshot) {
    return;
  }

  const { data, error } = await supabase
    .from("rm_rooms")
    .update({ state: payload })
    .eq("room_id", ROOM_ID)
    .select("version")
    .single();

  if (error) {
    console.warn("实时同步失败", error);
    return;
  }

  lastSyncedSnapshot = text;
  remoteVersion = Number(data && data.version) || remoteVersion;
}

function subscribeRoomChanges() {
  roomChannel = supabase
    .channel(`rm-room-${ROOM_ID}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rm_rooms",
        filter: `room_id=eq.${ROOM_ID}`,
      },
      (payload) => {
        const nextVersion = Number(payload && payload.new && payload.new.version) || 0;
        if (nextVersion <= remoteVersion) {
          return;
        }

        const nextState = payload && payload.new && payload.new.state;
        if (!nextState) {
          return;
        }

        const nextText = toSnapshotText(nextState);
        if (nextText === lastSyncedSnapshot) {
          remoteVersion = nextVersion;
          return;
        }

        isApplyingRemote = true;
        applyAppPayload(nextState);
        isApplyingRemote = false;
        remoteVersion = nextVersion;
        lastSyncedSnapshot = nextText;
      }
    )
    .subscribe();
}

async function initRealtimeCollaboration() {
  try {
    await ensureRoomExists();
    await loadRoomState();
    subscribeRoomChanges();
    refs.boardHint.textContent = `房间：${ROOM_ID}（实时协作已连接）`;
  } catch (error) {
    console.warn("实时协作初始化失败", error);
    refs.boardHint.textContent = `房间：${ROOM_ID}（实时协作连接失败）`;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let c = index;
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[index] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function getDosDateTime(input) {
  const date = input instanceof Date && !Number.isNaN(input.getTime()) ? input : new Date();
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = file.content instanceof Uint8Array ? file.content : encoder.encode(file.content);
    const { dosTime, dosDate } = getDosDateTime(file.date || new Date());
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32LE(localHeader, 0, 0x04034b50);
    writeUint16LE(localHeader, 4, 20);
    writeUint16LE(localHeader, 6, 0);
    writeUint16LE(localHeader, 8, 0);
    writeUint16LE(localHeader, 10, dosTime);
    writeUint16LE(localHeader, 12, dosDate);
    writeUint32LE(localHeader, 14, checksum);
    writeUint32LE(localHeader, 18, dataBytes.length);
    writeUint32LE(localHeader, 22, dataBytes.length);
    writeUint16LE(localHeader, 26, nameBytes.length);
    writeUint16LE(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32LE(centralHeader, 0, 0x02014b50);
    writeUint16LE(centralHeader, 4, 20);
    writeUint16LE(centralHeader, 6, 20);
    writeUint16LE(centralHeader, 8, 0);
    writeUint16LE(centralHeader, 10, 0);
    writeUint16LE(centralHeader, 12, dosTime);
    writeUint16LE(centralHeader, 14, dosDate);
    writeUint32LE(centralHeader, 16, checksum);
    writeUint32LE(centralHeader, 20, dataBytes.length);
    writeUint32LE(centralHeader, 24, dataBytes.length);
    writeUint16LE(centralHeader, 28, nameBytes.length);
    writeUint16LE(centralHeader, 30, 0);
    writeUint16LE(centralHeader, 32, 0);
    writeUint16LE(centralHeader, 34, 0);
    writeUint16LE(centralHeader, 36, 0);
    writeUint32LE(centralHeader, 38, 0);
    writeUint32LE(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  writeUint32LE(endRecord, 0, 0x06054b50);
  writeUint16LE(endRecord, 4, 0);
  writeUint16LE(endRecord, 6, 0);
  writeUint16LE(endRecord, 8, files.length);
  writeUint16LE(endRecord, 10, files.length);
  writeUint32LE(endRecord, 12, centralSize);
  writeUint32LE(endRecord, 16, offset);
  writeUint16LE(endRecord, 20, 0);

  return new Blob([...localParts, ...centralParts, endRecord], { type: "application/zip" });
}

function escapeInlineScript(value) {
  return value
    .replace(/<\/script/giu, "<\\/script")
    .replace(/<!--/gu, "<\\!--")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

function serializeInlineScript(value) {
  return escapeInlineScript(JSON.stringify(value));
}

function createStandaloneOfflineHtml(source, payload) {
  const styleTag = `<style>\n${source.stylesCss}\n</style>`;
  const stateScript = `<script>\nwindow.RM2026_PORTABLE_PAGE = true;\nwindow.RM2026_OFFLINE_SOURCE = ${serializeInlineScript(source)};\nwindow.RM2026_BUNDLE_STATE = ${serializeInlineScript(payload)};\n</script>`;
  const appScript = `<script>\n${escapeInlineScript(source.appJs)}\n</script>`;

  let html = source.indexHtml;
  html = html.replace(/<link rel="stylesheet" href="styles\.css">\s*/u, `${styleTag}\n`);
  html = html.replace(
    /\s*<script src="bundle-source\.js"><\/script>\s*\n?\s*<script src="bundle-state\.js"><\/script>\s*\n?\s*<script src="app\.js"><\/script>/u,
    `\n  ${stateScript}\n  ${appScript}`,
  );
  html = html.replace(
    /\s*<script src="bundle-state\.js"><\/script>\s*\n?\s*<script src="app\.js"><\/script>/u,
    `\n  ${stateScript}\n  ${appScript}`,
  );

  return html;
}

function createBundleSourceScript(source) {
  return `window.RM2026_OFFLINE_SOURCE = ${serializeInlineScript(source)};\n`;
}

function createBundleStateScript(payload) {
  return [
    "window.RM2026_PORTABLE_PAGE = true;",
    `window.RM2026_BUNDLE_STATE = ${serializeInlineScript(payload)};`,
    "",
  ].join("\n");
}

function exportOfflinePackage() {
  if (!window.RM2026_OFFLINE_SOURCE) {
    refs.boardHint.textContent = "当前页面缺少离线包源文件，无法直接导出离线包。";
    return;
  }

  const payload = createPortablePayload();
  const source = window.RM2026_OFFLINE_SOURCE;
  const readmeSuffix = "\n\n## 当前离线包\n\n- 该压缩包由页面中的“导出当前离线包”生成\n- 已内置导出时刻的底图、模式库、路线与时间轴状态\n- 解压后可继续编辑，并可再次点击“导出当前离线包”生成新的可分发版本\n";
  const files = [
    { name: "index.html", content: source.indexHtml },
    { name: "styles.css", content: source.stylesCss },
    { name: "app.js", content: source.appJs },
    { name: "bundle-source.js", content: createBundleSourceScript(source) },
    { name: "bundle-state.js", content: createBundleStateScript(payload) },
    { name: "README.md", content: `${source.readmeMd}${readmeSuffix}` },
  ];

  downloadBlob(createZipBlob(files), `RoboMaster2026-offline-${Date.now()}.zip`);
  refs.boardHint.textContent = "当前页面状态已打包成可二次编辑、可再次导出的离线压缩包。";
}

function setSelection(unitId, options = {}) {
  const { renderUI = true } = options;
  state.selectedUnitId = unitId;
  if (renderUI) {
    render();
  }
}

function cancelPlacement() {
  state.placingPresetId = null;
  state.placingTeam = null;
}

function stopDrawingRoute() {
  state.drawingRoute = false;
}

function updateBoardAspect() {
  refs.boardSurface.style.aspectRatio = `${state.board.widthMeters} / ${state.board.heightMeters}`;
}

function renderGrid() {
  if (!state.board.showGrid) {
    refs.gridLayer.style.display = "none";
    return;
  }

  refs.gridLayer.style.display = "block";
  const stepX = Math.max(metersToPercentX(state.board.gridStepMeters), 0.5);
  const stepY = Math.max(metersToPercentY(state.board.gridStepMeters), 0.5);
  refs.gridLayer.style.backgroundSize = `${stepX}% ${stepY}%`;
}

function renderBackground() {
  refs.backgroundImage.style.backgroundImage = state.board.backgroundImage
    ? `url("${state.board.backgroundImage}")`
    : "none";
}

function buildRoutePoints(unit, startPoint = null) {
  return [startPoint || { x: unit.x, y: unit.y }, ...unit.route];
}

function renderRoutes() {
  refs.routeLayer.querySelectorAll(".route-group").forEach((node) => node.remove());

  for (const unit of state.units) {
    if (!isBoardDisplayUnit(unit) || !unit.route.length) {
      continue;
    }

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("route-group");
    group.setAttribute("data-unit-id", unit.id);
    group.style.color = unit.routeColor || unit.color;
    const startPoint = getRenderedUnitCenter(unit.id) || { x: unit.x, y: unit.y };

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.classList.add("route-path");
    if (unit.id === state.selectedUnitId) {
      polyline.classList.add("selected");
    }
    polyline.setAttribute(
      "points",
      buildRoutePoints(unit, startPoint)
        .map((point) => `${point.x},${point.y}`)
        .join(" "),
    );
    polyline.setAttribute("stroke", unit.routeColor || unit.color);
    group.appendChild(polyline);

    const dots = document.createElementNS("http://www.w3.org/2000/svg", "g");
    dots.classList.add("route-dots");
    dots.setAttribute("fill", unit.routeColor || unit.color);

    for (const point of unit.route) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", unit.id === state.selectedUnitId ? "0.95" : "0.72");
      dots.appendChild(circle);
    }

    group.appendChild(dots);
    refs.routeLayer.appendChild(group);
  }
}

function renderUnits() {
  refs.unitLayer.innerHTML = "";

  for (const unit of state.units) {
    const slotKey = getBoardDisplaySlotKey(unit);
    if (!slotKey) {
      continue;
    }

    const slot = getBoardIconSlotByKey(slotKey);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `unit-token ${unit.team}${unit.id === state.selectedUnitId ? " selected" : ""}`;
    button.style.left = `${unit.x}%`;
    button.style.top = `${unit.y}%`;
    button.style.width = `${unit.size}px`;
    button.style.height = `${unit.size}px`;
    button.title = `${unit.name} · ${slot.code}`;
    button.style.background = state.boardIcons[slotKey]
      ? "rgba(255, 251, 245, 0.96)"
      : `linear-gradient(180deg, ${unit.color}, ${shadeColor(unit.color, -18)})`;
    button.dataset.unitId = unit.id;

    const icon = state.boardIcons[slotKey];
    if (icon) {
      const image = document.createElement("img");
      image.src = icon;
      image.alt = slot.code;
      button.appendChild(image);
    } else {
      const glyph = document.createElement("span");
      glyph.className = "token-code";
      glyph.textContent = slot.code;
      button.appendChild(glyph);
    }

    button.addEventListener("pointerdown", handleUnitPointerDown);
    refs.unitLayer.appendChild(button);
  }
}

function renderUnitList() {
  if (!state.units.length) {
    refs.unitList.className = "unit-list empty-list";
    refs.unitList.textContent = "还没有兵种，先放一个试试。";
    return;
  }

  refs.unitList.className = "unit-list";
  refs.unitList.innerHTML = "";

  for (const unit of state.units) {
    const row = document.createElement("div");
    row.className = `unit-row ${unit.team}${unit.id === state.selectedUnitId ? " selected" : ""}`;

    const chip = document.createElement("div");
    chip.className = "unit-chip";
    chip.textContent = unit.token;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "unit-row-meta";
    button.addEventListener("click", () => setSelection(unit.id));

    const name = document.createElement("span");
    name.className = "unit-row-name";
    name.textContent = unit.name;

    const sub = document.createElement("span");
    sub.className = "unit-row-sub";
    sub.textContent = `${TEAM_META[unit.team].label} · ${formatMeters(unit.x, unit.y)}`;

    button.append(name, sub);

    const badge = document.createElement("span");
    badge.className = "unit-row-sub";
    badge.textContent = unit.route.length ? `${unit.route.length} 点` : "无路线";

    row.append(chip, button, badge);
    refs.unitList.appendChild(row);
  }
}

function renderDetails() {
  const unit = getSelectedUnit();
  const hasSelection = Boolean(unit);
  refs.emptyState.classList.toggle("hidden", hasSelection);
  refs.detailForm.classList.toggle("hidden", !hasSelection);

  if (!unit) {
    refs.selectedCoords.textContent = "位置：-";
    refs.selectedRouteMeta.textContent = "路线点：0";
    return;
  }

  refs.unitNameInput.value = unit.name;
  refs.unitTypeInput.value = unit.type;
  refs.unitTeamInput.value = unit.team;
  refs.unitTokenInput.value = unit.token;
  refs.unitSizeInput.value = unit.size;
  refs.unitColorInput.value = unit.color;
  refs.routeColorInput.value = unit.routeColor;
  refs.unitNoteInput.value = unit.note;
  refs.selectedCoords.textContent = `位置：${formatMeters(unit.x, unit.y)}`;
  refs.selectedRouteMeta.textContent = `路线点：${unit.route.length}`;
}

function renderMode() {
  const unit = getSelectedUnit();
  let badge = "待命";
  let hint = "从左侧选择兵种开始布阵。";

  if (state.placingPresetId && state.placingTeam) {
    const preset = getPresetById(state.placingPresetId);
    badge = `放置 ${TEAM_META[state.placingTeam].label}${preset.label}`;
    hint = "点击沙盘完成放置，按 Esc 取消。";
  } else if (state.drawingRoute && unit) {
    badge = `为 ${unit.name} 绘线`;
    hint = "点击沙盘逐点添加路线，完成后点击“完成绘线”或按 Esc。";
  } else if (unit) {
    badge = `已选中 ${unit.name}`;
    hint = "可拖动位置、修改属性，或进入绘线模式。";
  }

  refs.modeBadge.textContent = badge;
  refs.boardHint.textContent = hint;
  refs.routeCount.textContent = `路线点：${unit ? unit.route.length : 0}`;
}

function renderGhostMarker() {
  const visible = Boolean((state.placingPresetId && state.placingTeam) || state.drawingRoute);
  refs.ghostMarker.classList.toggle("hidden", !visible);
}

function renderPresetList() {
  refs.presetList.innerHTML = "";

  for (const preset of PRESETS.filter((item) => BOARD_PRESET_IDS.includes(item.id))) {
    const card = document.createElement("article");
    card.className = "preset-card";

    const top = document.createElement("div");
    top.className = "preset-top";

    const meta = document.createElement("div");
    meta.className = "preset-meta";

    const label = document.createElement("div");
    label.className = "preset-label";
    label.textContent = preset.label;

    const desc = document.createElement("div");
    desc.className = "preset-desc";
    desc.textContent = preset.description;

    meta.append(label, desc);

    const token = document.createElement("div");
    token.className = "preset-token";
    token.textContent = preset.token;

    top.append(meta, token);

    const actions = document.createElement("div");
    actions.className = "preset-actions";

    for (const team of Object.keys(TEAM_META)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `team-button ${team}`;
      button.textContent = TEAM_META[team].label;
      button.addEventListener("click", () => {
        state.placingPresetId = preset.id;
        state.placingTeam = team;
        stopDrawingRoute();
        render();
      });
      actions.appendChild(button);
    }

    card.append(top, actions);
    refs.presetList.appendChild(card);
  }
}

function renderBoardSettings() {
  refs.boardWidthInput.value = state.board.widthMeters;
  refs.boardHeightInput.value = state.board.heightMeters;
  refs.gridStepInput.value = state.board.gridStepMeters;
  refs.showGridInput.checked = state.board.showGrid;
  refs.snapGridInput.checked = state.board.snapToGrid;
}

function buildTimelineStatusItems(currentSeconds) {
  const smallEnergyIssued = countIssuedOpportunities([0, 90], currentSeconds);
  const bigEnergyIssued = countIssuedOpportunities([180, 255, 330], currentSeconds);
  const dartIssued = countIssuedOpportunities([30, 240], currentSeconds);
  const sentrySupplyIssued = countIssuedOpportunities([60, 120, 180, 240, 300, 360], currentSeconds);

  return [
    currentSeconds < 180
      ? {
          title: "能量机关",
          text: `当前处于小能量机关阶段；双方已发放 ${smallEnergyIssued}/2 次激活机会。成功激活后，全队与基地/前哨站获得 25% 防御增益 45 秒。`,
        }
      : {
          title: "能量机关",
          text: `当前处于大能量机关阶段；双方已发放 ${bigEnergyIssued}/3 次激活机会。成功激活后会按平均环数与激活灯臂数给出攻击、防御和热量冷却增益。`,
        },
    dartIssued
      ? {
          title: "飞镖系统",
          text: `已发放 ${dartIssued}/2 次闸门机会。每次开闸完全开启约 7 秒，发射期 30 秒，同时对方检测窗口期刷新 40 秒。`,
        }
      : {
          title: "飞镖系统",
          text: "首个飞镖闸门机会将在 0:30 发放；未使用的开闸机会可以累积。",
        },
    currentSeconds < 300
      ? {
          title: "前哨站增益点",
          text: "仍处在 5:00 前窗口内：若对方前哨被击毁且己方前哨存活，可以反占对方前哨增益点；同时前哨站仍允许重建。",
        }
      : {
          title: "前哨站增益点",
          text: "5:00 后窗口关闭：前哨站不可再重建，也不能再反占对方前哨增益点，只能占领己方前哨对应增益点。",
        },
    currentSeconds < 180
      ? {
          title: "堡垒增益点",
          text: "对方堡垒尚未满足时间条件；此时只能等待 3:00 节点后，再结合“对方前哨被击毁”条件判断是否可反占。",
        }
      : {
          title: "堡垒增益点",
          text: "3:00 后，若对方前哨已被击毁，则步兵/哨兵可以占领对方堡垒；己方堡垒仍需在己方前哨首次被击毁后才会生效。",
        },
    {
      title: "哨兵补给",
      text: sentrySupplyIssued
        ? `已走过 ${sentrySupplyIssued} 个每分钟补给节点。哨兵可在己方补给区累计获得 ${sentrySupplyIssued * 100} 发 17mm 允许发弹量。`
        : "首个每分钟补给节点在 1:00 到来，此后每分钟增加 100 发可累计补给。",
    },
    {
      title: "无人机发弹量",
      text: "空中机器人开局自带 750 发 17mm 允许发弹量；七分钟比赛阶段不能通过补给区、增益点或远程方式额外兑换。",
    },
    currentSeconds >= 360
      ? {
          title: "终盘经济",
          text: "已进入 0:59 终盘阶段，对战双方在该分钟节点获得的固定金币增量提升为 150。",
        }
      : {
          title: "终盘经济",
          text: "常规分钟金币增量为 50；到 6:00（官方倒计时 0:59）会切换到最后一档 150 金币增量。",
        },
  ];
}

function buildTimelineEventItems(currentSeconds) {
  const markers = getSortedTimelineMarkers();
  const previousMarker = [...markers].reverse().find((marker) => marker.time <= currentSeconds) || null;
  const nextMarker = markers.find((marker) => marker.time > currentSeconds) || null;

  return [
    previousMarker
      ? {
          title: "最近节点",
          text: `${formatClock(previousMarker.time)} · ${previousMarker.laneLabel} · ${previousMarker.title}`,
        }
      : {
          title: "最近节点",
          text: "当前就在比赛开始点；双方的固定时间线从 0:00 同步启动。",
        },
    nextMarker
      ? {
          title: "下一个节点",
          text: `${formatClock(nextMarker.time)} · ${nextMarker.laneLabel} · ${nextMarker.title}`,
        }
      : {
          title: "下一个节点",
          text: "已经到达 7:00 末端；剩余变化只取决于双方在这一刻前触发的占领、命中和击毁结果。",
        },
    {
      title: "对称性",
      text: "红蓝双方的固定发放节点完全对称；时间轴里的差异主要来自谁先占领、谁先击毁前哨站/基地。",
    },
    {
      title: "条件提醒",
      text: "前哨站与堡垒相关条目是“满足条件时生效”的窗口，不代表一定会在该时刻自动发生状态切换。",
    },
  ];
}

function renderTimelineScale() {
  refs.timelineScale.innerHTML = "";

  for (let second = 0; second <= MATCH_DURATION_SECONDS; second += 60) {
    const tick = document.createElement("div");
    tick.className = "timeline-tick";
    tick.style.left = timelinePercent(second);

    const label = document.createElement("span");
    label.className = "timeline-tick-label";
    label.textContent = formatClock(second);

    tick.appendChild(label);
    refs.timelineScale.appendChild(tick);
  }
}

function renderTimelineLanes() {
  refs.timelineLanes.innerHTML = "";
  const currentSeconds = state.timelineSeconds;

  for (const lane of TIMELINE_LANES) {
    const row = document.createElement("div");
    row.className = "timeline-lane";

    const label = document.createElement("div");
    label.className = "timeline-lane-label";
    label.textContent = lane.label;

    const track = document.createElement("div");
    track.className = "timeline-track";

    const cursor = document.createElement("div");
    cursor.className = "timeline-cursor";
    cursor.style.left = timelinePercent(currentSeconds);
    track.appendChild(cursor);

    for (const segment of lane.segments) {
      const segmentNode = document.createElement("div");
      segmentNode.className = `timeline-segment ${segment.tone}`;
      segmentNode.style.left = timelinePercent(segment.start);
      segmentNode.style.width = `${((segment.end - segment.start) / MATCH_DURATION_SECONDS) * 100}%`;
      segmentNode.textContent = segment.label;
      track.appendChild(segmentNode);
    }

    for (const marker of lane.markers) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `timeline-marker${marker.time <= currentSeconds ? " past" : ""}`;
      button.style.left = timelinePercent(marker.time);
      button.title = `${lane.label} · ${formatClock(marker.time)} · ${marker.title}`;
      button.textContent = marker.short;
      button.addEventListener("click", () => {
        state.timelineSeconds = marker.time;
        render();
      });
      track.appendChild(button);
    }

    row.append(label, track);
    refs.timelineLanes.appendChild(row);
  }
}

function renderTimelineSummary() {
  const currentSeconds = state.timelineSeconds;
  refs.timelineActiveList.innerHTML = "";
  refs.timelineEventList.innerHTML = "";

  for (const item of buildTimelineStatusItems(currentSeconds)) {
    const row = document.createElement("div");
    row.className = "timeline-list-item";

    const title = document.createElement("span");
    title.className = "timeline-list-title";
    title.textContent = item.title;

    const text = document.createElement("span");
    text.className = "timeline-list-text";
    text.textContent = item.text;

    row.append(title, text);
    refs.timelineActiveList.appendChild(row);
  }

  for (const item of buildTimelineEventItems(currentSeconds)) {
    const row = document.createElement("div");
    row.className = "timeline-list-item";

    const title = document.createElement("span");
    title.className = "timeline-list-title";
    title.textContent = item.title;

    const text = document.createElement("span");
    text.className = "timeline-list-text";
    text.textContent = item.text;

    row.append(title, text);
    refs.timelineEventList.appendChild(row);
  }
}

function renderTimeline() {
  refs.timelineSlider.max = String(MATCH_DURATION_SECONDS);
  refs.timelineSlider.value = String(state.timelineSeconds);
  refs.timelineElapsedLabel.textContent = `已用时 ${formatClock(state.timelineSeconds)}`;
  refs.timelineCountdownLabel.textContent = `官方倒计时 ${formatOfficialCountdown(state.timelineSeconds)}`;
  renderTimelineScale();
  renderTimelineLanes();
  renderTimelineSummary();
}

function renderTerrainBuffs() {
  refs.terrainBuffList.innerHTML = "";

  for (const buff of BUFF_RULES) {
    const card = document.createElement("article");
    card.className = "terrain-buff-card";

    const head = document.createElement("div");
    head.className = "terrain-buff-head";

    const title = document.createElement("div");
    title.className = "terrain-buff-title";
    title.textContent = buff.label;

    const windowTag = document.createElement("span");
    windowTag.className = "terrain-buff-window";
    windowTag.textContent = buff.tag;

    head.append(title, windowTag);

    const body = document.createElement("div");
    body.className = "terrain-buff-body";

    for (const line of buff.lines) {
      const row = document.createElement("div");
      row.className = "terrain-buff-line";

      const label = document.createElement("span");
      label.className = "terrain-buff-label";
      label.textContent = line.label;

      const text = document.createElement("span");
      text.className = "terrain-buff-text";
      text.textContent = line.text;

      row.append(label, text);
      body.appendChild(row);
    }

    card.append(head, body);
    refs.terrainBuffList.appendChild(card);
  }
}

function formatSavedAt(isoString) {
  const stamp = new Date(isoString);
  if (Number.isNaN(stamp.getTime())) {
    return "未知时间";
  }

  const month = String(stamp.getMonth() + 1).padStart(2, "0");
  const date = String(stamp.getDate()).padStart(2, "0");
  const hours = String(stamp.getHours()).padStart(2, "0");
  const minutes = String(stamp.getMinutes()).padStart(2, "0");
  return `${month}-${date} ${hours}:${minutes}`;
}

function getModeSnapshotSummary(snapshot) {
  const unitCount = snapshot.units.length;
  const routePointCount = snapshot.units.reduce((sum, unit) => sum + unit.route.length, 0);
  return `${unitCount} 单位 · ${routePointCount} 路线点 · 时间轴 ${formatClock(snapshot.timelineSeconds)}`;
}

function renderModeLibrary() {
  const selectedMode = getSelectedMode();
  refs.modeNameInput.value = state.modeDraftName;
  refs.updateModeBtn.disabled = !selectedMode;
  refs.clearModeSelectionBtn.disabled = !selectedMode && !state.modeDraftName;

  if (selectedMode) {
    refs.modeLibraryMeta.textContent = `已选中「${selectedMode.name}」，可以载入或用当前沙盘覆盖更新。`;
  } else if (state.modes.length) {
    refs.modeLibraryMeta.textContent = "输入名称后可把当前沙盘保存成新模式；载入模式会替换当前摆位和路线。";
  } else {
    refs.modeLibraryMeta.textContent = "还没有保存模式，先摆好一套再存。";
  }

  if (!state.modes.length) {
    refs.modeList.className = "mode-list empty-list";
    refs.modeList.textContent = "还没有保存模式，先摆好一套再存。";
    return;
  }

  refs.modeList.className = "mode-list";
  refs.modeList.innerHTML = "";

  for (const mode of state.modes) {
    const card = document.createElement("article");
    card.className = `mode-card${mode.id === state.selectedModeId ? " selected" : ""}`;

    const main = document.createElement("button");
    main.type = "button";
    main.className = "mode-card-main";
    main.addEventListener("click", () => selectMode(mode.id));

    const top = document.createElement("div");
    top.className = "mode-card-top";

    const title = document.createElement("div");
    title.className = "mode-card-title";
    title.textContent = mode.name;

    const badge = document.createElement("span");
    badge.className = "mode-card-badge";
    badge.textContent = mode.id === state.selectedModeId ? "已选中" : "模式";

    top.append(title, badge);

    const subtitle = document.createElement("div");
    subtitle.className = "mode-card-subtitle";
    subtitle.textContent = getModeSnapshotSummary(mode.snapshot);

    const stamp = document.createElement("div");
    stamp.className = "mode-card-stamp";
    stamp.textContent = `保存于 ${formatSavedAt(mode.savedAt)}`;

    main.append(top, subtitle, stamp);

    const actions = document.createElement("div");
    actions.className = "mode-card-actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "ghost-btn mode-action-btn";
    loadBtn.textContent = "载入";
    loadBtn.addEventListener("click", () => {
      const selected = selectMode(mode.id, { renderUI: false });
      if (!selected) {
        return;
      }
      applySnapshot(selected.snapshot, { renderUI: false });
      render();
    });

    const duplicateBtn = document.createElement("button");
    duplicateBtn.type = "button";
    duplicateBtn.className = "ghost-btn mode-action-btn";
    duplicateBtn.textContent = "复制";
    duplicateBtn.addEventListener("click", () => {
      const copy = {
        id: createId(),
        name: createDuplicateModeName(mode.name),
        savedAt: new Date().toISOString(),
        snapshot: cloneValue(mode.snapshot),
      };
      state.modes.unshift(copy);
      state.selectedModeId = copy.id;
      state.modeDraftName = copy.name;
      render();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-btn mode-action-btn";
    deleteBtn.textContent = "删除";
    deleteBtn.addEventListener("click", () => {
      const isSelected = mode.id === state.selectedModeId;
      state.modes = state.modes.filter((item) => item.id !== mode.id);
      if (isSelected) {
        state.selectedModeId = null;
        state.modeDraftName = "";
      }
      render();
    });

    actions.append(loadBtn, duplicateBtn, deleteBtn);
    card.append(main, actions);
    refs.modeList.appendChild(card);
  }
}

function renderBoardIconSlots() {
  refs.iconSlotList.innerHTML = "";

  for (const slot of BOARD_ICON_SLOTS) {
    const card = document.createElement("article");
    card.className = "icon-slot-card";

    const preview = document.createElement("div");
    preview.className = "icon-slot-preview";

    const icon = state.boardIcons[slot.key];
    if (icon) {
      const image = document.createElement("img");
      image.src = icon;
      image.alt = `${slot.code}-${slot.label}`;
      preview.appendChild(image);
    } else {
      preview.textContent = slot.code;
    }

    const meta = document.createElement("div");
    meta.className = "icon-slot-meta";

    const title = document.createElement("div");
    title.className = "icon-slot-title";
    title.textContent = `${slot.code} · ${slot.label}`;

    const subtitle = document.createElement("div");
    subtitle.className = "icon-slot-subtitle";
    subtitle.textContent = icon ? "已插入图标" : "未插入图标";

    meta.append(title, subtitle);

    const actions = document.createElement("div");
    actions.className = "icon-slot-actions";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "ghost-btn icon-action-btn";
    uploadBtn.textContent = icon ? "更换" : "插入";
    uploadBtn.addEventListener("click", () => {
      pendingBoardIconSlot = slot.key;
      refs.boardIconInput.click();
    });

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "ghost-btn icon-action-btn";
    clearBtn.textContent = "清空";
    clearBtn.disabled = !icon;
    clearBtn.addEventListener("click", () => {
      state.boardIcons[slot.key] = "";
      render();
    });

    actions.append(uploadBtn, clearBtn);
    card.append(preview, meta, actions);
    refs.iconSlotList.appendChild(card);
  }
}

function render() {
  updateBoardAspect();
  renderGrid();
  renderBackground();
  renderUnits();
  renderRoutes();
  renderBoardIconSlots();
  renderTimeline();
  renderTerrainBuffs();
  renderModeLibrary();
  renderUnitList();
  renderDetails();
  renderMode();
  renderBoardSettings();
  renderGhostMarker();
  scheduleRealtimeSync();
}

function shadeColor(hex, percent) {
  const sanitized = hex.replace("#", "");
  const num = Number.parseInt(sanitized, 16);
  const amount = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amount, 0, 255);
  const g = clamp(((num >> 8) & 0x00ff) + amount, 0, 255);
  const b = clamp((num & 0x0000ff) + amount, 0, 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function persistToLocal() {
  writeStorageValue(getStorageKey(), JSON.stringify(state));
}

function restoreFromLocal() {
  for (const storageKey of getRestoreStorageKeys()) {
    const raw = readStorageValue(storageKey);
    if (!raw) {
      continue;
    }

    try {
      const saved = JSON.parse(raw);
      applyAppPayload(saved, { renderUI: false });
      state.selectedUnitId = state.units.some((unit) => unit.id === saved.selectedUnitId)
        ? saved.selectedUnitId
        : (state.units[0] ? state.units[0].id : null);

      if (storageKey !== getStorageKey()) {
        persistToLocal();
      }

      return true;
    } catch (error) {
      console.warn("无法恢复本地保存", error);
      if (storageKey === getStorageKey()) {
        removeStorageValue(storageKey);
      }
    }
  }

  return false;
}

function exportState() {
  const payload = createPortablePayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `rm2026-sandbox-${Date.now()}.json`);
}

function importState(payload) {
  applyAppPayload(payload);
}

function saveCurrentAsMode() {
  const name = (state.modeDraftName || createDefaultModeName()).trim() || createDefaultModeName();
  const mode = {
    id: createId(),
    name,
    savedAt: new Date().toISOString(),
    snapshot: createModeSnapshot(),
  };

  state.modes.unshift(mode);
  state.selectedModeId = mode.id;
  state.modeDraftName = mode.name;
  render();
}

function updateSelectedModeSnapshot() {
  const mode = getSelectedMode();
  if (!mode) {
    return;
  }

  mode.name = (state.modeDraftName || mode.name).trim() || mode.name;
  mode.savedAt = new Date().toISOString();
  mode.snapshot = createModeSnapshot();
  state.modeDraftName = mode.name;
  render();
}

function placeUnitAt(point) {
  const unit = createUnit(state.placingPresetId, state.placingTeam, point.x, point.y);
  state.units.push(unit);
  state.selectedUnitId = unit.id;
  cancelPlacement();
  render();
}

function addRoutePoint(point) {
  const unit = getSelectedUnit();
  if (!unit) {
    return;
  }
  unit.route.push({ x: point.x, y: point.y });
  render();
}

function deleteSelected() {
  if (!state.selectedUnitId) {
    return;
  }
  state.units = state.units.filter((unit) => unit.id !== state.selectedUnitId);
  state.selectedUnitId = state.units[0] ? state.units[0].id : null;
  stopDrawingRoute();
  state.dragging = null;
  render();
}

function duplicateSelected() {
  const unit = getSelectedUnit();
  if (!unit) {
    return;
  }
  const copy = structuredClone(unit);
  copy.id = createId();
  copy.name = `${unit.name}-副本`;
  copy.x = clamp(roundTo(unit.x + 2), 0, 100);
  copy.y = clamp(roundTo(unit.y + 2), 0, 100);
  state.units.push(copy);
  state.selectedUnitId = copy.id;
  render();
}

function spawnStandardRoster(team) {
  const redPositions = [
    { x: 10, y: 48 },
    { x: 12, y: 68 },
    { x: 18, y: 36 },
    { x: 20, y: 58 },
    { x: 24, y: 78 },
    { x: 14, y: 20 },
    { x: 8, y: 84 },
    { x: 6, y: 28 },
  ];
  const bluePositions = redPositions.map((point) => ({ x: 100 - point.x, y: 100 - point.y }));
  const positions = team === "red" ? redPositions : bluePositions;

  STANDARD_ROSTER.forEach((presetId, index) => {
    const point = positions[index];
    state.units.push(createUnit(presetId, team, point.x, point.y));
  });
}

function seedDemo() {
  state.units = [];
  spawnStandardRoster("red");
  spawnStandardRoster("blue");
  state.units[0].route = [{ x: 20, y: 52 }, { x: 34, y: 44 }, { x: 48, y: 38 }];
  state.units[1].route = [{ x: 18, y: 66 }, { x: 28, y: 74 }, { x: 40, y: 76 }];
  state.units[5].route = [{ x: 80, y: 48 }, { x: 66, y: 42 }, { x: 54, y: 38 }];
  state.selectedUnitId = state.units[0].id;
  cancelPlacement();
  stopDrawingRoute();
  state.dragging = null;
  render();
}

function handleUnitPointerDown(event) {
  const unitId = event.currentTarget.dataset.unitId;
  const unit = state.units.find((item) => item.id === unitId);
  if (!unit) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  setSelection(unitId, { renderUI: false });

  const point = pointFromEvent(event, { snap: false });
  state.dragging = {
    unitId,
    pointerId: event.pointerId,
    offsetX: roundTo(unit.x - point.x),
    offsetY: roundTo(unit.y - point.y),
  };
  render();
}

function handlePointerMove(event) {
  const point = pointFromEvent(event, { snap: !state.drawingRoute });
  refs.cursorMeters.textContent = `坐标：${formatMeters(point.x, point.y)}`;
  refs.ghostMarker.style.left = `${point.x}%`;
  refs.ghostMarker.style.top = `${point.y}%`;
}

function handleGlobalPointerMove(event) {
  if (!state.dragging) {
    return;
  }

  const point = pointFromEvent(event, { snap: false });
  refs.cursorMeters.textContent = `坐标：${formatMeters(point.x, point.y)}`;

  const unit = state.units.find((item) => item.id === state.dragging.unitId);
  if (!unit) {
    state.dragging = null;
    return;
  }

  const target = snapPercent(point.x + state.dragging.offsetX, point.y + state.dragging.offsetY);
  unit.x = target.x;
  unit.y = target.y;
  render();
}

function handlePointerUp() {
  state.dragging = null;
}

function handleBoardClick(event) {
  if (event.target.closest(".unit-token")) {
    return;
  }

  if (state.placingPresetId && state.placingTeam) {
    const point = pointFromEvent(event, { snap: true });
    placeUnitAt(point);
    return;
  }

  if (state.drawingRoute && state.selectedUnitId) {
    const point = pointFromEvent(event, { snap: false });
    addRoutePoint(point);
    return;
  }

  if (event.target === refs.boardSurface || event.target.closest(".board-surface")) {
    state.selectedUnitId = null;
    stopDrawingRoute();
    render();
  }
}

function handleBoardSettingChange() {
  state.board.widthMeters = Math.max(Number(refs.boardWidthInput.value) || 28, 1);
  state.board.heightMeters = Math.max(Number(refs.boardHeightInput.value) || 15, 1);
  state.board.gridStepMeters = Math.max(Number(refs.gridStepInput.value) || 0.5, 0.1);
  state.board.showGrid = refs.showGridInput.checked;
  state.board.snapToGrid = refs.snapGridInput.checked;
  render();
}

function bindDetailInputs() {
  refs.unitNameInput.addEventListener("input", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.name = refs.unitNameInput.value || unit.name;
    render();
  });

  refs.unitTypeInput.addEventListener("input", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.type = refs.unitTypeInput.value || unit.type;
    render();
  });

  refs.unitTeamInput.addEventListener("change", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    const previousTeam = unit.team;
    unit.team = refs.unitTeamInput.value;
    if (!unit.color || unit.color === TEAM_META[previousTeam].color) {
      unit.color = TEAM_META[unit.team].color;
    }
    if (!unit.routeColor || unit.routeColor === TEAM_META[previousTeam].color) {
      unit.routeColor = TEAM_META[unit.team].color;
    }
    render();
  });

  refs.unitTokenInput.addEventListener("input", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.token = refs.unitTokenInput.value || unit.token;
    render();
  });

  refs.unitSizeInput.addEventListener("input", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.size = Number(refs.unitSizeInput.value);
    render();
  });

  refs.unitColorInput.addEventListener("input", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.color = refs.unitColorInput.value;
    render();
  });

  refs.routeColorInput.addEventListener("input", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.routeColor = refs.routeColorInput.value;
    render();
  });

  refs.unitNoteInput.addEventListener("input", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.note = refs.unitNoteInput.value;
  });
}

function bindActions() {
  refs.boardSurface.addEventListener("click", handleBoardClick);
  refs.boardSurface.addEventListener("pointermove", handlePointerMove);
  refs.boardSurface.addEventListener("pointerleave", () => {
    refs.cursorMeters.textContent = "坐标：-";
  });

  window.addEventListener("pointermove", handleGlobalPointerMove);
  window.addEventListener("pointerup", handlePointerUp);

  refs.boardWidthInput.addEventListener("change", handleBoardSettingChange);
  refs.boardHeightInput.addEventListener("change", handleBoardSettingChange);
  refs.gridStepInput.addEventListener("change", handleBoardSettingChange);
  refs.showGridInput.addEventListener("change", handleBoardSettingChange);
  refs.snapGridInput.addEventListener("change", handleBoardSettingChange);
  refs.modeNameInput.addEventListener("input", () => {
    state.modeDraftName = refs.modeNameInput.value;
    renderModeLibrary();
  });
  refs.saveModeBtn.addEventListener("click", saveCurrentAsMode);
  refs.updateModeBtn.addEventListener("click", updateSelectedModeSnapshot);
  refs.clearModeSelectionBtn.addEventListener("click", () => {
    selectMode(null, { renderUI: false });
    state.modeDraftName = "";
    renderModeLibrary();
  });
  refs.timelineSlider.addEventListener("input", () => {
    state.timelineSeconds = Number(refs.timelineSlider.value);
    renderTimeline();
  });

  refs.drawRouteBtn.addEventListener("click", () => {
    if (!getSelectedUnit()) {
      return;
    }
    cancelPlacement();
    state.drawingRoute = true;
    render();
  });

  refs.finishRouteBtn.addEventListener("click", () => {
    stopDrawingRoute();
    render();
  });

  refs.undoPointBtn.addEventListener("click", () => {
    const unit = getSelectedUnit();
    if (!unit || !unit.route.length) {
      return;
    }
    unit.route.pop();
    render();
  });

  refs.clearRouteBtn.addEventListener("click", () => {
    const unit = getSelectedUnit();
    if (!unit) {
      return;
    }
    unit.route = [];
    render();
  });

  refs.deleteBtn.addEventListener("click", deleteSelected);
  refs.duplicateBtn.addEventListener("click", duplicateSelected);
  refs.loadBundleBtn.addEventListener("click", () => {
    applyAppPayload(getBundledPackagePayload());
    persistToLocal();
    refs.boardHint.textContent = "已恢复到内置默认方案。";
  });
  refs.exportOfflineBtn.addEventListener("click", exportOfflinePackage);
  if (refs.goHomeBtn) {
    refs.goHomeBtn.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  refs.saveLocalBtn.addEventListener("click", () => {
    persistToLocal();
    refs.boardHint.textContent = "当前方案已保存到浏览器本地。";
  });

  refs.exportBtn.addEventListener("click", exportState);
  refs.importBtn.addEventListener("click", () => refs.importInput.click());
  refs.seedDemoBtn.addEventListener("click", seedDemo);
  refs.addRedRosterBtn.addEventListener("click", () => {
    spawnStandardRoster("red");
    render();
  });
  refs.addBlueRosterBtn.addEventListener("click", () => {
    spawnStandardRoster("blue");
    render();
  });

  refs.clearBoardBtn.addEventListener("click", () => {
    state.units = [];
    state.selectedUnitId = null;
    cancelPlacement();
    stopDrawingRoute();
    state.dragging = null;
    render();
  });

  refs.uploadBackgroundBtn.addEventListener("click", () => refs.backgroundInput.click());

  refs.clearBackgroundBtn.addEventListener("click", () => {
    state.board.backgroundImage = "";
    render();
  });

  refs.backgroundInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    state.board.backgroundImage = await fileToDataUrl(file);
    render();
    refs.backgroundInput.value = "";
  });

  refs.boardIconInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    const slotKey = pendingBoardIconSlot;
    pendingBoardIconSlot = null;
    refs.boardIconInput.value = "";

    if (!file || !slotKey) {
      return;
    }

    state.boardIcons[slotKey] = await fileToDataUrl(file);
    render();
  });

  refs.importInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      importState(payload);
    } catch (error) {
      console.error("导入失败", error);
      refs.boardHint.textContent = "导入失败，请检查 JSON 文件格式。";
    } finally {
      refs.importInput.value = "";
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      cancelPlacement();
      stopDrawingRoute();
      render();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      const activeTag = document.activeElement ? document.activeElement.tagName : "";
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
        return;
      }
      deleteSelected();
    }
  });

  window.addEventListener("beforeunload", () => {
    persistToLocal();
    if (roomChannel) {
      supabase.removeChannel(roomChannel);
      roomChannel = null;
    }
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function init() {
  renderPresetList();
  bindDetailInputs();
  bindActions();
  if (!window.RM2026_OFFLINE_SOURCE) {
    refs.exportOfflineBtn.disabled = true;
    refs.exportOfflineBtn.title = "当前页面未注入离线包源文件";
  }
  if (!restoreFromLocal()) {
    applyAppPayload(getBundledPackagePayload(), { renderUI: false });
  }
  render();
  void initRealtimeCollaboration();
}

init();
