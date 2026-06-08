import React, { useRef } from "react";
import { Check } from "lucide-react";

export function MinusIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

export function CompactRulerControl({
  value,
  min,
  max,
  onChange,
  onReset,
  onClose,
  sensitivity = 2,
  label = "Value",
}: {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  onReset: () => void;
  onClose?: () => void;
  sensitivity?: number;
  label?: string;
  step?: number;
  unit?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startValue.current = value;
    document.body.style.cursor = "ew-resize";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - startX.current;
    let newVal = startValue.current + deltaX * sensitivity;
    newVal = Math.max(min, Math.min(max, newVal));
    onChange(Math.round(newVal));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    document.body.style.cursor = "";
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="flex flex-col w-full select-none justify-center h-full max-h-[60px] pb-1.5 font-sans">
      <div className="flex justify-between items-center mb-1 pl-1 pr-0.5">
        <span className="text-[10px] font-semibold text-white/90">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white font-mono w-8 text-right mr-0.5">
            {Math.round(value)}
          </span>
          <button
            className="text-[8.5px] w-4.5 h-4.5 flex items-center justify-center bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            onClick={onReset}
          >
            R
          </button>
          <div className="w-px h-3.5 bg-zinc-700 mx-0.5"></div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white ml-0.5"
          >
            <Check size={14} />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-8 mx-0 rounded-lg bg-zinc-950/75 relative overflow-hidden cursor-ew-resize border border-white/5 active:border-white/10 transition-colors flex items-end pb-1.5"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute bottom-1.5 left-0 right-0 h-[1.5px] bg-white/10 pointer-events-none" />
        <div
          className="absolute inset-y-0 left-0 right-0 pointer-events-none opacity-40.0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px),
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "32px 10px, 8px 6px",
            backgroundPosition: `calc(50% + ${-value / sensitivity}px) bottom, calc(50% + ${-value / sensitivity}px) bottom`,
            backgroundRepeat: "repeat-x",
          }}
        />
        <div className="absolute top-0.5 bottom-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10 w-4">
          <div className="w-[11px] h-[13px] bg-white rounded-t-full rounded-b-[2px] shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
          <div className="w-[1.5px] flex-1 bg-white shadow-[0_0_2px_rgba(255,255,255,0.5)]" />
        </div>
      </div>
    </div>
  );
}

const SPEED_VALUES = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5,
  1.6, 1.7, 1.8, 1.9, 2.0, 3.0, 4.0, 5.0, 10.0, 20.0, 50.0,
];

function valToPos(val: number) {
  for (let i = 0; i < SPEED_VALUES.length - 1; i++) {
    if (val >= SPEED_VALUES[i] && val <= SPEED_VALUES[i + 1]) {
      const ratio =
        (val - SPEED_VALUES[i]) / (SPEED_VALUES[i + 1] - SPEED_VALUES[i]);
      return i + ratio;
    }
  }
  if (val <= SPEED_VALUES[0]) return 0;
  return SPEED_VALUES.length - 1;
}

function posToVal(pos: number) {
  if (pos <= 0) return SPEED_VALUES[0];
  if (pos >= SPEED_VALUES.length - 1)
    return SPEED_VALUES[SPEED_VALUES.length - 1];
  const i = Math.floor(pos);
  const ratio = pos - i;
  return SPEED_VALUES[i] + ratio * (SPEED_VALUES[i + 1] - SPEED_VALUES[i]);
}

export function SpeedRulerControl({
  value,
  onChange,
  onReset,
  onClose,
}: {
  value: number;
  onChange: (val: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startPos = useRef(0);

  const TICK_SPACING = 30;
  const VIRTUAL_POS = valToPos(value);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startPos.current = valToPos(value);
    document.body.style.cursor = "ew-resize";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - startX.current;

    let newPos = startPos.current - deltaX / TICK_SPACING;
    let newVal = posToVal(newPos);

    const nearestIndex = Math.round(newPos);
    if (Math.abs(newPos - nearestIndex) < 0.1) {
      newVal =
        SPEED_VALUES[
          Math.max(0, Math.min(SPEED_VALUES.length - 1, nearestIndex))
        ];
    } else {
      newVal = Number(newVal.toFixed(2));
    }

    onChange(newVal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    document.body.style.cursor = "";
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="flex flex-col w-full select-none mt-0.5 pb-1.5 font-sans">
      <div className="flex justify-between items-center mb-1.5 pl-0.5 pr-0.5">
        <span className="text-[10px] font-semibold text-white/90">Speed</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white font-mono w-10 text-right mr-1">
            {value}x
          </span>
          <button
            className="text-[8.5px] w-4.5 h-4.5 flex items-center justify-center bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            onClick={onReset}
          >
            R
          </button>
          <div className="w-px h-3.5 bg-zinc-700 mx-0.5"></div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white ml-0.5"
          >
            <Check size={14} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-[38px] mx-0 relative overflow-hidden cursor-ew-resize touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="absolute top-0 bottom-0 left-1/2"
          style={{ transform: `translateX(${-VIRTUAL_POS * TICK_SPACING}px)` }}
        >
          {SPEED_VALUES.map((speed, i) => {
            const isMajor =
              speed === 1.0 ||
              speed === 2.0 ||
              speed === 5.0 ||
              speed === 10.0 ||
              speed === 20.0 ||
              speed === 50.0 ||
              speed === 0.1 ||
              speed === 0.5;
            const isCurrent = Math.round(VIRTUAL_POS) === i;

            return (
              <div
                key={i}
                className="absolute flex flex-col items-center justify-center pointer-events-none h-full"
                style={{
                  left: `${i * TICK_SPACING}px`,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  className={`w-[2px] rounded-full transition-all duration-150 ${isCurrent ? "h-[18px] bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" : isMajor ? "h-[12px] bg-white/60" : "h-[6px] bg-white/20"}`}
                />
                {isMajor && (
                  <span
                    className={`absolute bottom-0 text-[8px] translate-y-[9px] ${isCurrent ? "text-yellow-400 font-bold" : "text-zinc-500"}`}
                  >
                    {speed}x
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[9px] w-[2px] h-[22px] bg-white rounded-full pointer-events-none shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
      </div>
    </div>
  );
}
