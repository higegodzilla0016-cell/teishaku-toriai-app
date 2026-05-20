import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calculator, FileText, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import "./styles.css";

const DEFAULT_MATERIALS = [
  // SS400 等辺山形鋼 L：標準寸法ベース
  { id: "ss400_l20203", name: "SS400 L 20x20x3", stockLength: 5500, kerf: 3, kgPerMeter: 0.885 },
  { id: "ss400_l25253", name: "SS400 L 25x25x3", stockLength: 5500, kerf: 3, kgPerMeter: 1.12 },
  { id: "ss400_l30303", name: "SS400 L 30x30x3", stockLength: 5500, kerf: 3, kgPerMeter: 1.36 },
  { id: "ss400_l30305", name: "SS400 L 30x30x5", stockLength: 5500, kerf: 3, kgPerMeter: 2.16 },
  { id: "ss400_l40403", name: "SS400 L 40x40x3", stockLength: 5500, kerf: 3, kgPerMeter: 1.83 },
  { id: "ss400_l40405", name: "SS400 L 40x40x5", stockLength: 5500, kerf: 3, kgPerMeter: 2.95 },
  { id: "ss400_l50504", name: "SS400 L 50x50x4", stockLength: 5500, kerf: 3, kgPerMeter: 3.06 },
  { id: "ss400_l50506", name: "SS400 L 50x50x6", stockLength: 5500, kerf: 3, kgPerMeter: 4.43 },
  { id: "ss400_l50508", name: "SS400 L 50x50x8", stockLength: 5500, kerf: 3, kgPerMeter: 5.78 },
  { id: "ss400_l65656", name: "SS400 L 65x65x6", stockLength: 5500, kerf: 3, kgPerMeter: 5.91 },
  { id: "ss400_l65658", name: "SS400 L 65x65x8", stockLength: 5500, kerf: 3, kgPerMeter: 7.66 },
  { id: "ss400_l75756", name: "SS400 L 75x75x6", stockLength: 5500, kerf: 3, kgPerMeter: 6.85 },
  { id: "ss400_l75759", name: "SS400 L 75x75x9", stockLength: 5500, kerf: 3, kgPerMeter: 9.96 },
  { id: "ss400_l90907", name: "SS400 L 90x90x7", stockLength: 5500, kerf: 3, kgPerMeter: 9.59 },
  { id: "ss400_l909010", name: "SS400 L 90x90x10", stockLength: 5500, kerf: 3, kgPerMeter: 13.3 },
  { id: "ss400_l1001007", name: "SS400 L 100x100x7", stockLength: 5500, kerf: 3, kgPerMeter: 10.7 },
  { id: "ss400_l10010010", name: "SS400 L 100x100x10", stockLength: 5500, kerf: 3, kgPerMeter: 14.9 },

  // SS400 平鋼 FB：一般流通の標準寸法ベース
  { id: "ss400_fb3245", name: "SS400 FB 32x4.5", stockLength: 5500, kerf: 3, kgPerMeter: 1.13 },
  { id: "ss400_fb3845", name: "SS400 FB 38x4.5", stockLength: 5500, kerf: 3, kgPerMeter: 1.34 },
  { id: "ss400_fb5045", name: "SS400 FB 50x4.5", stockLength: 5500, kerf: 3, kgPerMeter: 1.77 },
  { id: "ss400_fb506", name: "SS400 FB 50x6", stockLength: 5500, kerf: 3, kgPerMeter: 2.36 },
  { id: "ss400_fb656", name: "SS400 FB 65x6", stockLength: 5500, kerf: 3, kgPerMeter: 3.06 },
  { id: "ss400_fb756", name: "SS400 FB 75x6", stockLength: 5500, kerf: 3, kgPerMeter: 3.53 },
  { id: "ss400_fb1006", name: "SS400 FB 100x6", stockLength: 5500, kerf: 3, kgPerMeter: 4.71 },
  { id: "ss400_fb1009", name: "SS400 FB 100x9", stockLength: 5500, kerf: 3, kgPerMeter: 7.07 },

  // 6m材として使う場合
  { id: "ss400_l40405_6m", name: "SS400 L 40x40x5 6m", stockLength: 6000, kerf: 3, kgPerMeter: 2.95 },
  { id: "ss400_l50506_6m", name: "SS400 L 50x50x6 6m", stockLength: 6000, kerf: 3, kgPerMeter: 4.43 },
  { id: "ss400_fb506_6m", name: "SS400 FB 50x6 6m", stockLength: 6000, kerf: 3, kgPerMeter: 2.36 },
];


const MATERIAL_PRESET_VERSION = "ss400-standard-v1";


const SAMPLE_PARTS = `870x4
772x6
500x6
350x4
450x4
260x4`;

const SAMPLE_PLATE_PARTS = `1664x352x3
1064x552x3
1064x584x2
800x400x4
500x300x6`;

