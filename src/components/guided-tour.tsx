"use client";

import { useCallback, useEffect, useState } from "react";

const TOUR_STEPS = [
  {
    target: "dashboard-stats",
    title: "Xin chào! Đây là dashboard của bạn",
    content: "Bạn thấy tổng quan: số workflow, runs trong 7 ngày, lỗi gần đây. Bấm vào từng mục để xem chi tiết.",
    position: "bottom" as const,
  },
  {
    target: "create-workflow-btn",
    title: "Tạo workflow đầu tiên",
    content: "Bấm \"Tạo workflow\" để bắt đầu. Hoặc chọn mẫu có sẵn để có workflow chạy được ngay trong 30 giây.",
    position: "top" as const,
  },
  {
    target: "ai-agent-hint",
    title: "Để AI tạo workflow giúp bạn",
    content: "Vào canvas workflow, bấm nút \"AI Agent\" và mô tả bằng tiếng Việt. AI sẽ tự tạo nodes + connections cho bạn.",
    position: "top" as const,
  },
];

interface Props {
  onComplete?: () => void;
}

export default function GuidedTour({ onComplete }: Props) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const startTour = useCallback(() => {
    setActive(true);
    setStep(0);
  }, []);

  const closeTour = useCallback(() => {
    setActive(false);
    onComplete?.();
  }, [onComplete]);

  const nextStep = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      closeTour();
    }
  }, [step, closeTour]);

  useEffect(() => {
    const stored = localStorage.getItem("flowly_tour_completed");
    if (!stored) {
      const timer = setTimeout(startTour, 800);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  useEffect(() => {
    if (!active) return;
    const el = document.getElementById(TOUR_STEPS[step].target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
    } else {
      setRect(null);
    }
  }, [active, step]);

  if (!active) return null;

  const current = TOUR_STEPS[step];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={closeTour} />

      {/* Spotlight */}
      {rect && (
        <div
          className="absolute rounded-xl ring-4 ring-white/80 transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute z-10 w-80 rounded-xl bg-white p-5 shadow-2xl"
        style={
          rect
            ? current.position === "bottom"
              ? { top: rect.bottom + 16, left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)) }
              : { bottom: window.innerHeight - rect.top + 16, left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)) }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-brand">
            Bước {step + 1} / {TOUR_STEPS.length}
          </span>
          <button onClick={closeTour} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        <h3 className="mt-2 text-sm font-semibold text-zinc-900">{current.title}</h3>
        <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">{current.content}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-brand" : "bg-zinc-200"}`} />
            ))}
          </div>
          <button
            onClick={nextStep}
            className="rounded-lg bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
          >
            {step < TOUR_STEPS.length - 1 ? "Tiếp" : "Bắt đầu"}
          </button>
        </div>
      </div>
    </div>
  );
}
