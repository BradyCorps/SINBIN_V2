"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const STAGE_WIDTH = 1366;
export const STAGE_HEIGHT = 768;

export function StageScaler({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const bounds = host.getBoundingClientRect();
      setScale(
        Math.min(bounds.width / STAGE_WIDTH, bounds.height / STAGE_HEIGHT),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className={`stage-scaler ${className}`}
      data-stage-scale={scale.toFixed(4)}
    >
      <div
        className="stage-scaler__canvas"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