const SAMPLE_BATCH = [
  {
    id: "b1",
    materialName: "40x40x4L",
    stockLength: 5500,
    kerf: 3,
    partsText: SAMPLE_PARTS,
  },
  {
    id: "b2",
    materialName: "30x30x3L",
    stockLength: 5500,
    kerf: 3,
    partsText: `450x4
2000x2
1994x2
367x4
694x2
440x6
610x4
324
900x4
1194x10
219x2
192x2
563x4
404x4`,
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadLocal(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/* ==============================
   定尺材
============================== */

function parseParts(text) {
  const rows = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const grouped = [];
  const parts = [];

  rows.forEach((line, index) => {
    const normalized = line
      .replace(/[×＊*]/g, "x")
      .replace(/[Ｘｘ]/g, "x")
      .replace(/　/g, " ")
      .replace(/ｍｍ|mm/gi, "")
      .replace(/本|個/g, "")
      .trim();

    const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*(\d+))?$/i);
    if (!match) return;

    const length = Number(match[1]);
    const qty = match[2] ? Number(match[2]) : 1;
    grouped.push({ row: index + 1, length, qty });

    for (let i = 0; i < qty; i++) {
      parts.push({ id: `${index + 1}-${i + 1}-${uid()}`, row: index + 1, length });
    }
  });

  return { parts, grouped };
}

function optimize(parts, stockLength, kerf, scraps = []) {
  const sorted = [...parts].sort((a, b) => b.length - a.length);

  const bars = scraps
    .filter((s) => Number(s.length) > 0)
    .map((s, index) => ({
      id: `scrap-${index + 1}`,
      source: "端材",
      stockLength: Number(s.length),
      label: s.label || `端材${index + 1}`,
      parts: [],
      used: 0,
    }));

  const tooLong = [];

  for (const part of sorted) {
    const maxStock = Math.max(Number(stockLength) || 0, ...bars.map((b) => b.stockLength));
    if (part.length > maxStock) {
      tooLong.push(part);
      continue;
    }

    let bestIndex = -1;
    let bestRemaining = Infinity;

    bars.forEach((bar, index) => {
      const add = bar.parts.length === 0 ? part.length : part.length + Number(kerf || 0);
      const remaining = bar.stockLength - bar.used - add;
      if (remaining >= 0 && remaining < bestRemaining) {
        bestRemaining = remaining;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      if (part.length > stockLength) {
        tooLong.push(part);
        continue;
      }
      bars.push({
        id: `stock-${uid()}`,
        source: "定尺",
        stockLength: Number(stockLength),
        label: `定尺${bars.filter((b) => b.source === "定尺").length + 1}`,
        parts: [part],
        used: part.length,
      });
    } else {
      const bar = bars[bestIndex];
      const add = bar.parts.length === 0 ? part.length : part.length + Number(kerf || 0);
      bar.parts.push(part);
      bar.used += add;
    }
  }

  return {
    bars: bars
      .filter((bar) => bar.parts.length > 0 || bar.source === "端材")
      .map((bar, index) => ({
        ...bar,
        index: index + 1,
        scrap: Math.max(0, bar.stockLength - bar.used),
        cutCount: Math.max(0, bar.parts.length - 1),
      })),
    tooLong,
  };
}

function Summary({ result, parts }) {
  const totalPartLength = parts.reduce((sum, p) => sum + p.length, 0);
  const totalStockLength = result.bars.reduce((sum, b) => sum + b.stockLength, 0);
  const totalScrap = result.bars.reduce((sum, b) => sum + b.scrap, 0);
  const stockCount = result.bars.filter((b) => b.source === "定尺").length;
  const scrapCount = result.bars.filter((b) => b.source === "端材" && b.parts.length > 0).length;
  const yieldRate = totalStockLength ? (totalPartLength / totalStockLength) * 100 : 0;

  return (
    <div className="summary">
      <div><span>新品定尺</span><strong>{stockCount}本</strong></div>
      <div><span>端材使用</span><strong>{scrapCount}本</strong></div>
      <div><span>部材数</span><strong>{parts.length}個</strong></div>
      <div><span>端材合計</span><strong>{Math.round(totalScrap)}mm</strong></div>
      <div><span>歩留まり</span><strong>{yieldRate.toFixed(1)}%</strong></div>
    </div>
  );
}

function Bars({ result, kerf, compact = false }) {
  return (
    <div className="bars">
      {result.bars.map((bar) => (
        <div className="bar-card" key={bar.id}>
          <div className="bar-head">
            <strong>{bar.source === "端材" ? bar.label : `定尺 ${bar.index}`}</strong>
            <span>{bar.source}</span>
          </div>
          <p className="bar-meta">使用 {Math.round(bar.used)}mm / 端材 {Math.round(bar.scrap)}mm</p>

          {!compact && (
            <div className="bar-visual">
              {bar.parts.map((part, i) => {
                const width = Math.max(6, (part.length / Math.max(1, bar.stockLength)) * 100);
                return (
                  <div className="piece" style={{ width: `${width}%` }} key={`${part.id}-${i}`}>
                    {part.length}
                  </div>
                );
              })}
              {bar.scrap > 0 && <div className="scrap">端材 {Math.round(bar.scrap)}</div>}
            </div>
          )}

          <p className="cut-line">
            {bar.parts.length ? bar.parts.map((p) => p.length).join(" + ") : "未使用"}
            {bar.cutCount > 0 ? ` + 切断ロス ${bar.cutCount}回×${kerf}mm` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ==============================
   4×8板材 簡易版
============================== */

function parsePlateParts(text) {
  const rows = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parts = [];

  rows.forEach((line, index) => {
    const normalized = line
      .replace(/[×＊*]/g, "x")
      .replace(/[Ｘｘ]/g, "x")
      .replace(/　/g, " ")
      .replace(/ｍｍ|mm/gi, "")
      .replace(/枚|個/g, "")
      .trim();

    const match = normalized.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*x\s*(\d+))?$/i);
    if (!match) return;

    const w = Number(match[1]);
    const h = Number(match[2]);
    const qty = match[3] ? Number(match[3]) : 1;

    for (let i = 0; i < qty; i++) {
      parts.push({
        id: `${index + 1}-${i + 1}-${uid()}`,
        row: index + 1,
        w,
        h,
        area: w * h,
      });
    }
  });

  return parts;
}

function canFit(free, part, allowRotate, kerf) {
  const options = [{ w: part.w, h: part.h, rotated: false }];
  if (allowRotate && part.w !== part.h) {
    options.push({ w: part.h, h: part.w, rotated: true });
  }
  return options.filter((o) => o.w + kerf <= free.w && o.h + kerf <= free.h);
}

function pruneFreeRects(freeRects) {
  const result = [];
  for (let i = 0; i < freeRects.length; i++) {
    const a = freeRects[i];
    if (a.w <= 0 || a.h <= 0) continue;

    let contained = false;
    for (let j = 0; j < freeRects.length; j++) {
      if (i === j) continue;
      const b = freeRects[j];
      if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
        contained = true;
        break;
      }
    }
    if (!contained) result.push(a);
  }
  return result;
}

function placePart(sheet, part, allowRotate, kerf) {
  let best = null;

  sheet.freeRects.forEach((free, freeIndex) => {
    const fits = canFit(free, part, allowRotate, kerf);
    fits.forEach((fit) => {
      const remainingArea = free.w * free.h - fit.w * fit.h;
      const score = remainingArea + Math.min(free.w - fit.w, free.h - fit.h);
      if (!best || score < best.score) {
        best = { free, freeIndex, fit, score };
      }
    });
  });

  if (!best) return false;

  const p = {
    ...part,
    x: best.free.x,
    y: best.free.y,
    drawW: best.fit.w,
    drawH: best.fit.h,
    rotated: best.fit.rotated,
  };

  sheet.placed.push(p);
  sheet.usedArea += part.area;

  const f = best.free;
  const usedW = best.fit.w + kerf;
  const usedH = best.fit.h + kerf;

  const right = { x: f.x + usedW, y: f.y, w: f.w - usedW, h: best.fit.h };
  const bottom = { x: f.x, y: f.y + usedH, w: f.w, h: f.h - usedH };

  sheet.freeRects.splice(best.freeIndex, 1, right, bottom);
  sheet.freeRects = pruneFreeRects(sheet.freeRects);

  return true;
}


function rectIntersects(a, b) {
  return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y);
}

function splitFreeRect(free, used) {
  if (!rectIntersects(free, used)) return [free];

  const result = [];

  // 上
  if (used.y > free.y) {
    result.push({
      x: free.x,
      y: free.y,
      w: free.w,
      h: used.y - free.y,
    });
  }

  // 下
  if (used.y + used.h < free.y + free.h) {
    result.push({
      x: free.x,
      y: used.y + used.h,
      w: free.w,
      h: free.y + free.h - (used.y + used.h),
    });
  }

  // 左
  if (used.x > free.x) {
    result.push({
      x: free.x,
      y: free.y,
      w: used.x - free.x,
      h: free.h,
    });
  }

  // 右
  if (used.x + used.w < free.x + free.w) {
    result.push({
      x: used.x + used.w,
      y: free.y,
      w: free.x + free.w - (used.x + used.w),
      h: free.h,
    });
  }

  return result.filter((r) => r.w > 0 && r.h > 0);
}

function pruneFreeRectsStrong(freeRects) {
  const clean = freeRects.filter((r) => r.w > 0 && r.h > 0);
  const result = [];

  for (let i = 0; i < clean.length; i++) {
    const a = clean[i];
    let contained = false;

    for (let j = 0; j < clean.length; j++) {
      if (i === j) continue;
      const b = clean[j];

      if (
        a.x >= b.x &&
        a.y >= b.y &&
        a.x + a.w <= b.x + b.w &&
        a.y + a.h <= b.y + b.h
      ) {
        contained = true;
        break;
      }
    }

    if (!contained) result.push(a);
  }

  return result;
}

function maxRectsPlacePart(sheet, part, sheetW, sheetH, kerf, allowRotate, strategy = "bestArea") {
  let best = null;

  sheet.freeRects.forEach((free, freeIndex) => {
    const options = [
      { w: part.w, h: part.h, rotated: false },
    ];

    if (allowRotate && part.w !== part.h) {
      options.push({ w: part.h, h: part.w, rotated: true });
    }

    options.forEach((o) => {
      const needW = o.w + kerf;
      const needH = o.h + kerf;

      if (needW <= free.w && needH <= free.h) {
        const leftoverHoriz = free.w - needW;
        const leftoverVert = free.h - needH;
        const shortSide = Math.min(leftoverHoriz, leftoverVert);
        const longSide = Math.max(leftoverHoriz, leftoverVert);
        const areaWaste = free.w * free.h - needW * needH;

        let score;
        if (strategy === "shortSide") {
          score = shortSide * 100000000 + areaWaste;
        } else if (strategy === "longSide") {
          score = longSide * 100000000 + areaWaste;
        } else {
          score = areaWaste * 100000000 + shortSide;
        }

        if (!best || score < best.score) {
          best = { free, freeIndex, o, needW, needH, score };
        }
      }
    });
  });

  if (!best) return false;

  const placed = {
    ...part,
    x: best.free.x,
    y: best.free.y,
    drawW: best.o.w,
    drawH: best.o.h,
    rotated: best.o.rotated,
    bandDirection: "端材詰め",
  };

  sheet.placed.push(placed);
  sheet.usedArea += part.area;

  const usedRect = {
    x: placed.x,
    y: placed.y,
    w: best.needW,
    h: best.needH,
  };

  let newFree = [];
  for (const free of sheet.freeRects) {
    newFree.push(...splitFreeRect(free, usedRect));
  }

  sheet.freeRects = pruneFreeRectsStrong(newFree);
  return true;
}

function optimizeMaxRects(parts, sheetW, sheetH, kerf, allowRotate, sortMode = "area", strategy = "bestArea") {
  const sorted = [...parts].sort((a, b) => {
    if (sortMode === "longSide") {
      const al = Math.max(a.w, a.h);
      const bl = Math.max(b.w, b.h);
      if (bl !== al) return bl - al;
      return b.area - a.area;
    }

    if (sortMode === "shortSide") {
      const as = Math.min(a.w, a.h);
      const bs = Math.min(b.w, b.h);
      if (bs !== as) return bs - as;
      return b.area - a.area;
    }

    if (sortMode === "height") {
      if (b.h !== a.h) return b.h - a.h;
      return b.area - a.area;
    }

    if (sortMode === "width") {
      if (b.w !== a.w) return b.w - a.w;
      return b.area - a.area;
    }

    if (sortMode === "areaAsc") {
      return a.area - b.area;
    }

    return b.area - a.area;
  });

  const sheets = [];
  const tooLarge = [];

  for (const part of sorted) {
    const normal = part.w + kerf <= sheetW && part.h + kerf <= sheetH;
    const rotated = allowRotate && part.h + kerf <= sheetW && part.w + kerf <= sheetH;

    if (!normal && !rotated) {
      tooLarge.push(part);
      continue;
    }

    let placed = false;

    // 重要：新しい母材を作る前に、既存母材すべての空き矩形を確認する
    for (const sheet of sheets) {
      if (maxRectsPlacePart(sheet, part, sheetW, sheetH, kerf, allowRotate, strategy)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      const sheet = {
        id: `sheet-${sheets.length + 1}`,
        index: sheets.length + 1,
        placed: [],
        usedArea: 0,
        freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
        bands: [],
        bandDirection: "端材詰め",
      };

      maxRectsPlacePart(sheet, part, sheetW, sheetH, kerf, allowRotate, strategy);
      sheets.push(sheet);
    }
  }

  return {
    sheets,
    tooLarge,
    fillMethod: "MaxRects端材詰め",
  };
}

function optimizeMaxRectsBest(parts, sheetW, sheetH, kerf, allowRotate) {
  const sortModes = ["area", "longSide", "shortSide", "height", "width", "areaAsc"];
  const strategies = ["bestArea", "shortSide", "longSide"];
  const candidates = [];

  sortModes.forEach((sortMode) => {
    strategies.forEach((strategy) => {
      candidates.push(optimizeMaxRects(parts, sheetW, sheetH, kerf, allowRotate, sortMode, strategy));
    });
  });

  candidates.sort((a, b) => scoreShearResult(a, sheetW, sheetH) - scoreShearResult(b, sheetW, sheetH));
  return candidates[0] || { sheets: [], tooLarge: [] };
}

function optimizePlatePartsOnce(parts, sheetW, sheetH, kerf, allowRotate, sortMode) {
  const sorted = [...parts].sort((a, b) => {
    if (sortMode === "height") {
      const ah = Math.max(a.w, a.h);
      const bh = Math.max(b.w, b.h);
      if (bh !== ah) return bh - ah;
      return b.area - a.area;
    }
    if (sortMode === "width") {
      const aw = Math.min(a.w, a.h);
      const bw = Math.min(b.w, b.h);
      if (bw !== aw) return bw - aw;
      return b.area - a.area;
    }
    if (sortMode === "areaAsc") {
      return a.area - b.area;
    }
    return b.area - a.area;
  });

  const sheets = [];
  const tooLarge = [];

  sorted.forEach((part) => {
    const normal = part.w + kerf <= sheetW && part.h + kerf <= sheetH;
    const rotated = allowRotate && part.h + kerf <= sheetW && part.w + kerf <= sheetH;

    if (!normal && !rotated) {
      tooLarge.push(part);
      return;
    }

    let placed = false;
    for (const sheet of sheets) {
      if (placePart(sheet, part, allowRotate, kerf)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      const sheet = {
        id: `sheet-${sheets.length + 1}`,
        index: sheets.length + 1,
        placed: [],
        usedArea: 0,
        freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
      };
      placePart(sheet, part, allowRotate, kerf);
      sheets.push(sheet);
    }
  });

  return { sheets, tooLarge };
}

function scorePlateResult(result, sheetW, sheetH) {
  const sheetCount = result.sheets.length;
  const totalWaste = result.sheets.reduce((sum, s) => sum + (sheetW * sheetH - s.usedArea), 0);
  const lastWaste = result.sheets.length ? (sheetW * sheetH - result.sheets[result.sheets.length - 1].usedArea) : 0;
  return sheetCount * 1000000000000 + totalWaste * 10 + lastWaste;
}

function optimizePlateParts(parts, sheetW, sheetH, kerf, allowRotate) {
  // Step6：レーザー用もMaxRectsで複数候補を比較し、詰めを改善
  return optimizeMaxRectsBest(parts, sheetW, sheetH, kerf, allowRotate);
}

function orientPartForSheet(part, sheetW, sheetH, allowTurnForFit) {
  const options = [
    { w: part.w, h: part.h, turned: false },
  ];

  if (allowTurnForFit && part.w !== part.h) {
    options.push({ w: part.h, h: part.w, turned: true });
  }

  return options.filter((o) => o.w <= sheetW && o.h <= sheetH);
}

function optimizeShearHorizontal(parts, sheetW, sheetH, kerf, allowTurnForFit) {
  // 横帯：母材の横幅方向に部材を並べ、長手方向へ帯を積む
  const sorted = [...parts].sort((a, b) => {
    const ah = Math.min(a.w, a.h);
    const bh = Math.min(b.w, b.h);
    if (bh !== ah) return bh - ah;
    return b.area - a.area;
  });

  const sheets = [];
  const tooLarge = [];

  function newSheet() {
    const sheet = {
      id: `sheet-${sheets.length + 1}`,
      index: sheets.length + 1,
      usedArea: 0,
      placed: [],
      bands: [],
      bandDirection: "横帯",
    };
    sheets.push(sheet);
    return sheet;
  }

  for (const part of sorted) {
    const options = orientPartForSheet(part, sheetW, sheetH, allowTurnForFit);
    if (!options.length) {
      tooLarge.push(part);
      continue;
    }

    let placed = false;

    for (const sheet of sheets) {
      for (const band of sheet.bands) {
        for (const o of options) {
          if (o.h <= band.h && band.usedX + o.w + (band.parts.length ? kerf : 0) <= sheetW) {
            const x = band.usedX + (band.parts.length ? kerf : 0);
            const y = band.y;
            const p = { ...part, x, y, drawW: o.w, drawH: o.h, rotated: o.turned, bandIndex: band.index, bandDirection: "横帯" };
            band.parts.push(p);
            band.usedX = x + o.w;
            sheet.placed.push(p);
            sheet.usedArea += part.area;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;

      const usedY = sheet.bands.reduce((sum, band) => sum + band.h + kerf, 0);
      for (const o of options) {
        if (usedY + o.h <= sheetH) {
          const band = { index: sheet.bands.length + 1, x: 0, y: usedY, h: o.h, usedX: o.w, parts: [] };
          const p = { ...part, x: 0, y: usedY, drawW: o.w, drawH: o.h, rotated: o.turned, bandIndex: band.index, bandDirection: "横帯" };
          band.parts.push(p);
          sheet.bands.push(band);
          sheet.placed.push(p);
          sheet.usedArea += part.area;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) {
      const sheet = newSheet();
      const o = options[0];
      const band = { index: 1, x: 0, y: 0, h: o.h, usedX: o.w, parts: [] };
      const p = { ...part, x: 0, y: 0, drawW: o.w, drawH: o.h, rotated: o.turned, bandIndex: 1, bandDirection: "横帯" };
      band.parts.push(p);
      sheet.bands.push(band);
      sheet.placed.push(p);
      sheet.usedArea += part.area;
    }
  }

  return { sheets, tooLarge };
}

function optimizeShearVertical(parts, sheetW, sheetH, kerf, allowTurnForFit) {
  // 縦帯：母材の長手方向に部材を並べ、横幅方向へ帯を積む
  const sorted = [...parts].sort((a, b) => {
    const aw = Math.min(a.w, a.h);
    const bw = Math.min(b.w, b.h);
    if (bw !== aw) return bw - aw;
    return b.area - a.area;
  });

  const sheets = [];
  const tooLarge = [];

  function newSheet() {
    const sheet = {
      id: `sheet-${sheets.length + 1}`,
      index: sheets.length + 1,
      usedArea: 0,
      placed: [],
      bands: [],
      bandDirection: "縦帯",
    };
    sheets.push(sheet);
    return sheet;
  }

  for (const part of sorted) {
    const options = orientPartForSheet(part, sheetW, sheetH, allowTurnForFit);
    if (!options.length) {
      tooLarge.push(part);
      continue;
    }

    let placed = false;

    for (const sheet of sheets) {
      for (const band of sheet.bands) {
        for (const o of options) {
          if (o.w <= band.w && band.usedY + o.h + (band.parts.length ? kerf : 0) <= sheetH) {
            const x = band.x;
            const y = band.usedY + (band.parts.length ? kerf : 0);
            const p = { ...part, x, y, drawW: o.w, drawH: o.h, rotated: o.turned, bandIndex: band.index, bandDirection: "縦帯" };
            band.parts.push(p);
            band.usedY = y + o.h;
            sheet.placed.push(p);
            sheet.usedArea += part.area;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;

      const usedX = sheet.bands.reduce((sum, band) => sum + band.w + kerf, 0);
      for (const o of options) {
        if (usedX + o.w <= sheetW) {
          const band = { index: sheet.bands.length + 1, x: usedX, y: 0, w: o.w, usedY: o.h, parts: [] };
          const p = { ...part, x: usedX, y: 0, drawW: o.w, drawH: o.h, rotated: o.turned, bandIndex: band.index, bandDirection: "縦帯" };
          band.parts.push(p);
          sheet.bands.push(band);
          sheet.placed.push(p);
          sheet.usedArea += part.area;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) {
      const sheet = newSheet();
      const o = options[0];
      const band = { index: 1, x: 0, y: 0, w: o.w, usedY: o.h, parts: [] };
      const p = { ...part, x: 0, y: 0, drawW: o.w, drawH: o.h, rotated: o.turned, bandIndex: 1, bandDirection: "縦帯" };
      band.parts.push(p);
      sheet.bands.push(band);
      sheet.placed.push(p);
      sheet.usedArea += part.area;
    }
  }

  return { sheets, tooLarge };
}


function optimizeShearScrapFill(parts, sheetW, sheetH, kerf) {
  // Step6：既存母材の空き矩形を強く見て、小物を端材へ詰める。
  // シャーリングverの端材詰め候補として使う。
  const result = optimizeMaxRectsBest(parts, sheetW, sheetH, kerf, true);

  return {
    ...result,
    sheets: result.sheets.map((sheet, i) => ({
      ...sheet,
      index: i + 1,
      bandDirection: "端材詰め",
      placed: sheet.placed.map((p) => ({
        ...p,
        bandDirection: "端材詰め",
      })),
    })),
    fillMethod: "MaxRects端材詰め",
  };
}

function improveShearByMovingSmallParts(baseResult, parts, sheetW, sheetH, kerf) {
  const fillResult = optimizeShearScrapFill(parts, sheetW, sheetH, kerf);

  const baseScore = scoreShearResult(baseResult, sheetW, sheetH);
  const fillScore = scoreShearResult(fillResult, sheetW, sheetH);

  const fillSheets = fillResult.sheets.length;
  const baseSheets = baseResult.sheets.length;

  // 母材枚数が同じでも、端材詰め配置の方が小物が前母材に寄るケースがあるため、
  // スコアが同等以下なら端材詰めを採用する。
  if (fillSheets <= baseSheets && fillScore <= baseScore + 1000000) {
    return {
      ...fillResult,
      improvedByScrapFill: true,
    };
  }

  return {
    ...baseResult,
    improvedByScrapFill: false,
  };
}

function scoreShearResult(result, sheetW, sheetH) {
  const sheetCount = result.sheets.length;
  const tooLargePenalty = result.tooLarge.length * 100000000000000;
  const totalWaste = result.sheets.reduce((sum, s) => sum + (sheetW * sheetH - s.usedArea), 0);
  return tooLargePenalty + sheetCount * 1000000000000 + totalWaste;
}

function optimizeShearPlateParts(parts, sheetW, sheetH, kerf, grainFixed, bandMode = "auto") {
  // grainFixed は表示上の意味として残す。
  // 実務上 1664×352 のような部材を4x8長手に合わせるため、シャーリングでは向き合わせを許可する。
  const allowTurnForFit = true;

  let baseResult;

  if (bandMode === "horizontal") {
    baseResult = optimizeShearHorizontal(parts, sheetW, sheetH, kerf, allowTurnForFit);
  } else if (bandMode === "vertical") {
    baseResult = optimizeShearVertical(parts, sheetW, sheetH, kerf, allowTurnForFit);
  } else {
    const horizontal = optimizeShearHorizontal(parts, sheetW, sheetH, kerf, allowTurnForFit);
    const vertical = optimizeShearVertical(parts, sheetW, sheetH, kerf, allowTurnForFit);
    baseResult = scoreShearResult(vertical, sheetW, sheetH) < scoreShearResult(horizontal, sheetW, sheetH)
      ? vertical
      : horizontal;
  }

  // 追加改善：500×300などの小物が後ろの母材に逃げた場合、既存母材の端材へ再配置する候補を比較
  const improved = improveShearByMovingSmallParts(baseResult, parts, sheetW, sheetH, kerf);

  return {
    ...improved,
    selectedBandMode: bandMode,
  };
}

function plateWeightKg(width, height, thickness, count = 1) {
  return (width * height * thickness * 7.85 / 1000000) * count;
}


function formatKg(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}kg`;
}

function getSheetPartWeight(sheet, thickness) {
  if (!thickness) return 0;
  return sheet.placed.reduce((sum, p) => sum + plateWeightKg(p.w, p.h, thickness, 1), 0);
}

function getSheetMotherWeight(sheetW, sheetH, thickness) {
  if (!thickness) return 0;
  return plateWeightKg(sheetW, sheetH, thickness, 1);
}

function getShearInstructionLines(sheet) {
  if (sheet.bandDirection === "端材詰め" || !sheet.bands || sheet.bands.length === 0) {
    return sheet.placed.map((p, index) => {
      return `${index + 1}. ${p.w}×${p.h}${p.rotated ? "（向き合わせ）" : ""}：位置 X${Math.round(p.x)} / Y${Math.round(p.y)} 付近から切断`;
    });
  }

  return sheet.bands.map((band) => {
    if (sheet.bandDirection === "縦帯") {
      return `帯${band.index}. 母材左から ${Math.round(band.x)}〜${Math.round(band.x + band.w)}mm を縦帯取り → 帯の中で ${band.parts.map((p) => `${p.w}×${p.h}${p.rotated ? "（向き合わせ）" : ""}`).join(" / ")} を切断`;
    }

    return `帯${band.index}. 母材上から ${Math.round(band.y)}〜${Math.round(band.y + band.h)}mm を横帯取り → 帯の中で ${band.parts.map((p) => `${p.w}×${p.h}${p.rotated ? "（向き合わせ）" : ""}`).join(" / ")} を切断`;
  });
}

function PlateSummary({ result, parts, sheetW, sheetH, thickness }) {
  const totalPartArea = parts.reduce((s, p) => s + p.area, 0);
  const totalSheetArea = result.sheets.length * sheetW * sheetH;
  const yieldRate = totalSheetArea ? (totalPartArea / totalSheetArea) * 100 : 0;
  const partWeight = thickness ? plateWeightKg(1, totalPartArea, thickness, 1) : 0;
  const sheetWeight = thickness ? plateWeightKg(sheetW, sheetH, thickness, result.sheets.length) : 0;

  return (
    <div className="summary">
      <div><span>必要母材</span><strong>{result.sheets.length}枚</strong></div>
      <div><span>部材数</span><strong>{parts.length}個</strong></div>
      <div><span>歩留まり</span><strong>{yieldRate.toFixed(1)}%</strong></div>
      <div><span>部材重量</span><strong>{partWeight ? `${partWeight.toFixed(1)}kg` : "-"}</strong></div>
      <div><span>母材重量</span><strong>{sheetWeight ? `${sheetWeight.toFixed(1)}kg` : "-"}</strong></div>
    </div>
  );
}

function PlateDrawing({ sheet, sheetW, sheetH, mode, thickness }) {
  const scale = Math.min(1, 760 / sheetW);
  const partWeight = getSheetPartWeight(sheet, thickness);
  const motherWeight = getSheetMotherWeight(sheetW, sheetH, thickness);
  const scrapWeight = Math.max(0, motherWeight - partWeight);
  const instructionLines = getShearInstructionLines(sheet);

  return (
    <div className="sheet-card">
      <div className="bar-head">
        <strong>母材 {sheet.index}</strong>
        <span>4×8</span>
      </div>
      <p className="bar-meta">
        使用面積 {(sheet.usedArea / 1000000).toFixed(3)}㎡ / 端材面積 {((sheetW * sheetH - sheet.usedArea) / 1000000).toFixed(3)}㎡
      </p>

      <div className="sheet-weight">
        <span>母材重量：{formatKg(motherWeight)}</span>
        <span>部材重量：{formatKg(partWeight)}</span>
        <span>端材重量目安：{formatKg(scrapWeight)}</span>
      </div>

      <div
        className="sheet-visual screen-sheet"
        style={{
          width: "100%",
          maxWidth: "760px",
          aspectRatio: `${sheetW} / ${sheetH}`,
        }}
      >
        <div className="dim dim-top">{sheetW}mm</div>
        <div className="dim dim-side">{sheetH}mm</div>

        {sheet.placed.map((p) => (
          <div
            key={p.id}
            className="plate-piece"
            style={{
              left: `${(p.x / sheetW) * 100}%`,
              top: `${(p.y / sheetH) * 100}%`,
              width: `${(p.drawW / sheetW) * 100}%`,
              height: `${(p.drawH / sheetH) * 100}%`,
            }}
          >
            <b>{p.row}</b>
            <span>{p.w}×{p.h}</span>
            {p.rotated && <small>向き合わせ</small>}
          </div>
        ))}
      </div>

      <div className="print-sheet print-sheet-landscape">
        <div className="print-dim-top">{sheetH}mm</div>
        <div className="print-dim-side">{sheetW}mm</div>
        {sheet.placed.map((p) => {
          const printW = 260;
          const printH = 130;
          const left = (p.y / sheetH) * printW;
          const top = ((sheetW - p.x - p.drawW) / sheetW) * printH;
          const width = (p.drawH / sheetH) * printW;
          const height = (p.drawW / sheetW) * printH;

          return (
            <div
              key={`print-${p.id}`}
              className="print-plate-piece"
              style={{
                left: `${left}mm`,
                top: `${top}mm`,
                width: `${width}mm`,
                height: `${height}mm`,
              }}
            >
              <b>{p.row}</b>
              <span>{p.w}×{p.h}</span>
              {p.rotated && <small>向き合わせ</small>}
            </div>
          );
        })}
      </div>

      <p className="cut-line">
        {sheet.placed.map((p) => `${p.row}:${p.w}×${p.h}${p.rotated ? "(向き合わせ)" : ""}`).join(" / ")}
      </p>

      {mode === "shear" && (
        <div className="shear-steps">
          <strong>シャーリング順（実機向け・簡易）</strong>
          <ol>
            {instructionLines.map((line, index) => (
              <li key={`inst-${sheet.index}-${index}`}>{line}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}


/* ==============================
   画面
============================== */


function getBarKgPerMeterFromName(name) {
  const normalized = String(name || "")
    .replace(/[×＊*]/g, "x")
    .replace(/[Ｘｘ]/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const exact = {
    "ss400 l 20x20x3": 0.885,
    "ss400 l 25x25x3": 1.12,
    "ss400 l 30x30x3": 1.36,
    "ss400 l 30x30x5": 2.16,
    "ss400 l 40x40x3": 1.83,
    "ss400 l 40x40x5": 2.95,
    "ss400 l 50x50x4": 3.06,
    "ss400 l 50x50x6": 4.43,
    "ss400 l 50x50x8": 5.78,
    "ss400 l 65x65x6": 5.91,
    "ss400 l 65x65x8": 7.66,
    "ss400 l 75x75x6": 6.85,
    "ss400 l 75x75x9": 9.96,
    "ss400 l 90x90x7": 9.59,
    "ss400 l 90x90x10": 13.3,
    "ss400 l 100x100x7": 10.7,
    "ss400 l 100x100x10": 14.9,
    "ss400 fb 32x4.5": 1.13,
    "ss400 fb 38x4.5": 1.34,
    "ss400 fb 50x4.5": 1.77,
    "ss400 fb 50x6": 2.36,
    "ss400 fb 65x6": 3.06,
    "ss400 fb 75x6": 3.53,
    "ss400 fb 100x6": 4.71,
    "ss400 fb 100x9": 7.07,
  };

  const without6m = normalized.replace(/\s*6m$/, "");
  if (exact[without6m]) return exact[without6m];

  const angle = normalized.match(/(?:ss400\s*)?l?\s*(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  if (angle) {
    const a = Number(angle[1]);
    const b = Number(angle[2]);
    const t = Number(angle[3]);
    const area = a * t + b * t - t * t;
    return area * 0.00785;
  }

  const fb = normalized.match(/fb\s*(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  if (fb) {
    const w = Number(fb[1]);
    const t = Number(fb[2]);
    return w * t * 0.00785;
  }

  return 0;
}

function getBarWeight(lengthMm, kgPerMeter) {
  if (!kgPerMeter) return 0;
  return (lengthMm / 1000) * kgPerMeter;
}

function formatBarKg(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toFixed(2)}kg`;
}

function getBarCutInstruction(bar, kerf) {
  const cuts = bar.parts.map((p, i) => `${i + 1}. ${p.length}mm`).join(" → ");
  const loss = bar.cutCount > 0 ? ` / 切断ロス ${bar.cutCount}回×${kerf}mm` : "";
  return `${cuts}${loss} / 端材 ${Math.round(bar.scrap)}mm`;
}

function SingleCalc({ materials, setMaterials }) {
  const [materialId, setMaterialId] = useState(materials[0]?.id || "m1");
  const current = materials.find((m) => m.id === materialId) || materials[0];

  const [barProjectName, setBarProjectName] = useState("");
  const [savedBarProjects, setSavedBarProjects] = useState(loadLocal("barProjects", []));
  const [materialName, setMaterialName] = useState(current?.name || "40x40x4L");
  const [stockLength, setStockLength] = useState(current?.stockLength || 5500);
  const [kerf, setKerf] = useState(current?.kerf || 3);
  const [kgPerMeter, setKgPerMeter] = useState((current?.kgPerMeter || getBarKgPerMeterFromName(current?.name || "SS400 L 40x40x5")).toFixed(3));
  const [partsText, setPartsText] = useState("");
  const [scrapsText, setScrapsText] = useState("");

  // 入力中の寸法は自動保存しない。URLを開いた時は空欄で開始。
  // 案件保存したデータのみ、保存案件から呼び出せる。

  useEffect(() => {
    localStorage.setItem("barProjects", JSON.stringify(savedBarProjects));
  }, [savedBarProjects]);

  useEffect(() => {
    if (current) {
      setMaterialName(current.name);
      setStockLength(current.stockLength);
      setKerf(current.kerf);
      setKgPerMeter((current.kgPerMeter || getBarKgPerMeterFromName(current.name)).toFixed(3));
    }
  }, [materialId]);

  const { parts } = useMemo(() => parseParts(partsText), [partsText]);
  const scraps = useMemo(() => scrapsText.split(/\n+/).map((s, i) => ({
    label: `端材${i + 1}`,
    length: Number(s.trim())
  })).filter((s) => s.length > 0), [scrapsText]);

  const result = useMemo(() => optimize(parts, Number(stockLength), Number(kerf), scraps), [parts, stockLength, kerf, scraps]);
  const compare5500 = useMemo(() => optimize(parts, 5500, Number(kerf), scraps), [parts, kerf, scraps]);
  const compare6000 = useMemo(() => optimize(parts, 6000, Number(kerf), scraps), [parts, kerf, scraps]);

  const totalPartLength = parts.reduce((s, p) => s + p.length, 0);
  const totalPartWeight = getBarWeight(totalPartLength, Number(kgPerMeter));
  const totalStockWeight = result.bars
    .filter((b) => b.source === "定尺")
    .reduce((s, b) => s + getBarWeight(b.stockLength, Number(kgPerMeter)), 0);
  const totalScrapWeight = result.bars.reduce((s, b) => s + getBarWeight(b.scrap, Number(kgPerMeter)), 0);

  function saveMaterial() {
    const item = { id: uid(), name: materialName, stockLength: Number(stockLength), kerf: Number(kerf) };
    setMaterials((prev) => [...prev, item]);
    setMaterialId(item.id);
  }

  function saveBarProject() {
    const name = barProjectName.trim() || `定尺案件_${new Date().toLocaleDateString("ja-JP")}`;
    const item = {
      id: uid(),
      name,
      savedAt: new Date().toLocaleString("ja-JP"),
      materialName,
      stockLength,
      kerf,
      kgPerMeter,
      partsText,
      scrapsText,
    };
    setSavedBarProjects((prev) => [item, ...prev].slice(0, 20));
    setBarProjectName(name);
  }

  function loadBarProject(id) {
    const item = savedBarProjects.find((p) => p.id === id);
    if (!item) return;
    setBarProjectName(item.name);
    setMaterialName(item.materialName || "");
    setStockLength(item.stockLength || 5500);
    setKerf(item.kerf || 3);
    setKgPerMeter(item.kgPerMeter || "0");
    setPartsText(item.partsText || "");
    setScrapsText(item.scrapsText || "");
  }

  function deleteBarProject(id) {
    setSavedBarProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="grid">
      <section className="panel no-print">
        <label>案件名</label>
        <input value={barProjectName} onChange={(e) => setBarProjectName(e.target.value)} placeholder="例：〇〇現場 手すりアングル" />

        <div className="project-actions">
          <button type="button" className="sub" onClick={saveBarProject}>案件保存</button>
          <select defaultValue="" onChange={(e) => loadBarProject(e.target.value)}>
            <option value="" disabled>保存案件を呼び出し</option>
            {savedBarProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} / {p.savedAt}</option>
            ))}
          </select>
        </div>

        {savedBarProjects.length > 0 && (
          <div className="saved-list">
            {savedBarProjects.slice(0, 5).map((p) => (
              <div key={p.id}>
                <span>{p.name}</span>
                <button type="button" className="mini-danger" onClick={() => deleteBarProject(p.id)}>削除</button>
              </div>
            ))}
          </div>
        )}

        <label>登録材料から選択</label>
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <label>材料名</label>
        <input value={materialName} onChange={(e) => {
          setMaterialName(e.target.value);
          const auto = getBarKgPerMeterFromName(e.target.value);
          if (auto) setKgPerMeter(auto.toFixed(3));
        }} />

        <div className="two">
          <div>
            <label>定尺長さ mm</label>
            <input type="number" value={stockLength} onChange={(e) => setStockLength(e.target.value)} />
          </div>
          <div>
            <label>切断ロス mm</label>
            <input type="number" value={kerf} onChange={(e) => setKerf(e.target.value)} />
          </div>
        </div>

        <label>重量 kg/m</label>
        <input type="number" step="0.001" value={kgPerMeter} onChange={(e) => setKgPerMeter(e.target.value)} />
        <p className="hint">40x40x4L などは概算自動入力。正確に出す場合は鋼材表のkg/mを入力してください。</p>

        <label>部材寸法</label>
        <textarea value={partsText} onChange={(e) => setPartsText(e.target.value)} placeholder="例：1664x352x3\n1064x552x3\n500x300x2" />
        <button type="button" className="sub sample-btn" onClick={() => setPartsText(SAMPLE_PLATE_PARTS)}>入力例を入れる</button>

        <label>再利用する端材 mm</label>
        <textarea className="small" value={scrapsText} onChange={(e) => setScrapsText(e.target.value)} />

        <div className="actions">
          <button><Calculator size={18} /> 計算</button>
          <button type="button" className="sub" onClick={saveMaterial}><Save size={18} /> 材料保存</button>
          <button type="button" className="sub" onClick={() => window.print()}><FileText size={18} /> PDF/印刷</button>
          <button type="button" className="sub" onClick={() => { setPartsText(""); setScrapsText(""); }}><RotateCcw size={18} /> 空欄に戻す</button>
        </div>
      </section>

      <section className="result">
        <div className="print-title">
          <h2>定尺取り合い切断指示書{barProjectName ? `：${barProjectName}` : ""}</h2>
          <p>材料：{materialName} / 定尺：{stockLength}mm / 切断ロス：{kerf}mm / 重量：{kgPerMeter}kg/m</p>
        </div>

        <Summary result={result} parts={parts} />

        <div className="sheet-weight bar-total-weight">
          <span>部材重量：{formatBarKg(totalPartWeight)}</span>
          <span>新品定尺重量：{formatBarKg(totalStockWeight)}</span>
          <span>端材重量目安：{formatBarKg(totalScrapWeight)}</span>
        </div>

        <div className="compare no-print">
          <h3>5.5m / 6m 比較</h3>
          <div>
            <article>
              <strong>5.5m</strong>
              <p>新品定尺：{compare5500.bars.filter((b) => b.source === "定尺").length}本</p>
              <small>端材合計：{Math.round(compare5500.bars.reduce((s, b) => s + b.scrap, 0))}mm</small>
            </article>
            <article>
              <strong>6m</strong>
              <p>新品定尺：{compare6000.bars.filter((b) => b.source === "定尺").length}本</p>
              <small>端材合計：{Math.round(compare6000.bars.reduce((s, b) => s + b.scrap, 0))}mm</small>
            </article>
          </div>
        </div>

        {result.tooLong.length > 0 && (
          <div className="warn">定尺より長い部材があります：{result.tooLong.map((p) => p.length).join("、")}mm</div>
        )}

        <h3>割付結果・切断指示</h3>
        <div className="bars">
          {result.bars.map((bar) => {
            const usedPartLength = bar.parts.reduce((s, p) => s + p.length, 0);
            const usedWeight = getBarWeight(usedPartLength, Number(kgPerMeter));
            const stockWeight = bar.source === "定尺" ? getBarWeight(bar.stockLength, Number(kgPerMeter)) : getBarWeight(bar.stockLength, Number(kgPerMeter));
            const scrapWeight = getBarWeight(bar.scrap, Number(kgPerMeter));

            return (
              <div className="bar-card" key={bar.id}>
                <div className="bar-head">
                  <strong>{bar.source === "端材" ? bar.label : `定尺 ${bar.index}`}</strong>
                  <span>{bar.source}</span>
                </div>
                <p className="bar-meta">使用 {Math.round(bar.used)}mm / 端材 {Math.round(bar.scrap)}mm</p>

                <div className="sheet-weight">
                  <span>元材重量：{formatBarKg(stockWeight)}</span>
                  <span>部材重量：{formatBarKg(usedWeight)}</span>
                  <span>端材重量：{formatBarKg(scrapWeight)}</span>
                </div>

                <div className="bar-visual">
                  {bar.parts.map((part, i) => {
                    const width = Math.max(6, (part.length / Math.max(1, bar.stockLength)) * 100);
                    return (
                      <div className="piece" style={{ width: `${width}%` }} key={`${part.id}-${i}`}>
                        {part.length}
                      </div>
                    );
                  })}
                  {bar.scrap > 0 && <div className="scrap">端材 {Math.round(bar.scrap)}</div>}
                </div>

                <p className="cut-line">{getBarCutInstruction(bar, kerf)}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}


function PlateCalc() {
  const [mode, setMode] = useState("laser");
  const [projectName, setProjectName] = useState("");
  const [savedProjects, setSavedProjects] = useState(loadLocal("plateProjects", []));
  const [sheetW, setSheetW] = useState(1219);
  const [sheetH, setSheetH] = useState(2438);
  const [thickness, setThickness] = useState(6);
  const [kerf, setKerf] = useState(3);
  const [allowRotate, setAllowRotate] = useState(true);
  const [grainFixed, setGrainFixed] = useState(true);
  const [bandMode, setBandMode] = useState("auto");
  const [partsText, setPartsText] = useState("");

  // 4×8板材の入力中寸法は自動保存しない。URLを開いた時は空欄で開始。
  // 案件保存したデータのみ、保存案件から呼び出せる。

  useEffect(() => {
    localStorage.setItem("plateProjects", JSON.stringify(savedProjects));
  }, [savedProjects]);

  function savePlateProject() {
    const name = projectName.trim() || `案件_${new Date().toLocaleDateString("ja-JP")}`;
    const item = {
      id: uid(),
      name,
      savedAt: new Date().toLocaleString("ja-JP"),
      mode,
      sheetW,
      sheetH,
      thickness,
      kerf,
      allowRotate,
      grainFixed,
      bandMode,
      partsText,
    };
    setSavedProjects((prev) => [item, ...prev].slice(0, 20));
    setProjectName(name);
  }

  function loadPlateProject(id) {
    const item = savedProjects.find((p) => p.id === id);
    if (!item) return;
    setProjectName(item.name);
    setMode(item.mode || "laser");
    setSheetW(item.sheetW || 1219);
    setSheetH(item.sheetH || 2438);
    setThickness(item.thickness || 6);
    setKerf(item.kerf || 3);
    setAllowRotate(item.allowRotate ?? true);
    setGrainFixed(item.grainFixed ?? true);
    setBandMode(item.bandMode || "auto");
    setPartsText(item.partsText || "");
  }

  function deletePlateProject(id) {
    setSavedProjects((prev) => prev.filter((p) => p.id !== id));
  }

  const parts = useMemo(() => parsePlateParts(partsText), [partsText]);
  const effectiveRotate = mode === "laser" ? allowRotate : false;
  const result = useMemo(
    () => mode === "shear"
      ? optimizeShearPlateParts(parts, Number(sheetW), Number(sheetH), Number(kerf), grainFixed, bandMode)
      : optimizePlateParts(parts, Number(sheetW), Number(sheetH), Number(kerf), effectiveRotate),
    [parts, sheetW, sheetH, kerf, effectiveRotate, mode, grainFixed, bandMode]
  );

  return (
    <div className="grid plate-grid">
      <section className="panel no-print">
        <h2>4×8板材取り合い</h2>

        <label>案件名</label>
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="例：〇〇現場 タラップ部材" />

        <div className="project-actions">
          <button type="button" className="sub" onClick={savePlateProject}>案件保存</button>
          <select defaultValue="" onChange={(e) => loadPlateProject(e.target.value)}>
            <option value="" disabled>保存案件を呼び出し</option>
            {savedProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} / {p.savedAt}</option>
            ))}
          </select>
        </div>

        {savedProjects.length > 0 && (
          <div className="saved-list">
            {savedProjects.slice(0, 5).map((p) => (
              <div key={p.id}>
                <span>{p.name}</span>
                <button type="button" className="mini-danger" onClick={() => deletePlateProject(p.id)}>削除</button>
              </div>
            ))}
          </div>
        )}

        <label>加工方法</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="laser">レーザー切断ver</option>
          <option value="shear">シャーリングver</option>
        </select>

        <div className="two">
          <div>
            <label>母材幅 mm</label>
            <input type="number" value={sheetW} onChange={(e) => setSheetW(e.target.value)} />
          </div>
          <div>
            <label>母材長さ mm</label>
            <input type="number" value={sheetH} onChange={(e) => setSheetH(e.target.value)} />
          </div>
        </div>

        <div className="two">
          <div>
            <label>板厚 mm</label>
            <input type="number" value={thickness} onChange={(e) => setThickness(e.target.value)} />
          </div>
          <div>
            <label>切断ロス mm</label>
            <input type="number" value={kerf} onChange={(e) => setKerf(e.target.value)} />
          </div>
        </div>

        {mode === "laser" && (
          <label className="check-row">
            <input type="checkbox" checked={allowRotate} onChange={(e) => setAllowRotate(e.target.checked)} />
            回転あり
          </label>
        )}

        {mode === "shear" && (
          <>
            <label className="check-row">
              <input type="checkbox" checked={grainFixed} onChange={(e) => setGrainFixed(e.target.checked)} />
              縞目固定
            </label>

            <label>帯方向</label>
            <select value={bandMode} onChange={(e) => setBandMode(e.target.value)}>
              <option value="auto">自動：縦帯/横帯で良い方</option>
              <option value="horizontal">横帯優先</option>
              <option value="vertical">縦帯優先</option>
            </select>

            <p className="hint">
              シャーリングverでは、1664×352のような部材も4×8の長手方向に合わせて入る向きを自動判定します。
            </p>
          </>
        )}

        <label>部材寸法</label>
        <textarea value={partsText} onChange={(e) => setPartsText(e.target.value)} />

        <p className="hint">入力形式：幅x長さx枚数　例：1664x352x3</p>

        <div className="actions">
          <button><Calculator size={18} /> 計算</button>
          <button type="button" className="sub" onClick={() => window.print()}><FileText size={18} /> PDF/印刷</button>
          <button type="button" className="sub" onClick={() => setPartsText("")}><RotateCcw size={18} /> 空欄に戻す</button>
        </div>
      </section>

      <section className="result">
        <div className="print-title">
          <h2>4×8板材取り合い指示書{projectName ? `：${projectName}` : ""}</h2>
          <p>
            方法：{mode === "shear" ? "シャーリングver" : "レーザー切断ver"} / 母材：{sheetW}×{sheetH}mm / 板厚：{thickness}mm / 切断ロス：{kerf}mm / {mode === "shear" ? `帯方向:${bandMode === "auto" ? "自動" : bandMode === "vertical" ? "縦帯" : "横帯"}` : (allowRotate ? "回転あり" : "回転なし")}
          </p>
        </div>

        <PlateSummary result={result} parts={parts} sheetW={Number(sheetW)} sheetH={Number(sheetH)} thickness={Number(thickness)} />

        {mode === "shear" && result.improvedByScrapFill && (
          <div className="improve-note">
            端材詰め改善を適用：既存母材の空き矩形を全確認し、小物部材を前の母材へ再配置しています。
          </div>
        )}

        {result.tooLarge.length > 0 && (
          <div className="warn">
            母材に入らない部材があります：
            {result.tooLarge.map((p) => `${p.w}×${p.h}`).join("、")}
          </div>
        )}

        <h3>板取り結果</h3>
        <div className="sheet-list">
          {result.sheets.map((sheet) => (
            <PlateDrawing key={sheet.id} sheet={sheet} sheetW={Number(sheetW)} sheetH={Number(sheetH)} mode={mode} thickness={Number(thickness)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BatchCalc() {
  const [jobs, setJobs] = useState(loadLocal("batchJobs", SAMPLE_BATCH));

  useEffect(() => {
    localStorage.setItem("batchJobs", JSON.stringify(jobs));
  }, [jobs]);

  const results = useMemo(() => jobs.map((job) => {
    const { parts } = parseParts(job.partsText);
    const result = optimize(parts, Number(job.stockLength), Number(job.kerf), []);
    return { job, parts, result };
  }), [jobs]);

  return (
    <section className="panel wide">
      <div className="head-row no-print">
        <h2>複数材料の一括計算</h2>
        <button type="button" onClick={() => setJobs((prev) => [...prev, {
          id: uid(),
          materialName: "新規材料",
          stockLength: 5500,
          kerf: 3,
          partsText: ""
        }])}><Plus size={18} />材料追加</button>
      </div>

      <div className="job-list no-print">
        {jobs.map((job, index) => (
          <article className="job" key={job.id}>
            <div className="head-row">
              <strong>材料 {index + 1}</strong>
              <button className="danger" type="button" onClick={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}><Trash2 size={16} /></button>
            </div>
            <div className="three">
              <input value={job.materialName} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, materialName: e.target.value } : j))} />
              <input type="number" value={job.stockLength} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, stockLength: e.target.value } : j))} />
              <input type="number" value={job.kerf} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, kerf: e.target.value } : j))} />
            </div>
            <textarea value={job.partsText} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, partsText: e.target.value } : j))} />
          </article>
        ))}
      </div>

      <div className="head-row">
        <h2>一括計算結果</h2>
        <button className="sub no-print" type="button" onClick={() => window.print()}><FileText size={18} />PDF/印刷</button>
      </div>

      {results.map(({ job, parts, result }) => (
        <div className="batch-result" key={job.id}>
          <h3>{job.materialName} / 定尺 {job.stockLength}mm / ロス {job.kerf}mm</h3>
          <Summary result={result} parts={parts} />
          <Bars result={result} kerf={job.kerf} compact />
        </div>
      ))}
    </section>
  );
}

function Materials({ materials, setMaterials, resetMaterialsOnly }) {
  const [name, setName] = useState("");
  const [stockLength, setStockLength] = useState(5500);
  const [kerf, setKerf] = useState(3);

  function add() {
    if (!name.trim()) return;
    setMaterials((prev) => [...prev, { id: uid(), name, stockLength: Number(stockLength), kerf: Number(kerf) }]);
    setName("");
  }

  return (
    <section className="panel wide">
      <h2>材料登録</h2>
      <div className="three no-print">
        <input placeholder="材料名 例：50x50x6L" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" value={stockLength} onChange={(e) => setStockLength(e.target.value)} />
        <input type="number" value={kerf} onChange={(e) => setKerf(e.target.value)} />
      </div>
      <div className="material-actions no-print">
        <button type="button" onClick={add}><Plus size={18} />登録</button>
        <button type="button" className="sub" onClick={resetMaterialsOnly}>初期材料にリセット</button>
      </div>

      <div className="material-list">
        {materials.map((m) => (
          <article className="material" key={m.id}>
            <strong>{m.name}</strong>
            <span>定尺 {m.stockLength}mm / ロス {m.kerf}mm</span>
            <button className="danger no-print" type="button" onClick={() => setMaterials((prev) => prev.filter((x) => x.id !== m.id))}><Trash2 size={16} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function MobileSample() {
  const { parts } = parseParts(SAMPLE_PARTS);
  const result = optimize(parts, 5500, 3, []);

  return (
    <section className="phone">
      <h2>スマホ現場表示</h2>
      <p>現場で切断順だけ確認しやすい表示です。</p>
      {result.bars.map((bar) => (
        <article key={bar.id}>
          <strong>定尺 {bar.index}</strong>
          <b>{bar.parts.map((p) => p.length).join(" / ")}</b>
          <span>端材 {Math.round(bar.scrap)}mm</span>
        </article>
      ))}
    </section>
  );
}

function App() {
  const [tab, setTab] = useState("single");
  const [materials, setMaterials] = useState(() => {
    const currentVersion = localStorage.getItem("materialPresetVersion");
    if (currentVersion !== MATERIAL_PRESET_VERSION) {
      localStorage.setItem("materials", JSON.stringify(DEFAULT_MATERIALS));
      localStorage.setItem("materialPresetVersion", MATERIAL_PRESET_VERSION);
      return DEFAULT_MATERIALS;
    }
    return loadLocal("materials", DEFAULT_MATERIALS);
  });

  function clearAllSavedData() {
    if (!window.confirm("保存案件・保存材料・過去入力をすべて削除し、初期材料リストに戻しますか？")) return;
    localStorage.removeItem("singlePartsText");
    localStorage.removeItem("scrapsText");
    localStorage.removeItem("platePartsText");
    localStorage.removeItem("barProjects");
    localStorage.removeItem("plateProjects");
    localStorage.setItem("materials", JSON.stringify(DEFAULT_MATERIALS));
    localStorage.setItem("materialPresetVersion", MATERIAL_PRESET_VERSION);
    window.location.reload();
  }

  function resetMaterialsOnly() {
    if (!window.confirm("材料登録だけを初期材料リストに戻しますか？")) return;
    localStorage.setItem("materials", JSON.stringify(DEFAULT_MATERIALS));
    localStorage.setItem("materialPresetVersion", MATERIAL_PRESET_VERSION);
    setMaterials(DEFAULT_MATERIALS);
  }

  useEffect(() => {
    localStorage.setItem("materials", JSON.stringify(materials));
  }, [materials]);

  return (
    <main>
      <header className="no-print">
        <h1>定尺・4×8板取り合い計算アプリ</h1>
        <p>Step12：起動時にSS400規格材料へ自動リセットされる版です。</p>
        <button type="button" className="sub clear-storage-btn" onClick={clearAllSavedData}>保存データを全削除</button>
      </header>

      <nav className="tabs no-print">
        <button className={tab === "single" ? "active" : ""} onClick={() => setTab("single")}>定尺計算</button>
        <button className={tab === "plate" ? "active" : ""} onClick={() => setTab("plate")}>4×8板材</button>
        <button className={tab === "batch" ? "active" : ""} onClick={() => setTab("batch")}>一括計算</button>
        <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")}>材料登録</button>
        <button className={tab === "mobile" ? "active" : ""} onClick={() => setTab("mobile")}>現場表示</button>
      </nav>

      {tab === "single" && <SingleCalc materials={materials} setMaterials={setMaterials} />}
      {tab === "plate" && <PlateCalc />}
      {tab === "batch" && <BatchCalc />}
      {tab === "materials" && <Materials materials={materials} setMaterials={setMaterials} resetMaterialsOnly={resetMaterialsOnly} />}
      {tab === "mobile" && <MobileSample />}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
