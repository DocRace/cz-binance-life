import czClubMarkSrc from "../../assets/cz-club-mark.png";
import datadanceWordmarkSrc from "../../assets/datadance-wordmark.svg";
import { coverHasDarkBylineZone, rolePackSrc, type AvatarGenderId } from "./roleArt";
import type { AvatarRoleId } from "./roles";

const PRESS_LOGO_SRC = "/invite/assets/commercial-press.png";

export type PosterInput = {
  authorName: string;
  roleId: AvatarRoleId | null;
  gender: AvatarGenderId;
  roleLabel?: string;
  publisher?: string;
  keywords: string[];
  principles: string[];
  priceLabel: string;
  inviteUrl: string;
  title: string;
  subtitle: string;
  partners: string;
  qrHint?: string;
  /** Line under the price, e.g. "By: Race Li". Falls back to "By: {authorName}". */
  creditLine?: string;
};

type Pt = [number, number];

function loadImage(src: string, cors = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function qrImageUrl(data: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

const GOLD = "#c9a76a";
const GOLD_LIGHT = "#ddc48e";
const CREAM = "#f4f1ea";
const INK = "#1a1a1a";
/** One sans stack for every poster title/body (Latin + CJK). Price digits stay Orbitron. */
const SANS = '"Instrument Sans", "Noto Sans TC", "Noto Sans SC", "PingFang TC", "PingFang SC", sans-serif';
const TECH = '"Orbitron", "Instrument Sans", "Noto Sans TC", sans-serif';

const COVER_W = 600;
const COVER_H = 805;
const TITLE_INK = "#f3e6c8";
const TITLE_PX = 88;

async function ensurePosterFonts() {
  const fonts = document.fonts;
  if (!fonts?.load) return;
  await Promise.all(
    [
      `500 ${TITLE_PX}px ${SANS}`,
      `500 76px ${SANS}`,
      `500 72px ${SANS}`,
      `500 64px ${SANS}`,
      `500 40px ${SANS}`,
      `400 28px ${SANS}`,
      `500 26px ${SANS}`,
      `600 56px ${TECH}`,
    ].map((spec) => fonts.load(spec).catch(() => undefined)),
  );
  await fonts.ready.catch(() => undefined);
}

/** 4:5 result poster at 2x — WeChat / IG / X all crop this ratio cleanly. */
export async function buildChroniclePosterBlob(input: PosterInput): Promise<Blob | null> {
  const scale = 2;
  const W = 1080 * scale;
  const H = 1350 * scale;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  await ensurePosterFonts();
  paintBackdrop(ctx, W, H);

  const [pressLogo, clubLogo, ddLogo] = await Promise.all([
    loadImage(PRESS_LOGO_SRC, true).then(knockOutNearBlack),
    loadImage(czClubMarkSrc, true).then(knockOutNearBlack),
    loadImage(datadanceWordmarkSrc, true),
  ]);

  ctx.textAlign = "center";
  const latinTitle = !/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(`${input.title || ""}`);
  const titleSize = latinTitle ? 76 : 64;
  const titleMaxW = W - 64 * scale;
  let cursor = 100 * scale;
  cursor = fillWrappedTitle(ctx, input.subtitle, W / 2, cursor, titleMaxW, scale, titleSize, 52);
  cursor += 88 * scale;
  fillMatchingTitle(ctx, input.title, W / 2, cursor, W, scale, titleSize);
  cursor += latinTitle ? 64 * scale : 56 * scale;

  const artSrc = input.roleId ? rolePackSrc(input.roleId, input.gender) : "";
  const coverArt = artSrc ? await loadImage(artSrc, true) : null;
  const darkByline = coverHasDarkBylineZone(input.roleId, input.gender);
  const keywords = input.keywords.map((k) => `${k || ""}`.trim()).filter(Boolean).slice(0, 3);
  const signature = input.authorName.trim();
  const roleByline = (input.roleLabel || "").trim();
  const byline = signature || roleByline;
  const corner = signature && roleByline ? roleByline : "";

  const face = paintCoverFace({
    scale,
    art: coverArt,
    title: input.title,
    byline,
    corner,
    keywords,
    partners: input.partners,
    darkByline,
  });

  const bookW = 328 * scale;
  const bookH = Math.round(bookW * (COVER_H / COVER_W));
  const bookOpts = {
    cx: W / 2,
    cy: cursor + bookH / 2,
    coverW: bookW,
    coverH: bookH,
    thickness: Math.round(bookW * (50 / 228)),
    yawDeg: 24,
    pitchDeg: 2,
  };
  drawClosedBook(ctx, {
    ...bookOpts,
    face,
    spineTitle: input.title,
    spinePublisher: input.publisher || input.partners,
  });

  const midY = closedBookMaxY(bookOpts) + 92 * scale;

  drawPriceLabel(ctx, input.priceLabel, W / 2, midY, scale, 56);

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8dfd0";
  ctx.font = `500 ${40 * scale}px ${SANS}`;
  const credit = `${input.creditLine || (signature ? `By: ${signature}` : "")}`.trim();
  ctx.fillText(credit, W / 2, midY + 54 * scale);

  const principles = input.principles.filter(Boolean).slice(0, 3).join("  ·  ");
  if (principles) {
    ctx.fillStyle = "rgba(232,223,208,0.86)";
    ctx.font = `400 ${28 * scale}px ${SANS}`;
    wrapCenter(ctx, principles, W / 2, midY + 102 * scale, W - 80 * scale, 40 * scale);
  }

  const qrSize = 200 * scale;
  const sidePad = 228 * scale;
  const bottomPad = 80 * scale;
  const qrX = W - sidePad - qrSize;
  const qrY = H - bottomPad - qrSize;
  const qr = await loadImage(qrImageUrl(input.inviteUrl, 440), true).then(tintQrBlushWhite);
  if (qr) ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  const qrHint = `${input.qrHint || ""}`.trim();
  let hintSize = 0;
  const hintLift = 18 * scale;
  if (qrHint) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(232,223,208,0.86)";
    hintSize = 26 * scale;
    ctx.font = `400 ${hintSize}px ${SANS}`;
    const hintW = ctx.measureText(qrHint).width;
    if (hintW > qrSize * 1.08) {
      hintSize *= (qrSize * 1.08) / hintW;
      ctx.font = `400 ${hintSize}px ${SANS}`;
    }
    ctx.fillText(qrHint, qrX + qrSize / 2, qrY - hintLift);
  }

  const groupTop = qrHint ? qrY - hintLift - hintSize : qrY;
  const groupH = qrY + qrSize - groupTop;
  const groupMid = groupTop + groupH / 2;
  drawPartnerStack(ctx, [pressLogo, clubLogo, ddLogo], sidePad, groupMid, scale, W * 0.42, groupH);

  return canvasToImageBlob(canvas);
}

export async function downloadChroniclePoster(input: PosterInput): Promise<boolean> {
  const blob = await buildChroniclePosterBlob(input);
  if (!blob) return false;
  triggerBlobDownload(blob, posterFilename());
  return true;
}

export function isWeChatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent || "");
}

