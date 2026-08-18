import { rolePackSrc, type AvatarGenderId } from "./roleArt";
import type { AvatarRoleId } from "./roles";

export type PosterInput = {
  authorName: string;
  roleId: AvatarRoleId | null;
  gender: AvatarGenderId;
  keywords: string[];
  principles: string[];
  priceLabel: string;
  inviteUrl: string;
  title: string;
  subtitle: string;
  togetherLine: string;
  partners: string;
};

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

/** 9:16 result poster — cover art + price + tags + invite QR (no raw answers). */
export async function downloadChroniclePoster(input: PosterInput): Promise<boolean> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1f1b16");
  bg.addColorStop(1, "#0f0d0b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(201,167,106,0.18)";
  ctx.beginPath();
  ctx.arc(180, 160, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c9a76a";
  ctx.font = "600 36px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(input.subtitle, W / 2, 120);

  ctx.fillStyle = "#f4efe6";
  ctx.font = "700 72px ui-serif, Georgia, serif";
  ctx.fillText(input.title, W / 2, 210);

  const artSrc = input.roleId ? rolePackSrc(input.roleId, input.gender) : "";
  const cover = artSrc ? await loadImage(artSrc, true) : null;
  const coverW = 560;
  const coverH = 746;
  const coverX = (W - coverW) / 2;
  const coverY = 270;
  ctx.fillStyle = "#f4f1ea";
  roundRect(ctx, coverX, coverY, coverW, coverH, 10);
  ctx.fill();
  if (cover) {
    ctx.save();
    roundRect(ctx, coverX, coverY, coverW, coverH, 10);
    ctx.clip();
    ctx.drawImage(cover, coverX, coverY, coverW, coverH);
    ctx.restore();
  }

  ctx.fillStyle = "#c9a76a";
  ctx.font = "700 64px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(input.priceLabel, W / 2, coverY + coverH + 88);

  ctx.fillStyle = "#e8dfd0";
  ctx.font = "600 40px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(input.authorName, W / 2, coverY + coverH + 150);

  const tags = input.keywords.filter(Boolean).slice(0, 3).join("  ·  ");
  if (tags) {
    ctx.fillStyle = "rgba(201,167,106,0.92)";
    ctx.font = "500 28px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(tags, W / 2, coverY + coverH + 200);
  }

  const principles = input.principles.filter(Boolean).slice(0, 3).join("  ·  ");
  if (principles) {
    ctx.fillStyle = "rgba(232,223,208,0.75)";
    ctx.font = "400 24px ui-sans-serif, system-ui, sans-serif";
    wrapCenter(ctx, principles, W / 2, coverY + coverH + 248, W - 160, 32);
  }

  ctx.fillStyle = "#c9a76a";
  ctx.font = "500 28px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(input.togetherLine, W / 2, 1580);

  const qr = await loadImage(qrImageUrl(input.inviteUrl, 240), true);
  const qrSize = 180;
  const qrX = (W - qrSize) / 2;
  const qrY = 1610;
  ctx.fillStyle = "#fff";
  ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
  if (qr) ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "rgba(201,167,106,0.7)";
  ctx.font = "400 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(input.partners, W / 2, 1880);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-binance-life.png";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      resolve(true);
    }, "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCenter(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxW: number,
  lineH: number,
) {
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
}
