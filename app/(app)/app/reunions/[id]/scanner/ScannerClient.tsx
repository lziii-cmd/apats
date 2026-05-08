"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { useTranslations } from "next-intl";

type Props = {
  meetingId: string;
  meetingTitle: string;
};

type ScanState = "scanning" | "success" | "alreadyScanned" | "error" | "cameraError";

export default function ScannerClient({ meetingId, meetingTitle }: Props) {
  const t = useTranslations("app.scanner");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [errorMsg, setErrorMsg] = useState("");
  const scannedRef = useRef(false);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => tick();
      }
    } catch {
      setScanState("cameraError");
    }
  }

  function tick() {
    if (scannedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      scannedRef.current = true;
      stopCamera();
      sendScan(code.data);
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  async function sendScan(qrCode: string) {
    try {
      const res = await fetch("/api/reunions/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanState(data.alreadyScanned ? "alreadyScanned" : "success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "");
        setScanState("error");
      }
    } catch {
      setErrorMsg("");
      setScanState("error");
    }
  }

  function handleRetry() {
    scannedRef.current = false;
    setScanState("scanning");
    setErrorMsg("");
    startCamera();
  }

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="p-4 flex items-center gap-3">
        <Link
          href={`/app/reunions/${meetingId}`}
          className="text-sm text-gray-400 hover:text-white transition-colors"
          onClick={stopCamera}
        >
          {t("backToDetail")}
        </Link>
        <span className="text-gray-600">·</span>
        <span className="text-sm text-gray-300 truncate">{meetingTitle}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-8">
        {scanState === "scanning" && (
          <>
            <p className="text-sm text-gray-400 text-center max-w-xs">{t("instruction")}</p>
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/60 rounded-lg" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-xs text-gray-500 animate-pulse">{t("scanning")}</p>
          </>
        )}

        {scanState === "cameraError" && (
          <>
            <canvas ref={canvasRef} className="hidden" />
            <div className="text-center max-w-xs">
              <div className="text-4xl mb-4">📷</div>
              <p className="font-semibold mb-2">{t("cameraError")}</p>
              <p className="text-sm text-gray-400">{t("cameraErrorHint")}</p>
            </div>
            <Link
              href={`/app/reunions/${meetingId}`}
              className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              onClick={stopCamera}
            >
              {t("backToDetail")}
            </Link>
          </>
        )}

        {scanState === "success" && (
          <>
            <canvas ref={canvasRef} className="hidden" />
            <div className="text-center max-w-xs">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-xl font-semibold mb-1">{t("success")}</p>
              <p className="text-sm text-gray-400">{meetingTitle}</p>
            </div>
            <Link
              href={`/app/reunions/${meetingId}`}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              onClick={stopCamera}
            >
              {t("backToDetail")}
            </Link>
          </>
        )}

        {scanState === "alreadyScanned" && (
          <>
            <canvas ref={canvasRef} className="hidden" />
            <div className="text-center max-w-xs">
              <div className="text-6xl mb-4">ℹ️</div>
              <p className="text-xl font-semibold mb-1">{t("alreadyScanned")}</p>
              <p className="text-sm text-gray-400">{meetingTitle}</p>
            </div>
            <Link
              href={`/app/reunions/${meetingId}`}
              className="mt-4 border border-gray-600 text-gray-300 hover:text-white px-6 py-2.5 rounded-lg text-sm transition-colors"
              onClick={stopCamera}
            >
              {t("backToDetail")}
            </Link>
          </>
        )}

        {scanState === "error" && (
          <>
            <canvas ref={canvasRef} className="hidden" />
            <div className="text-center max-w-xs">
              <div className="text-4xl mb-4">❌</div>
              <p className="font-semibold mb-2">{t("error")}</p>
              {errorMsg && <p className="text-sm text-red-400 mb-4">{errorMsg}</p>}
            </div>
            <button
              onClick={handleRetry}
              className="bg-white text-gray-900 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              {t("tryAgain")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
