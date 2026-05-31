"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QRShow({ payload }: { payload: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, payload, { width: 220, margin: 1 }, () => {});
    }
  }, [payload]);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-3 shadow-xl">
        <canvas ref={ref} />
      </div>
      <code className="rounded bg-black/40 px-2 py-1 text-xs text-white/80">{payload}</code>
    </div>
  );
}
