import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Search, Plus, MoreHorizontal, ChevronDown, ChevronRight, ChevronLeft, X,
  LayoutDashboard, BarChart3, CalendarDays, Star, Bell, Settings,
  Trash2, Pencil, CheckCircle2, XCircle, Clock3, ArrowRight,
  TrendingUp, TrendingDown, Building2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* 定数・ユーティリティ                                                */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["WEB", "グラフィック", "動画", "AI", "SNS"];
const ASSIGNEES = ["荻田", "岡田"];

const STATUS_LABEL = {
  active: "進行中",
  won: "受注",
  lost: "ロスト",
};

const CONF_LABEL = { 1: "★☆☆", 2: "★★☆", 3: "★★★" };
const CONF_HINT = { 1: "可能性低め", 2: "五分五分", 3: "可能性が高い" };

function monthLabel(m) {
  const [y, mo] = m.split("-");
  return `${y}年${parseInt(mo, 10)}月`;
}

function yearOf(m) {
  return m.slice(0, 4);
}

// 会社名の50音絞り込み用ユーティリティ。
// 「株式会社」などの法人格を除いた先頭文字がどの行に属するかを判定する。
const KANA_ROWS = {
  あ: "あいうえおアイウエオ",
  か: "かきくけこがぎぐげごカキクケコガギグゲゴ",
  さ: "さしすせそざじずぜぞサシスセソザジズゼゾ",
  た: "たちつてとだぢづでどタチツテトダヂヅデド",
  な: "なにぬねのナニヌネノ",
  は: "はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ",
  ま: "まみむめもマミムメモ",
  や: "やゆよゃゅょヤユヨャュョ",
  ら: "らりるれろラリルレロ",
  わ: "わをんゔヴわゐゑワヲンヴ",
};

function companyDisplayName(name) {
  return name.replace(/^(株式会社|有限会社|合同会社)/, "");
}

function companyKanaRow(name) {
  const first = companyDisplayName(name)[0] || "";
  for (const [row, chars] of Object.entries(KANA_ROWS)) {
    if (chars.includes(first)) return row;
  }
  return "他";
}

