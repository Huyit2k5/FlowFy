"use client";

import { useState, useCallback } from "react";

interface Props {
  id: string;
  text: string;
  children: React.ReactNode;
}

export function FeatureTip({ id, text, children }: Props) {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("flowly_tip_" + id);
  });

  const dismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem("flowly_tip_" + id, "1");
  }, [id]);

  return (
    <div className="relative">
      {children}
      {show && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="group/tip relative">
            <button
              onClick={dismiss}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow-md hover:bg-violet-700"
            >
              !
            </button>
            <div className="absolute top-6 right-0 z-20 w-52 rounded-lg bg-zinc-900 p-3 text-xs text-white opacity-0 shadow-xl transition group-hover/tip:opacity-100">
              <p>{text}</p>
              <button onClick={dismiss} className="mt-2 text-[10px] text-zinc-400 hover:text-white">
                Hiểu rồi, ẩn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
