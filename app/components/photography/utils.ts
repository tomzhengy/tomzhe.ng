interface ImageInfo {
  width: number;
  height: number;
  aspect: string;
  color: string;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function computeAspect(w: number, h: number): string {
  const d = gcd(w, h);
  const rw = w / d;
  const rh = h / d;
  // keep it simple for common ratios, otherwise use simplified
  if (rw <= 20 && rh <= 20) return `${rw}/${rh}`;
  // fallback to approximate common ratios
  const ratio = w / h;
  if (Math.abs(ratio - 4 / 3) < 0.05) return "4/3";
  if (Math.abs(ratio - 3 / 2) < 0.05) return "3/2";
  if (Math.abs(ratio - 16 / 9) < 0.05) return "16/9";
  if (Math.abs(ratio - 3 / 4) < 0.05) return "3/4";
  if (Math.abs(ratio - 2 / 3) < 0.05) return "2/3";
  if (Math.abs(ratio - 1) < 0.05) return "1/1";
  return `${rw}/${rh}`;
}

function sampleColor(
  source: HTMLImageElement | HTMLVideoElement,
  w: number,
  h: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 10;
  canvas.height = 10;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#888888";
  ctx.drawImage(source, 0, 0, w, h, 0, 0, 10, 10);
  const data = ctx.getImageData(0, 0, 10, 10).data;
  let r = 0,
    g = 0,
    b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const pixels = data.length / 4;
  r = Math.round(r / pixels);
  g = Math.round(g / pixels);
  b = Math.round(b / pixels);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function analyzeImage(file: File): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.muted = true;
      video.src = url;
      video.onloadeddata = () => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        const color = sampleColor(video, w, h);
        URL.revokeObjectURL(url);
        resolve({ width: w, height: h, aspect: computeAspect(w, h), color });
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("failed to load video"));
      };
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const color = sampleColor(img, w, h);
        URL.revokeObjectURL(url);
        resolve({ width: w, height: h, aspect: computeAspect(w, h), color });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("failed to load image"));
      };
    }
  });
}