function addMonths(m, n) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayIso() {
  return new Date().toISOString();
}

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatYen(n) {
  if (n === null || n === undefined) return "—";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function formatManYen(n) {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n / 10000).toLocaleString("ja-JP")}万円`;
}

// 受注率 = 受注 / (受注 + ロスト) × 100。引き伸ばし・進行中は分母から除外。
function winRate(won, lost) {
  const denom = won + lost;
  if (denom === 0) return null;
  return Math.round((won / denom) * 1000) / 10;
}

function computeCounts(list) {
  const won = list.filter((p) => p.status === "won").length;
  const lost = list.filter((p) => p.status === "lost").length;
  const active = list.filter((p) => p.status === "active").length;
  const estimatedTotal = list
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + (Number(p.estimatedAmount) || 0), 0);
  const confirmedTotal = list
    .filter((p) => p.status === "won")
    .reduce((sum, p) => sum + (Number(p.confirmedAmount) || 0), 0);
  return {
    total: list.length,
    won,
    lost,
    active,
    rate: winRate(won, lost),
    estimatedTotal,
    confirmedTotal,
  };
}

/* ------------------------------------------------------------------ */
/* シードデータ                                                        */
/* ------------------------------------------------------------------ */

const CLIENT_NAMES = [
  "株式会社アルファデザイン", "有限会社グリーンリーフ", "株式会社サンライズ商事",
  "株式会社ノーザンライツ", "合同会社ブルーム", "株式会社テラス建築",
  "株式会社フィールドワークス", "株式会社みなと運輸", "株式会社オレンジページ制作",
  "株式会社シーサイド不動産", "株式会社たけやま食品", "株式会社クラウドナイン",
  "株式会社さくら学院", "株式会社リバーサイド商店", "株式会社ハーモニー音楽",
  "株式会社みらい工房", "有限会社にしき屋", "株式会社スターゲイズ",
  "株式会社パインツリー", "株式会社あすなろ設計", "株式会社ことのは出版",
  "株式会社フォレストガーデン", "株式会社かがやき整体", "株式会社なでしこ農園",
];

const PROJECT_NAMES = {
  WEB: ["コーポレートサイト制作", "採用サイトリニューアル", "ECサイト構築", "LP制作", "会員サイト改修"],
  グラフィック: ["パンフレット制作", "会社案内デザイン", "ロゴ・VI制作", "商品カタログ制作", "名刺デザイン"],
  動画: ["採用動画制作", "商品紹介動画", "会社紹介ムービー", "SNS広告動画", "展示会用映像制作"],
  AI: ["社内AIチャットボット導入", "AI需要予測ツール開発", "AIコピー生成ツール導入", "業務自動化AI構築"],
  SNS: ["Instagram運用代行", "X運用・広告代行", "SNS広告クリエイティブ制作", "TikTok運用支援"],
};

const BASE_AMOUNT = { WEB: 800000, グラフィック: 300000, 動画: 600000, AI: 1500000, SNS: 200000 };

const CONTACT_FAMILY_NAMES = ["田中", "鈴木", "佐藤", "高橋", "伊藤", "渡辺", "山本", "中村", "小林", "加藤"];

function contactFor(idx) {
  return {
    contactName: `${CONTACT_FAMILY_NAMES[idx % CONTACT_FAMILY_NAMES.length]} 様`,
    contactEmail: `contact${idx}@example.co.jp`,
  };
}

function roundTo10k(n) {
  return Math.round(n / 10000) * 10000;
}

function seedProjects() {
  const months = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];
  const statuses = ["active", "active", "active", "won", "lost"];
  let clientIdx = 0;
  const list = [];
  months.forEach((month, mi) => {
    CATEGORIES.forEach((cat, ci) => {
      const countForCell = mi === 0 || mi === 1 ? 1 : ci % 2 === 0 ? 1 : 0;
      for (let i = 0; i < countForCell + 1; i++) {
        const name =
          PROJECT_NAMES[cat][(clientIdx + i) % PROJECT_NAMES[cat].length];
        const client = CLIENT_NAMES[clientIdx % CLIENT_NAMES.length];
        clientIdx++;
        const confidence = ((clientIdx + ci) % 3) + 1;
        const status = statuses[(clientIdx + mi) % statuses.length];
        const assignee = ASSIGNEES[clientIdx % ASSIGNEES.length];
        const estimatedAmount = roundTo10k(BASE_AMOUNT[cat] * (1 + (((clientIdx % 5) - 2) * 0.15)));
        const confirmedAmount =
          status === "won" ? roundTo10k(estimatedAmount * (0.9 + (clientIdx % 3) * 0.05)) : null;
        const contact = contactFor(clientIdx);
        const created = new Date(2026, 7 + mi, 1 + ((clientIdx * 3) % 25)).toISOString();
        list.push({
          id: uid(),
          name,
          clientName: client,
          category: cat,
          scheduledMonth: month,
          confidence,
          status,
          assignee,
          estimatedAmount,
          confirmedAmount,
          contactName: contact.contactName,
          contactEmail: contact.contactEmail,
          memo: "",
          progressNotes: [],
          archived: false,
          createdAt: created,
          updatedAt: created,
          history: [
            {
              id: uid(),
              date: created,
              type: "created",
              label: "新規登録",
              scheduledMonth: month,
            },
            ...(status !== "active"
              ? [
                  {
                    id: uid(),
                    date: created,
                    type: status,
                    label: status === "won" ? "受注" : "ロスト",
                    previousStatus: "active",
                  },
                ]
              : []),
          ],
        });
      }
    });
  });
  return list.slice(0, 24);
}

// 昨年(2025年)との比較用に、各社の過去実績をアーカイブ案件として生成する。
// archived: true の案件はダッシュボード本体（案件ボード）には表示されず、
// 「年別売上」「会社一覧」ページの実績比較にのみ使われる。
function seedArchivedProjects() {
  const list = [];
  CLIENT_NAMES.forEach((client, ci) => {
    const dealCount = 2 + (ci % 3); // 会社ごとに2〜4件
    for (let d = 0; d < dealCount; d++) {
      const monthIndex = (ci * 3 + d * 4) % 12;
      const month = `2025-${String(monthIndex + 1).padStart(2, "0")}`;
      const cat = CATEGORIES[(ci + d) % CATEGORIES.length];
      const name = PROJECT_NAMES[cat][(ci + d) % PROJECT_NAMES[cat].length];
      const assignee = ASSIGNEES[(ci + d) % ASSIGNEES.length];
      const estimatedAmount = roundTo10k(BASE_AMOUNT[cat] * (1 + (((ci + d) % 5 - 2) * 0.15)));
      const status = (ci + d) % 4 === 3 ? "lost" : "won";
      const confirmedAmount = status === "won" ? roundTo10k(estimatedAmount * (0.9 + ((ci + d) % 3) * 0.05)) : null;
      const contact = contactFor(ci * 7 + d);
      const created = new Date(2025, monthIndex, 10).toISOString();
      list.push({
        id: uid(),
        name,
        clientName: client,
        category: cat,
        scheduledMonth: month,
        confidence: ((ci + d) % 3) + 1,
        status,
        assignee,
        estimatedAmount,
        confirmedAmount,
        contactName: contact.contactName,
        contactEmail: contact.contactEmail,
        memo: "",
        progressNotes: [],
        archived: true,
        createdAt: created,
        updatedAt: created,
        history: [
          { id: uid(), date: created, type: "created", label: "新規登録", scheduledMonth: month },
          {
            id: uid(),
            date: created,
            type: status,
            label: status === "won" ? "受注" : "ロスト",
            previousStatus: "active",
          },
        ],
      });
    }
  });
  return list;
}

/* ------------------------------------------------------------------ */
/* 小さな UI パーツ                                                     */
/* ------------------------------------------------------------------ */

function ConfidenceStars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" title={CONF_HINT[value]}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: "bg-slate-100 text-slate-600",
    won: "bg-emerald-50 text-emerald-700",
    lost: "bg-rose-50 text-rose-700",
  };
  const icon = {
    active: <Clock3 size={12} />,
    won: <CheckCircle2 size={12} />,
    lost: <XCircle size={12} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}
    >
      {icon[status]}
      {STATUS_LABEL[status]}
    </span>
  );
}

function CategoryPill({ category }) {
  return (
    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {category}
    </span>
  );
}

function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg animate-[fadeIn_150ms_ease-out]"
        >
          <CheckCircle2 size={16} className="text-emerald-400" />
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-900/40 px-4 py-10 overflow-y-auto">
      <div
        className={`w-full ${width} rounded-2xl bg-white shadow-xl transition-all duration-150`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, tone = "default" }) {
  if (!open) return null;
  const btnTone =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700"
      : "bg-indigo-600 hover:bg-indigo-700";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${btnTone}`}
          >
            確定する
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({ project, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const items = [
    { key: "won", label: "受注にする", show: project.status === "active" },
    { key: "postpone", label: "時期変更する", show: project.status === "active" },
    { key: "lost", label: "ロストにする", show: project.status === "active" },
    { key: "edit", label: "編集", show: true },
    { key: "delete", label: "削除", show: true, danger: true },
  ].filter((i) => i.show);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
          {items.map((i) => (
            <button
              key={i.key}
              onClick={() => {
                setOpen(false);
                onAction(i.key, project);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                i.danger ? "text-rose-600" : "text-slate-700"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KPI カード                                                          */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, suffix = "", accent = "text-slate-900" }) {
  return (
    <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-5">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>
        {value}
        <span className="ml-0.5 text-lg text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 案件テーブル（月別セクション）                                        */
/* ------------------------------------------------------------------ */

function MonthSection({ month, projects, defaultOpen, onAction, onOpenDetail }) {
  const [open, setOpen] = useState(defaultOpen);
  const counts = computeCounts(projects);
  const postponedOut = projects[0]?.__postponedOutCount ?? 0;

  if (projects.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          <span className="text-sm font-semibold text-slate-900">{monthLabel(month)}</span>
          <span className="text-xs text-slate-400">{projects.length}件</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>受注 <b className="text-emerald-600">{counts.won}</b></span>
          <span>ロスト <b className="text-rose-600">{counts.lost}</b></span>
          <span>受注率 <b className="text-slate-800">{counts.rate ?? "—"}{counts.rate !== null ? "%" : ""}</b></span>
          <span>見込み <b className="text-amber-600">{formatManYen(counts.estimatedTotal)}</b></span>
          <span>確定 <b className="text-emerald-600">{formatManYen(counts.confirmedTotal)}</b></span>
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="px-5 py-2 font-medium">案件</th>
                <th className="px-3 py-2 font-medium">客先</th>
                <th className="px-3 py-2 font-medium">内容</th>
                <th className="px-3 py-2 font-medium">担当</th>
                <th className="px-3 py-2 font-medium">肌感</th>
                <th className="px-3 py-2 font-medium">金額</th>
                <th className="px-3 py-2 font-medium">状態</th>
                <th className="px-3 py-2 font-medium">更新日</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                  onClick={() => onOpenDetail(p)}
                >
                  <td className="max-w-[220px] truncate px-5 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="max-w-[160px] truncate px-3 py-3 text-slate-500">{p.clientName}</td>
                  <td className="px-3 py-3"><CategoryPill category={p.category} /></td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-500">{p.assignee}</td>
                  <td className="px-3 py-3"><ConfidenceStars value={p.confidence} /></td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums text-slate-600">
                    {p.status === "won" ? formatManYen(p.confirmedAmount) : formatManYen(p.estimatedAmount)}
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-400">{fmtDate(p.updatedAt)}</td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu project={p} onAction={onAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 案件追加・編集モーダル                                                */
/* ------------------------------------------------------------------ */

function ProjectForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    initial ?? {
      name: "",
      clientName: "",
      category: "WEB",
      scheduledMonth: "2026-09",
      confidence: 2,
      assignee: ASSIGNEES[0],
      estimatedAmount: "",
      contactName: "",
      contactEmail: "",
      memo: "",
    }
  );
  const valid =
    form.name.trim() &&
    form.clientName.trim() &&
    form.scheduledMonth &&
    form.estimatedAmount !== "" &&
    Number(form.estimatedAmount) >= 0;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-slate-500">案件名 *</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          placeholder="例）コーポレートサイト制作"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">客先（会社名） *</label>
        <input
          value={form.clientName}
          onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          placeholder="例）株式会社◯◯"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500">先方ご担当者名</label>
          <input
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="例）田中 様"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">先方メールアドレス</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="例）tanaka@example.co.jp"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500">受注予定月 *</label>
          <input
            type="month"
            value={form.scheduledMonth}
            onChange={(e) => setForm({ ...form, scheduledMonth: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">クリエイティブ内容 *</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">見込み金額 *</label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">¥</span>
          <input
            type="number"
            min="0"
            step="10000"
            value={form.estimatedAmount}
            onChange={(e) => setForm({ ...form, estimatedAmount: e.target.value })}
            className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="例）800000"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">自社担当者</label>
        <div className="mt-1 flex gap-2">
          {ASSIGNEES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setForm({ ...form, assignee: a })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                form.assignee === a
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">自分たちの肌感</label>
        <div className="mt-1 flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setForm({ ...form, confidence: n })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                form.confidence === n
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {CONF_LABEL[n]}
              <div className="text-[11px] text-slate-400">{CONF_HINT[n]}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">メモ（任意）</label>
        <textarea
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          placeholder="営業状況などを自由に記入"
        />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          キャンセル
        </button>
        <button
          disabled={!valid}
          onClick={() => onSubmit(form)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          保存する
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 時期変更ダイアログ                                                    */
/* ------------------------------------------------------------------ */

function PostponeDialog({ project, onClose, onConfirm }) {
  if (!project) return null;
  return <PostponeDialogInner project={project} onClose={onClose} onConfirm={onConfirm} />;
}

function PostponeDialogInner({ project, onClose, onConfirm }) {
  const [target, setTarget] = useState(project.scheduledMonth);
  const changed = target && target !== project.scheduledMonth;
  return (
    <Modal open={!!project} onClose={onClose} title="受注予定月を変更する" width="max-w-sm">
      <p className="text-sm text-slate-500">
        「{project?.name}」の受注予定月を変更します。前の月・先の月どちらでも自由に選択できます。
      </p>
      <div className="mt-4 flex items-center justify-center gap-3 text-sm">
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">
          {project && monthLabel(project.scheduledMonth)}
        </span>
        <ArrowRight size={16} className="text-slate-400" />
        <input
          type="month"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 focus:border-indigo-400 focus:outline-none"
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          キャンセル
        </button>
        <button
          disabled={!changed}
          onClick={() => onConfirm(target)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {target && monthLabel(target)}へ変更する
        </button>
      </div>
    </Modal>
  );
}

function WonDialog({ project, onClose, onConfirm }) {
  if (!project) return null;
  return <WonDialogInner project={project} onClose={onClose} onConfirm={onConfirm} />;
}

function WonDialogInner({ project, onClose, onConfirm }) {
  const [amount, setAmount] = useState(project.estimatedAmount ?? "");
  const valid = amount !== "" && Number(amount) >= 0;
  return (
    <Modal open={!!project} onClose={onClose} title="受注金額を入力" width="max-w-sm">
      <p className="text-sm text-slate-500">
        「{project.name}」を受注にします。確定金額を入力してください。
      </p>
      <div className="mt-3 text-xs text-slate-400">見込み金額：{formatYen(project.estimatedAmount)}</div>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">¥</span>
        <input
          type="number"
          min="0"
          step="10000"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          placeholder="例）800000"
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          キャンセル
        </button>
        <button
          disabled={!valid}
          onClick={() => onConfirm(Number(amount))}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          受注として確定する
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* 案件詳細ドロワー                                                     */
/* ------------------------------------------------------------------ */

function ProjectDetail({ project, onClose, onAction, onAddNote }) {
  if (!project) return null;
  return (
    <ProjectDetailInner
      project={project}
      onClose={onClose}
      onAction={onAction}
      onAddNote={onAddNote}
    />
  );
}

function ProjectDetailInner({ project, onClose, onAction, onAddNote }) {
  const [noteText, setNoteText] = useState("");
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">案件詳細</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900">{project.name}</div>
              <div className="mt-1 text-sm text-slate-500">{project.clientName}</div>
            </div>
            <StatusBadge status={project.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">カテゴリー</div>
              <div className="mt-1"><CategoryPill category={project.category} /></div>
            </div>
            <div>
              <div className="text-xs text-slate-400">肌感</div>
              <div className="mt-1"><ConfidenceStars value={project.confidence} /></div>
            </div>
            <div>
              <div className="text-xs text-slate-400">受注予定月</div>
              <div className="mt-1 font-medium text-slate-700">{monthLabel(project.scheduledMonth)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">自社担当者</div>
              <div className="mt-1 font-medium text-slate-700">{project.assignee}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">先方ご担当者</div>
              <div className="mt-1 font-medium text-slate-700">{project.contactName || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">先方メールアドレス</div>
              <div className="mt-1 break-all font-medium text-slate-700">{project.contactEmail || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">見込み金額</div>
              <div className="mt-1 font-medium text-slate-700">{formatYen(project.estimatedAmount)}</div>
            </div>
            {project.status === "won" && (
              <div>
                <div className="text-xs text-slate-400">確定金額</div>
                <div className="mt-1 font-medium text-emerald-700">{formatYen(project.confirmedAmount)}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400">更新日</div>
              <div className="mt-1 font-medium text-slate-700">{fmtDate(project.updatedAt)}</div>
            </div>
          </div>
          {project.memo && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{project.memo}</div>
          )}

          {project.status === "active" && (
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => onAction("won", project)}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                受注
              </button>
              <button
                onClick={() => onAction("postpone", project)}
                className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                時期変更
              </button>
              <button
                onClick={() => onAction("lost", project)}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                ロスト
              </button>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold text-slate-400">進行状況メモ</div>
            <div className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="進捗を記録する（例：先方に見積送付済み）"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteText.trim()) {
                    onAddNote(noteText.trim());
                    setNoteText("");
                  }
                }}
              />
              <button
                disabled={!noteText.trim()}
                onClick={() => {
                  onAddNote(noteText.trim());
                  setNoteText("");
                }}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                追加
              </button>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {(!project.progressNotes || project.progressNotes.length === 0) && (
                <li className="text-sm text-slate-400">まだ進行状況メモはありません</li>
              )}
              {[...(project.progressNotes || [])].reverse().map((n) => (
                <li key={n.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <div>{n.text}</div>
                  <div className="mt-1 text-xs text-slate-400">{fmtDate(n.date)}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold text-slate-400">案件履歴</div>
            <ol className="space-y-3 border-l border-slate-200 pl-4">
              {project.history.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-indigo-400" />
                  <div className="text-slate-700">{h.label}</div>
                  {h.toMonth && (
                    <div className="text-xs text-slate-400">変更後：{monthLabel(h.toMonth)}</div>
                  )}
                  <div className="text-xs text-slate-400">{fmtDate(h.date)}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 受注率分析ページ                                                     */
/* ------------------------------------------------------------------ */

function AnalysisPage({ projects }) {
  const [category, setCategory] = useState("全体");
  const [confidence, setConfidence] = useState("すべて");
  const [assignee, setAssignee] = useState("全員");

  const filtered = projects.filter(
    (p) =>
      (category === "全体" || p.category === category) &&
      (confidence === "すべて" || p.confidence === Number(confidence)) &&
      (assignee === "全員" || p.assignee === assignee)
  );
  const overall = computeCounts(filtered);

  const byConfidence = [1, 2, 3].map((n) => {
    const list = filtered.filter((p) => p.confidence === n);
    const c = computeCounts(list);
    return { conf: n, ...c };
  });

  const byAssignee = ASSIGNEES.map((a) => {
    const list = projects.filter(
      (p) =>
        p.assignee === a &&
        (category === "全体" || p.category === category) &&
        (confidence === "すべて" || p.confidence === Number(confidence))
    );
    const c = computeCounts(list);
    return { assignee: a, ...c };
  });

  const byCategory = CATEGORIES.map((cat) => {
    const list = projects.filter((p) => p.category === cat);
    const c = computeCounts(list);
    return {
      category: cat,
      案件数: c.total,
      受注率: c.rate ?? 0,
      見込み金額: c.estimatedTotal,
      確定金額: c.confirmedTotal,
    };
  });

  const months = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];
  const monthlyRate = months.map((m) => {
    const list = projects.filter((p) => p.scheduledMonth === m);
    const c = computeCounts(list);
    return { month: monthLabel(m).replace("2026年", ""), 受注率: c.rate ?? 0 };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option>全体</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          value={confidence}
          onChange={(e) => setConfidence(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option>すべて</option>
          <option value="1">★☆☆</option>
          <option value="2">★★☆</option>
          <option value="3">★★★</option>
        </select>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option>全員</option>
          {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="総案件数" value={overall.total} />
        <KpiCard label="受注" value={overall.won} accent="text-emerald-600" />
        <KpiCard label="ロスト" value={overall.lost} accent="text-rose-600" />
        <KpiCard label="受注率" value={overall.rate ?? "—"} suffix={overall.rate !== null ? "%" : ""} accent="text-indigo-600" />
        <KpiCard label="見込み金額" value={formatManYen(overall.estimatedTotal)} accent="text-amber-600" />
        <KpiCard label="確定金額" value={formatManYen(overall.confirmedTotal)} accent="text-emerald-600" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-800">肌感別受注率</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="py-2 font-medium">肌感</th>
              <th className="py-2 font-medium">案件数</th>
              <th className="py-2 font-medium">受注</th>
              <th className="py-2 font-medium">ロスト</th>
              <th className="py-2 font-medium">受注率</th>
            </tr>
          </thead>
          <tbody>
            {byConfidence.map((r) => (
              <tr key={r.conf} className="border-t border-slate-50">
                <td className="py-2"><ConfidenceStars value={r.conf} /></td>
                <td className="py-2 tabular-nums">{r.total}</td>
                <td className="py-2 tabular-nums text-emerald-600">{r.won}</td>
                <td className="py-2 tabular-nums text-rose-600">{r.lost}</td>
                <td className="py-2 tabular-nums font-medium">{r.rate ?? "—"}{r.rate !== null ? "%" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-800">担当者別実績</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="py-2 font-medium">担当者</th>
              <th className="py-2 font-medium">案件数</th>
              <th className="py-2 font-medium">受注</th>
              <th className="py-2 font-medium">ロスト</th>
              <th className="py-2 font-medium">受注率</th>
            </tr>
          </thead>
          <tbody>
            {byAssignee.map((r) => (
              <tr key={r.assignee} className="border-t border-slate-50">
                <td className="py-2 font-medium text-slate-700">{r.assignee}</td>
                <td className="py-2 tabular-nums">{r.total}</td>
                <td className="py-2 tabular-nums text-emerald-600">{r.won}</td>
                <td className="py-2 tabular-nums text-rose-600">{r.lost}</td>
                <td className="py-2 tabular-nums font-medium">{r.rate ?? "—"}{r.rate !== null ? "%" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-800">カテゴリー別 見込み・確定金額</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="py-2 font-medium">カテゴリー</th>
              <th className="py-2 font-medium">案件数</th>
              <th className="py-2 font-medium">受注率</th>
              <th className="py-2 font-medium">見込み金額</th>
              <th className="py-2 font-medium">確定金額</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((r) => (
              <tr key={r.category} className="border-t border-slate-50">
                <td className="py-2"><CategoryPill category={r.category} /></td>
                <td className="py-2 tabular-nums">{r.案件数}</td>
                <td className="py-2 tabular-nums font-medium">{r.受注率}%</td>
                <td className="py-2 tabular-nums text-amber-600">{formatManYen(r.見込み金額)}</td>
                <td className="py-2 tabular-nums text-emerald-600">{formatManYen(r.確定金額)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="mb-3 text-sm font-semibold text-slate-800">カテゴリー別案件数</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="案件数" fill="#6366F1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="mb-3 text-sm font-semibold text-slate-800">カテゴリー別受注率</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip />
              <Bar dataKey="受注率" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-800">月別受注率</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthlyRate}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip />
            <Line type="monotone" dataKey="受注率" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 年別売上比率ページ                                                    */
/* ------------------------------------------------------------------ */

function YoyBadge({ yoy }) {
  if (yoy === null || yoy === undefined) return <span className="text-slate-400">—</span>;
  const up = yoy >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {up ? "+" : ""}{yoy}%
    </span>
  );
}

function YearlyRevenuePage({ projects }) {
  const years = Array.from(new Set(projects.map((p) => yearOf(p.scheduledMonth)))).sort();

  const rows = years.map((y, i) => {
    const list = projects.filter((p) => yearOf(p.scheduledMonth) === y);
    const c = computeCounts(list);
    const prevYear = years[i - 1];
    const prevRevenue = prevYear
      ? computeCounts(projects.filter((p) => yearOf(p.scheduledMonth) === prevYear)).confirmedTotal
      : null;
    const yoy =
      prevRevenue && prevRevenue > 0
        ? Math.round(((c.confirmedTotal - prevRevenue) / prevRevenue) * 1000) / 10
        : null;
    return { year: y, ...c, yoy };
  });

  const chartData = rows.map((r) => ({ 年: `${r.year}年`, 確定金額: Math.round(r.confirmedTotal / 10000) }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.year} className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="text-xs font-medium text-slate-400">{r.year}年 確定金額</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
              {formatManYen(r.confirmedTotal)}
            </div>
            <div className="mt-1 text-xs">
              前年比：<YoyBadge yoy={r.yoy} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-800">年別 確定金額（万円）</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="年" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `${v.toLocaleString("ja-JP")}万円`} />
            <Bar dataKey="確定金額" fill="#6366F1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-800">年別サマリー</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="py-2 font-medium">年</th>
              <th className="py-2 font-medium">案件数</th>
              <th className="py-2 font-medium">受注</th>
              <th className="py-2 font-medium">ロスト</th>
              <th className="py-2 font-medium">受注率</th>
              <th className="py-2 font-medium">確定金額</th>
              <th className="py-2 font-medium">前年比</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-t border-slate-50">
                <td className="py-2 font-medium text-slate-800">{r.year}年</td>
                <td className="py-2 tabular-nums">{r.total}</td>
                <td className="py-2 tabular-nums text-emerald-600">{r.won}</td>
                <td className="py-2 tabular-nums text-rose-600">{r.lost}</td>
                <td className="py-2 tabular-nums font-medium">{r.rate ?? "—"}{r.rate !== null ? "%" : ""}</td>
                <td className="py-2 tabular-nums text-emerald-600">{formatManYen(r.confirmedTotal)}</td>
                <td className="py-2"><YoyBadge yoy={r.yoy} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 会社一覧ページ                                                       */
/* ------------------------------------------------------------------ */

function CompanyListPage({ projects, onOpenDetail }) {
  const companies = useMemo(
    () => Array.from(new Set(projects.map((p) => p.clientName))).sort((a, b) => a.localeCompare(b, "ja")),
    [projects]
  );
  const [selected, setSelected] = useState(null);
  const [listOpen, setListOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [kanaFilter, setKanaFilter] = useState("全て");

  const q = search.trim().toLowerCase();
  const visibleCompanies = companies.filter((name) => {
    if (kanaFilter !== "全て" && companyKanaRow(name) !== kanaFilter) return false;
    if (!q) return true;
    if (name.toLowerCase().includes(q)) return true;
    // 案件名でも検索できるようにする
    return projects.some((p) => p.clientName === name && p.name.toLowerCase().includes(q));
  });

  function selectCompany(name) {
    setSelected(name);
    setListOpen(false);
  }

  const companyProjects = projects.filter((p) => p.clientName === selected);
  const overall = computeCounts(companyProjects);

  const monthsSet = Array.from(new Set(companyProjects.map((p) => p.scheduledMonth))).sort();
  const monthlyRows = monthsSet.map((m) => {
    const list = companyProjects.filter((p) => p.scheduledMonth === m);
    return { month: m, ...computeCounts(list) };
  });

  const years = Array.from(new Set(companyProjects.map((p) => yearOf(p.scheduledMonth)))).sort();
  const yearlyRows = years.map((y, i) => {
    const list = companyProjects.filter((p) => yearOf(p.scheduledMonth) === y);
    const c = computeCounts(list);
    const prevYear = years[i - 1];
    const prevRevenue = prevYear
      ? computeCounts(companyProjects.filter((p) => yearOf(p.scheduledMonth) === prevYear)).confirmedTotal
      : null;
    const yoy =
      prevRevenue && prevRevenue > 0
        ? Math.round(((c.confirmedTotal - prevRevenue) / prevRevenue) * 1000) / 10
        : null;
    return { year: y, ...c, yoy };
  });

  const sortedProjects = [...companyProjects].sort((a, b) => (a.scheduledMonth < b.scheduledMonth ? 1 : -1));

  return (
    <div className="flex flex-col gap-4">
      {listOpen && (
        <div className="rounded-2xl border border-slate-100 bg-white p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="会社名・案件名で検索"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-sm focus:border-indigo-300 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {["全て", "あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"].map((row) => (
              <button
                key={row}
                onClick={() => setKanaFilter(row)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  kanaFilter === row
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {row}
              </button>
            ))}
          </div>
          <div className="mt-2 grid max-h-[50vh] grid-cols-1 gap-0.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {visibleCompanies.map((name) => (
              <button
                key={name}
                onClick={() => selectCompany(name)}
                className="truncate rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                {name}
              </button>
            ))}
            {visibleCompanies.length === 0 && (
              <div className="col-span-full px-3 py-2 text-sm text-slate-400">該当する会社がありません</div>
            )}
          </div>
        </div>
      )}

      {!listOpen && selected && (
        <>
          <button
            onClick={() => setListOpen(true)}
            className="flex w-fit items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            <ChevronLeft size={16} />
            会社一覧に戻る
          </button>

          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo-500" />
            <div className="text-lg font-semibold text-slate-900">{selected}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="案件数" value={overall.total} />
            <KpiCard label="受注率" value={overall.rate ?? "—"} suffix={overall.rate !== null ? "%" : ""} accent="text-indigo-600" />
            <KpiCard label="見込み金額" value={formatManYen(overall.estimatedTotal)} accent="text-amber-600" />
            <KpiCard label="確定金額(累計)" value={formatManYen(overall.confirmedTotal)} accent="text-emerald-600" />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="mb-3 text-sm font-semibold text-slate-800">年別売上・昨年比</div>
            {yearlyRows.length === 0 ? (
              <div className="text-sm text-slate-400">データがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-2 font-medium">年</th>
                    <th className="py-2 font-medium">受注率</th>
                    <th className="py-2 font-medium">確定金額</th>
                    <th className="py-2 font-medium">前年比</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyRows.map((r) => (
                    <tr key={r.year} className="border-t border-slate-50">
                      <td className="py-2 font-medium text-slate-800">{r.year}年</td>
                      <td className="py-2 tabular-nums">{r.rate ?? "—"}{r.rate !== null ? "%" : ""}</td>
                      <td className="py-2 tabular-nums text-emerald-600">{formatManYen(r.confirmedTotal)}</td>
                      <td className="py-2"><YoyBadge yoy={r.yoy} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="mb-3 text-sm font-semibold text-slate-800">月別受注率</div>
            {monthlyRows.length === 0 ? (
              <div className="text-sm text-slate-400">データがありません</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-2 font-medium">月</th>
                    <th className="py-2 font-medium">案件数</th>
                    <th className="py-2 font-medium">受注</th>
                    <th className="py-2 font-medium">ロスト</th>
                    <th className="py-2 font-medium">受注率</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((r) => (
                    <tr key={r.month} className="border-t border-slate-50">
                      <td className="py-2 font-medium text-slate-800">{monthLabel(r.month)}</td>
                      <td className="py-2 tabular-nums">{r.total}</td>
                      <td className="py-2 tabular-nums text-emerald-600">{r.won}</td>
                      <td className="py-2 tabular-nums text-rose-600">{r.lost}</td>
                      <td className="py-2 tabular-nums font-medium">{r.rate ?? "—"}{r.rate !== null ? "%" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="mb-3 text-sm font-semibold text-slate-800">案件一覧</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-2 font-medium">案件</th>
                    <th className="py-2 font-medium">内容</th>
                    <th className="py-2 font-medium">月</th>
                    <th className="py-2 font-medium">状態</th>
                    <th className="py-2 font-medium">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-t border-slate-50 hover:bg-slate-50/60"
                      onClick={() => onOpenDetail && onOpenDetail(p)}
                    >
                      <td className="max-w-[200px] truncate py-2 font-medium text-slate-800">{p.name}</td>
                      <td className="py-2"><CategoryPill category={p.category} /></td>
                      <td className="py-2 whitespace-nowrap text-slate-500">{monthLabel(p.scheduledMonth)}</td>
                      <td className="py-2"><StatusBadge status={p.status} /></td>
                      <td className="py-2 tabular-nums text-slate-600">
                        {p.status === "won" ? formatManYen(p.confirmedAmount) : formatManYen(p.estimatedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 月別状況ページ                                                       */
/* ------------------------------------------------------------------ */

function MonthlyPage({ projects }) {
  const months = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];
  const rows = months.map((m) => {
    const list = projects.filter((p) => p.scheduledMonth === m);
    const c = computeCounts(list);
    const postponedCount = projects.reduce(
      (acc, p) =>
        acc + p.history.filter((h) => h.type === "postponed" && h.fromMonth === m).length,
      0
    );
    return { month: m, ...c, postponedCount };
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="px-5 py-3 font-medium">月</th>
            <th className="px-3 py-3 font-medium">案件数</th>
            <th className="px-3 py-3 font-medium">受注</th>
            <th className="px-3 py-3 font-medium">ロスト</th>
            <th className="px-3 py-3 font-medium">時期変更</th>
            <th className="px-3 py-3 font-medium">受注率</th>
            <th className="px-3 py-3 font-medium">見込み金額</th>
            <th className="px-3 py-3 font-medium">確定金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className="border-t border-slate-50">
              <td className="px-5 py-3 font-medium text-slate-800">{monthLabel(r.month)}</td>
              <td className="px-3 py-3 tabular-nums">{r.total}</td>
              <td className="px-3 py-3 tabular-nums text-emerald-600">{r.won}</td>
              <td className="px-3 py-3 tabular-nums text-rose-600">{r.lost}</td>
              <td className="px-3 py-3 tabular-nums text-amber-600">{r.postponedCount}</td>
              <td className="px-3 py-3 tabular-nums font-medium">{r.rate ?? "—"}{r.rate !== null ? "%" : ""}</td>
              <td className="px-3 py-3 tabular-nums text-amber-600">{formatManYen(r.estimatedTotal)}</td>
              <td className="px-3 py-3 tabular-nums text-emerald-600">{formatManYen(r.confirmedTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* メインアプリ                                                        */
/* ------------------------------------------------------------------ */

export default function App() {
  const [projects, setProjects] = useState(() => [...seedProjects(), ...seedArchivedProjects()]);
  const [view, setView] = useState("dashboard");
  const [activeCategory, setActiveCategory] = useState("全体");
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [wonTarget, setWonTarget] = useState(null);
  const [lostTarget, setLostTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const detail = projects.find((p) => p.id === detailId) || null;
  const setDetail = (p) => setDetailId(p ? p.id : null);

  function pushToast(message) {
    const id = uid();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }

  const boardProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  const filtered = useMemo(() => {
    return boardProjects.filter((p) => {
      if (activeCategory !== "全体" && p.category !== activeCategory) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.clientName.toLowerCase().includes(q) &&
          !p.memo.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [boardProjects, activeCategory, search]);

  const kpi = computeCounts(filtered);
  const months = useMemo(() => {
    const set = new Set(filtered.map((p) => p.scheduledMonth));
    return Array.from(set).sort();
  }, [filtered]);

  const thisMonthKey = "2026-09";
  const thisMonthList = filtered.filter((p) => p.scheduledMonth === thisMonthKey);
  const thisMonthPostponed = boardProjects.reduce(
    (acc, p) =>
      acc + p.history.filter((h) => h.type === "postponed" && h.fromMonth === thisMonthKey).length,
    0
  );
  const thisMonthCounts = computeCounts(thisMonthList);

  const spotlight = filtered.filter((p) => p.confidence === 3 && p.status === "active").slice(0, 3);

  function updateProject(id, patch) {
    setProjects((list) =>
      list.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: todayIso() } : p))
    );
  }

  function handleAction(key, project) {
    if (key === "won") {
      setWonTarget(project);
    } else if (key === "lost") {
      setLostTarget(project);
    } else if (key === "postpone") {
      setPostponeTarget(project);
    } else if (key === "edit") {
      setEditing(project);
    } else if (key === "delete") {
      setDeleteTarget(project);
    }
    setDetail(null);
  }

  function confirmWon(amount) {
    updateProject(wonTarget.id, {
      status: "won",
      confirmedAmount: amount,
      history: [
        ...wonTarget.history,
        { id: uid(), date: todayIso(), type: "won", label: "受注", previousStatus: wonTarget.status },
      ],
    });
    pushToast(`「${wonTarget.name}」を受注にしました（${formatYen(amount)}）`);
    setWonTarget(null);
  }

  function confirmLost() {
    updateProject(lostTarget.id, {
      status: "lost",
      history: [
        ...lostTarget.history,
        { id: uid(), date: todayIso(), type: "lost", label: "ロスト", previousStatus: lostTarget.status },
      ],
    });
    pushToast(`「${lostTarget.name}」をロストにしました`);
    setLostTarget(null);
  }

  function confirmPostpone(targetMonth) {
    const fromMonth = postponeTarget.scheduledMonth;
    updateProject(postponeTarget.id, {
      scheduledMonth: targetMonth,
      history: [
        ...postponeTarget.history,
        {
          id: uid(),
          date: todayIso(),
          type: "postponed",
          label: "時期変更",
          fromMonth,
          toMonth: targetMonth,
        },
      ],
    });
    pushToast(`${monthLabel(targetMonth)}に変更しました`);
    setPostponeTarget(null);
  }

  function confirmDelete() {
    setProjects((list) => list.filter((p) => p.id !== deleteTarget.id));
    pushToast("案件を削除しました");
    setDeleteTarget(null);
  }

  function addProgressNote(project, text) {
    updateProject(project.id, {
      progressNotes: [...(project.progressNotes || []), { id: uid(), date: todayIso(), text }],
    });
    pushToast("進行状況メモを追加しました");
  }

  function saveNewProject(form) {
    const now = todayIso();
    setProjects((list) => [
      ...list,
      {
        id: uid(),
        ...form,
        estimatedAmount: Number(form.estimatedAmount) || 0,
        confirmedAmount: null,
        status: "active",
        progressNotes: [],
        archived: false,
        createdAt: now,
        updatedAt: now,
        history: [{ id: uid(), date: now, type: "created", label: "新規登録", scheduledMonth: form.scheduledMonth }],
      },
    ]);
    pushToast("案件を登録しました");
    setShowAdd(false);
  }

  function saveEditProject(form) {
    updateProject(editing.id, { ...form, estimatedAmount: Number(form.estimatedAmount) || 0 });
    pushToast("案件を更新しました");
    setEditing(null);
  }

  const navItems = [
    { key: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
    { key: "analysis", label: "受注率分析", icon: BarChart3 },
    { key: "monthly", label: "月別状況", icon: CalendarDays },
    { key: "yearly", label: "年別売上", icon: TrendingUp },
    { key: "companies", label: "会社一覧", icon: Building2 },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-100 bg-white p-4 sm:block">
        <div className="mb-6 px-2 text-lg font-semibold tracking-tight text-slate-900">案件管理</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                view === item.key
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
          <div className="text-sm font-semibold text-slate-500 sm:hidden">案件管理</div>
          <div className="relative hidden max-w-xs flex-1 sm:block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="案件名・客先・メモで検索"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              案件を追加
            </button>
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Bell size={18} /></button>
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Settings size={18} /></button>
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-center text-sm font-medium leading-8 text-indigo-700">営</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {view === "dashboard" && (
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
              {/* カテゴリータブ */}
              <div className="flex flex-wrap gap-2">
                {["全体", ...CATEGORIES].map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                      activeCategory === c
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* KPI */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <KpiCard label="案件数" value={kpi.total} />
                <KpiCard label="受注数" value={kpi.won} accent="text-emerald-600" />
                <KpiCard label="ロスト数" value={kpi.lost} accent="text-rose-600" />
                <KpiCard label="現在の受注率" value={kpi.rate ?? "—"} suffix={kpi.rate !== null ? "%" : ""} accent="text-indigo-600" />
                <KpiCard label="見込み金額" value={formatManYen(kpi.estimatedTotal)} accent="text-amber-600" />
                <KpiCard label="確定金額" value={formatManYen(kpi.confirmedTotal)} accent="text-emerald-600" />
              </div>

              {/* 今月の状況 + 注目案件 */}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 lg:col-span-2">
                  <div className="mb-3 text-sm font-semibold text-slate-800">今月の状況（{monthLabel(thisMonthKey)}）</div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <div className="text-xs text-slate-400">案件</div>
                      <div className="text-xl font-semibold tabular-nums">{thisMonthCounts.total}件</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">受注</div>
                      <div className="text-xl font-semibold tabular-nums text-emerald-600">{thisMonthCounts.won}件</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">ロスト</div>
                      <div className="text-xl font-semibold tabular-nums text-rose-600">{thisMonthCounts.lost}件</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">時期変更</div>
                      <div className="text-xl font-semibold tabular-nums text-amber-600">{thisMonthPostponed}件</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">見込み金額</div>
                      <div className="text-xl font-semibold tabular-nums text-amber-600">{formatManYen(thisMonthCounts.estimatedTotal)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">確定金額</div>
                      <div className="text-xl font-semibold tabular-nums text-emerald-600">{formatManYen(thisMonthCounts.confirmedTotal)}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <div className="mb-3 text-sm font-semibold text-slate-800">注目案件（肌感★★★）</div>
                  <div className="flex flex-col gap-3">
                    {spotlight.length === 0 && <div className="text-sm text-slate-400">対象の案件はありません</div>}
                    {spotlight.map((p) => (
                      <div key={p.id} className="cursor-pointer rounded-lg border border-amber-100 bg-amber-50/50 p-3" onClick={() => setDetail(p)}>
                        <div className="text-sm font-medium text-slate-800">{p.clientName}</div>
                        <div className="text-xs text-slate-500">{p.name} ・ {p.category}</div>
                        <div className="mt-1 text-xs text-slate-400">受注予定：{monthLabel(p.scheduledMonth)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 月別一覧 */}
              <div className="flex flex-col gap-4">
                {months.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
                    条件に一致する案件がありません。「＋案件を追加」から登録してください。
                  </div>
                )}
                {months.map((m, i) => (
                  <MonthSection
                    key={m}
                    month={m}
                    projects={filtered.filter((p) => p.scheduledMonth === m)}
                    defaultOpen={i < 2}
                    onAction={handleAction}
                    onOpenDetail={setDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {view === "analysis" && (
            <div className="mx-auto max-w-6xl">
              <AnalysisPage projects={boardProjects} />
            </div>
          )}

          {view === "monthly" && (
            <div className="mx-auto max-w-4xl">
              <MonthlyPage projects={boardProjects} />
            </div>
          )}

          {view === "yearly" && (
            <div className="mx-auto max-w-5xl">
              <YearlyRevenuePage projects={projects} />
            </div>
          )}

          {view === "companies" && (
            <div className="mx-auto max-w-6xl">
              <CompanyListPage projects={projects} onOpenDetail={setDetail} />
            </div>
          )}
        </main>
      </div>

      {/* モーダル類 */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="案件を追加">
        <ProjectForm onSubmit={saveNewProject} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="案件を編集">
        {editing && (
          <ProjectForm initial={editing} onSubmit={saveEditProject} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <PostponeDialog
        project={postponeTarget}
        onClose={() => setPostponeTarget(null)}
        onConfirm={confirmPostpone}
      />

      <WonDialog
        project={wonTarget}
        onClose={() => setWonTarget(null)}
        onConfirm={confirmWon}
      />

      <ConfirmDialog
        open={!!lostTarget}
        onClose={() => setLostTarget(null)}
        onConfirm={confirmLost}
        title="この案件をロストにしますか？"
        message={lostTarget ? `「${lostTarget.name}」をロストとして記録します。` : ""}
        tone="danger"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="案件を削除しますか？"
        message={deleteTarget ? `「${deleteTarget.name}」を完全に削除します。この操作は取り消せません。` : ""}
        tone="danger"
      />

      {detail && (
        <ProjectDetail
          project={detail}
          onClose={() => setDetail(null)}
          onAction={handleAction}
          onAddNote={(text) => addProgressNote(detail, text)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
