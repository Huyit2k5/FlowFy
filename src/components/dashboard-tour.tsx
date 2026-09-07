"use client";

import { useCallback } from "react";
import GuidedTour from "@/components/guided-tour";

export default function DashboardTour() {
  const handleComplete = useCallback(() => {
    localStorage.setItem("flowly_tour_completed", "1");
  }, []);

  return <GuidedTour onComplete={handleComplete} />;
}
