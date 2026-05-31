"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function QRScan({ onResult }: { onResult: (text: string) => void }) {
  const elId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const scanner = new Html5Qrcode(elId);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          scanner.stop().catch(() => {});
          onResult(decoded);
        },
        () => {}
      )
      .catch((e) => setErr(String(e)));
    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onResult]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div id={elId} className="w-full max-w-xs overflow-hidden rounded-2xl" />
      {err && (
        <p className="text-center text-xs text-red-300">
          Camera unavailable. Enter the code manually below.
        </p>
      )}
      <div className="flex w-full max-w-xs gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.trim())}
          placeholder="e.g. pp:8f3a2"
          className="flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm text-white ring-1 ring-white/20"
        />
        <button
          onClick={() => manual && onResult(manual)}
          className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-black"
        >
          Join
        </button>
      </div>
    </div>
  );
}