export function posterFilename(): string {
  return "my-binance-life.jpg";
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function canvasToImageBlob(canvas: HTMLCanvasElement, quality = 0.88): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export async function shareOrDownloadPoster(blob: Blob): Promise<"shared" | "downloaded" | "preview"> {
  // WeChat cannot download files — show a long-press preview instead.
  if (isWeChatBrowser()) return "preview";
  triggerBlobDownload(blob, posterFilename());
  return "downloaded";
}

function fillMatchingTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  _canvasW: number,
  scale: number,
  sizePx = TITLE_PX,
) {
  ctx.fillStyle = TITLE_INK;
  ctx.font = `500 ${sizePx * scale}px ${SANS}`;
  ctx.fillText(text, x, y);
}

/** Same size as the main title; wraps instead of shrinking the first line. */
function fillWrappedTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxW: number,
  scale: number,
  sizePx: number,
  gapPx: number,
): number {
  ctx.fillStyle = TITLE_INK;
  ctx.font = `500 ${sizePx * scale}px ${SANS}`;
  ctx.textAlign = "center";
  const raw = `${text || ""}`.trim();
  const step = (sizePx + gapPx) * scale;
  const lines: string[] = [];
  if (!raw) return startY;
  if (ctx.measureText(raw).width <= maxW) {
    lines.push(raw);
  } else if (/\s/.test(raw)) {
    let line = "";
    for (const word of raw.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  } else {
    let line = "";
    for (const ch of raw) {
      const next = line + ch;
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  const shown = lines.slice(0, 2);
  let y = startY;
  shown.forEach((line, i) => {
    ctx.fillText(line, x, y);
    if (i < shown.length - 1) y += step;
  });
  return y;
}

function closedBookMaxY(opts: {
  cx: number;
  cy: number;
  coverW: number;
  coverH: number;
  thickness: number;
  yawDeg: number;
  pitchDeg: number;
}): number {
  const { cx, cy, coverW: w, coverH: h, thickness: t } = opts;
  const yaw = (opts.yawDeg * Math.PI) / 180;
  const pitch = (opts.pitchDeg * Math.PI) / 180;
  const depth = w * 3.4;
  const originY = -h * 0.08;
  const project = (x: number, y: number, z: number): number => {
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const s = depth / (depth - z2);
    return cy + originY + (y1 - originY) * s;
  };
  const hw = w / 2;
  const hh = h / 2;
  const ht = t / 2;
  const ys = [
    project(-hw, hh, ht),
    project(hw, hh, ht),
    project(-hw, hh, -ht),
    project(hw, hh, -ht),
  ];
  return Math.max(...ys) + 22 * (w / 328);
}

/** object-fit: cover; object-position: top — crop sides, never stretch. */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || dw <= 0 || dh <= 0) return;
  const scale = Math.max(dw / iw, dh / ih);
  const srcW = Math.min(iw, dw / scale);
  const srcH = Math.min(ih, dh / scale);
  const sx = Math.max(0, (iw - srcW) / 2);
  const sy = 0;
  ctx.drawImage(img, sx, sy, srcW, srcH, dx, dy, dw, dh);
}

function paintBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createLinearGradient(0, 0, W * 0.2, H);
  bg.addColorStop(0, "#1f1b16");
  bg.addColorStop(0.5, "#161310");
  bg.addColorStop(1, "#0f0d0b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.78, H * 0.08, 0, W * 0.78, H * 0.08, W * 0.7);
  glow.addColorStop(0, "rgba(201,167,106,0.2)");
  glow.addColorStop(0.6, "rgba(201,167,106,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const floor = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.38, W * 0.62);
  floor.addColorStop(0, "rgba(201,167,106,0.1)");
  floor.addColorStop(1, "rgba(201,167,106,0)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, W, H);
}

function paintCoverFace(opts: {
  scale: number;
  art: HTMLImageElement | null;
  title: string;
  byline: string;
  corner: string;
  keywords: string[];
  partners: string;
  darkByline: boolean;
}): HTMLCanvasElement {
  const s = opts.scale;
  const w = COVER_W * s;
  const h = COVER_H * s;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  if (opts.art) {
    drawImageCover(ctx, opts.art, 0, 0, w, h);
  }

  const hinge = ctx.createLinearGradient(0, 0, 28 * s, 0);
  hinge.addColorStop(0, "rgba(0,0,0,0.28)");
  hinge.addColorStop(0.5, "rgba(0,0,0,0.08)");
  hinge.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hinge;
  ctx.fillRect(0, 0, 28 * s, h);

  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, "rgba(255,255,255,0.28)");
  sheen.addColorStop(0.38, "rgba(255,255,255,0)");
  sheen.addColorStop(0.7, "rgba(0,0,0,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "left";
  if (opts.corner) {
    ctx.fillStyle = INK;
    ctx.font = `500 ${24 * s}px ${SANS}`;
    ctx.fillText(truncate(ctx, opts.corner, w * 0.62), 26 * s, 46 * s);
  }

  const ink = opts.darkByline ? "#ffffff" : INK;
  const muted = opts.darkByline ? "rgba(255,255,255,0.82)" : "rgba(26,26,26,0.72)";
  const faint = opts.darkByline ? "rgba(255,255,255,0.55)" : "rgba(26,26,26,0.48)";
  ctx.textAlign = "right";
  ctx.fillStyle = GOLD;
  ctx.font = `500 ${72 * s}px ${SANS}`;
  ctx.fillText(opts.title, w - 26 * s, h - 148 * s);
  ctx.fillStyle = ink;
  ctx.font = `500 ${38 * s}px ${SANS}`;
  ctx.fillText(truncate(ctx, opts.byline, w - 56 * s), w - 26 * s, h - 92 * s);
  if (opts.keywords.length) {
    ctx.fillStyle = muted;
    ctx.font = `500 ${24 * s}px ${SANS}`;
    ctx.fillText(truncate(ctx, opts.keywords.join(" · "), w - 56 * s), w - 26 * s, h - 56 * s);
  }
  ctx.fillStyle = faint;
  ctx.font = `400 ${18 * s}px ${SANS}`;
  ctx.fillText(truncate(ctx, opts.partners, w - 56 * s), w - 26 * s, h - 26 * s);

  ctx.strokeStyle = "rgba(0,0,0,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  return c;
}

function drawClosedBook(
  ctx: CanvasRenderingContext2D,
  opts: {
    cx: number;
    cy: number;
    coverW: number;
    coverH: number;
    thickness: number;
    yawDeg: number;
    pitchDeg: number;
    face: HTMLCanvasElement;
    spineTitle: string;
    spinePublisher: string;
  },
) {
  const { cx, cy, coverW: w, coverH: h, thickness: t } = opts;
  const yaw = (opts.yawDeg * Math.PI) / 180;
  const pitch = (opts.pitchDeg * Math.PI) / 180;
  /** Same ratio as site `perspective: 1100px` on a ~228px cover, a bit stronger for a still. */
  const depth = w * 3.4;
  const originY = -h * 0.08;

  /** CSS-style perspective: +Z toward the viewer, vanishing to the far edge. */
  const project = (x: number, y: number, z: number): Pt => {
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const s = depth / (depth - z2);
    return [cx + x1 * s, cy + originY + (y1 - originY) * s];
  };

  const hw = w / 2;
  const hh = h / 2;
  const ht = t / 2;
  const L = -hw;
  const R = hw;
  const T = -hh;
  const B = hh;
  const F = ht;
  const K = -ht;

  const front: Pt[] = [project(L, T, F), project(R, T, F), project(R, B, F), project(L, B, F)];
  const spine: Pt[] = [project(L, T, K), project(L, T, F), project(L, B, F), project(L, B, K)];
  const pages: Pt[] = [project(R, T, F), project(R, T, K), project(R, B, K), project(R, B, F)];

  ctx.save();
  const shadowRx = w * 0.62;
  const shadowRy = Math.max(56, w * 0.12);
  ctx.translate(cx + 22, cy + hh + 48);
  ctx.scale(1, shadowRy / shadowRx);
  const shadow = ctx.createRadialGradient(0, 0, shadowRx * 0.1, 0, 0, shadowRx);
  shadow.addColorStop(0, "rgba(0,0,0,0.4)");
  shadow.addColorStop(0.42, "rgba(0,0,0,0.2)");
  shadow.addColorStop(0.74, "rgba(0,0,0,0.07)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, shadowRx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  paintPageCap(ctx, project, T, L, R, F, K);
  paintPageCap(ctx, project, B, L, R, F, K);
  fillQuad(ctx, pages, pageFill(ctx, pages));
  fillQuad(ctx, spine, spineFill(ctx, spine));
  drawCoverFaceMesh(ctx, opts.face, project, L, T, R, B, F);

  ctx.save();
  ctx.beginPath();
  pathQuad(ctx, front);
  ctx.clip();
  const glare = ctx.createRadialGradient(front[0][0] + 80, front[0][1] + 60, 0, front[0][0] + 80, front[0][1] + 60, w);
  glare.addColorStop(0, "rgba(255,255,255,0.16)");
  glare.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  pathQuad(ctx, spine);
  ctx.clip();
  const midX = (spine[0][0] + spine[1][0] + spine[2][0] + spine[3][0]) / 4;
  const midY = (spine[0][1] + spine[1][1] + spine[2][1] + spine[3][1]) / 4;
  const alongX = spine[0][0] - spine[3][0];
  const alongY = spine[0][1] - spine[3][1];
  const acrossX = spine[1][0] - spine[0][0];
  const acrossY = spine[1][1] - spine[0][1];
  const spineAlong = Math.hypot(alongX, alongY);
  const spineAcross = Math.hypot(acrossX, acrossY);
  const spineSize = Math.max(16, Math.round(Math.min(spineAcross * 0.5, spineAlong * 0.075)));
  ctx.translate(midX, midY);
  ctx.rotate(Math.atan2(alongY, alongX));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = GOLD;
  ctx.font = `500 ${spineSize}px ${SANS}`;
  ctx.fillText(truncate(ctx, opts.spineTitle, spineAlong * 0.78), 0, 0);
  ctx.restore();
}

function spineFill(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
  g.addColorStop(0, "#cfc6b4");
  g.addColorStop(0.42, "#f2eee5");
  g.addColorStop(1, "#e8e1d4");
  return g;
}

function pageFill(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
  g.addColorStop(0, "#b9ad93");
  g.addColorStop(0.2, "#f7f2e8");
  g.addColorStop(0.55, "#ebe3d2");
  g.addColorStop(1, "#cfc3ab");
  return g;
}

/** White page-stack on the top / bottom of the block (paper thickness). */
function paintPageCap(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number, z: number) => Pt,
  y: number,
  x0: number,
  x1: number,
  zFront: number,
  zBack: number,
) {
  const pts: Pt[] = [
    project(x0, y, zBack),
    project(x1, y, zBack),
    project(x1, y, zFront),
    project(x0, y, zFront),
  ];
  fillQuad(ctx, pts, "#f7f2e8");
  ctx.save();
  ctx.beginPath();
  pathQuad(ctx, pts);
  ctx.clip();
  ctx.strokeStyle = "rgba(90, 70, 40, 0.12)";
  ctx.lineWidth = 1;
  const lines = 14;
  for (let i = 1; i < lines; i += 1) {
    const z = zBack + ((zFront - zBack) * i) / lines;
    const a = project(x0, y, z);
    const b = project(x1, y, z);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  pathQuad(ctx, pts);
  ctx.strokeStyle = "rgba(90, 70, 40, 0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function pathQuad(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.lineTo(pts[2][0], pts[2][1]);
  ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.closePath();
}

function fillQuad(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string | CanvasGradient) {
  ctx.beginPath();
  pathQuad(ctx, pts);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Small affine tiles so a perspective trapezoid cover does not shear. */
function drawCoverFaceMesh(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  project: (x: number, y: number, z: number) => Pt,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
) {
  const iw = img.width;
  const ih = img.height;
  if (!iw || !ih) return;
  const cols = 14;
  const rows = 18;
  ctx.save();
  ctx.beginPath();
  pathQuad(ctx, [project(x0, y0, z), project(x1, y0, z), project(x1, y1, z), project(x0, y1, z)]);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const u0 = col / cols;
      const u1 = (col + 1) / cols;
      const v0 = row / rows;
      const v1 = (row + 1) / rows;
      const tl = project(x0 + (x1 - x0) * u0, y0 + (y1 - y0) * v0, z);
      const tr = project(x0 + (x1 - x0) * u1, y0 + (y1 - y0) * v0, z);
      const bl = project(x0 + (x1 - x0) * u0, y0 + (y1 - y0) * v1, z);
      const sx = u0 * iw;
      const sy = v0 * ih;
      const sw = Math.max(1, (u1 - u0) * iw);
      const sh = Math.max(1, (v1 - v0) * ih);
      ctx.save();
      ctx.setTransform(
        (tr[0] - tl[0]) / sw,
        (tr[1] - tl[1]) / sw,
        (bl[0] - tl[0]) / sh,
        (bl[1] - tl[1]) / sh,
        tl[0],
        tl[1],
      );
      ctx.drawImage(img, sx, sy, sw, sh, -0.7, -0.7, sw + 1.4, sh + 1.4);
      ctx.restore();
    }
  }
  ctx.restore();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

type Mark = HTMLImageElement | HTMLCanvasElement;

/** Black-on-white QR: drop the plate and paint modules a blush off-white. */
function tintQrBlushWhite(img: HTMLImageElement | null): Mark | null {
  if (!img) return null;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
    if (lum > 190) {
      px[i + 3] = 0;
    } else {
      px[i] = 244;
      px[i + 1] = 230;
      px[i + 2] = 216;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/** Gold-on-black partner PNGs: drop the black plate so they sit on the poster. */
function knockOutNearBlack(img: HTMLImageElement | null): Mark | null {
  if (!img) return null;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] < 22 && px[i + 1] < 22 && px[i + 2] < 22) px[i + 3] = 0;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function markSize(img: Mark): { w: number; h: number } {
  if (img instanceof HTMLCanvasElement) return { w: img.width, h: img.height };
  return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}

/** Vertical left-stack for the poster footer: Press / Club / DataDance. */
function drawPartnerStack(
  ctx: CanvasRenderingContext2D,
  marks: Array<Mark | null>,
  left: number,
  centerY: number,
  scale: number,
  maxW: number,
  targetH?: number,
) {
  const heights = [48 * scale, 56 * scale, 52 * scale];
  const items = marks
    .map((img, i) => {
      if (!img) return null;
      const src = markSize(img);
      if (!src.w || !src.h) return null;
      const h = heights[i] ?? 32 * scale;
      return { img, w: (src.w / src.h) * h, h };
    })
    .filter((x): x is { img: Mark; w: number; h: number } => Boolean(x));
  if (!items.length) return;

  for (const it of items) {
    if (it.w > maxW) {
      const k = maxW / it.w;
      it.w *= k;
      it.h *= k;
    }
  }

  let gap = 22 * scale;
  let totalH = items.reduce((s, it) => s + it.h, 0) + gap * (items.length - 1);
  if (targetH && totalH > 0 && targetH > totalH) {
    const k = targetH / totalH;
    for (const it of items) {
      it.w *= k;
      it.h *= k;
    }
    gap *= k;
    totalH = targetH;
  }

  const stackW = Math.max(...items.map((it) => it.w));
  const cx = left + stackW / 2;
  let y = centerY - totalH / 2;
  for (const it of items) {
    ctx.drawImage(it.img, cx - it.w / 2, y, it.w, it.h);
    y += it.h + gap;
  }
}

function splitPriceLabel(label: string): { prefix: string; amount: string } {
  const raw = `${label || ""}`.trim();
  const match = raw.match(/^(.*?)([¥$€]\s*)?([\d][\d,.\s]*)$/);
  if (!match) return { prefix: raw, amount: "" };
  return {
    prefix: `${match[1] || ""}`.trim(),
    amount: `${match[2] || ""}${match[3] || ""}`.trim(),
  };
}

/** “價值” / “Worth” uses the poster sans; only the number stays Orbitron. */
function drawPriceLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  y: number,
  scale: number,
  sizePx = 56,
) {
  const { prefix, amount } = splitPriceLabel(label);
  const size = sizePx * scale;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GOLD_LIGHT;
  if (!amount) {
    ctx.textAlign = "center";
    ctx.font = `500 ${size}px ${SANS}`;
    ctx.fillText(prefix, cx, y);
    return;
  }
  ctx.textAlign = "left";
  ctx.font = `500 ${size}px ${SANS}`;
  const prefixW = prefix ? ctx.measureText(`${prefix} `).width : 0;
  ctx.font = `600 ${size}px ${TECH}`;
  const amountW = ctx.measureText(amount).width;
  let x = cx - (prefixW + amountW) / 2;
  if (prefix) {
    ctx.font = `500 ${size}px ${SANS}`;
    ctx.fillText(`${prefix} `, x, y);
    x += prefixW;
  }
  ctx.font = `600 ${size}px ${TECH}`;
  ctx.fillText(amount, x, y);
}

function wrapCenter(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split("  ·  ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const next = line ? `${line}  ·  ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineH;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
  return yy;
}
