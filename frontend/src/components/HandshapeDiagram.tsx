import React from "react";
import { Handshape, FingerState, handshapeFor } from "../data/handshapes";

/**
 * Draws a schematic hand for a fingerspelled letter or digit.
 *
 * Deliberately schematic, and says so: it shows which fingers are extended,
 * curled, folded or tucked and where the thumb sits. It does NOT claim to be
 * a photograph of a signer, and it cannot convey motion, wrist orientation or
 * the facial grammar that is part of real signing. Those are surfaced as text
 * captions (`motion`) rather than faked in the drawing.
 *
 * Everything is derived deterministically from handshapes.ts - no model, no
 * generated imagery - so a diagram can never "hallucinate" a wrong sign. The
 * worst case is that it is coarse, not that it is false.
 */

// How far up the hand each finger reaches per state, as a fraction of its
// full length. 'tucked' is drawn short AND behind the palm.
const EXTENSION: Record<FingerState, number> = {
  extended: 1,
  curled: 0.45,
  folded: 0.16,
  tucked: 0.1,
};

const FINGER_LABELS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

interface FingerGeometry {
  x: number;
  baseY: number;
  length: number;
  width: number;
}

// index, middle, ring, pinky - thumb is drawn separately since it hinges
// sideways off the palm rather than straight up.
const FINGERS: FingerGeometry[] = [
  { x: 34, baseY: 62, length: 40, width: 9 },
  { x: 47, baseY: 58, length: 46, width: 9 },
  { x: 60, baseY: 60, length: 42, width: 9 },
  { x: 72, baseY: 65, length: 33, width: 8 },
];

export const HandshapeDiagram: React.FC<{
  /** A letter A-Z or digit 1-10. */
  term: string;
  size?: number;
  className?: string;
  /** Render the motion caption underneath (default true). */
  showMotion?: boolean;
}> = ({ term, size = 96, className = "", showMotion = true }) => {
  const shape: Handshape | null = handshapeFor(term);
  if (!shape) return null;

  const [thumbState, ...fingerStates] = shape.fingers;
  const spreadPush = shape.spread ? 4 : 0;

  return (
    <figure className={`inline-flex flex-col items-center gap-1 m-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Schematic hand diagram for ${term}`}
        className="shrink-0"
      >
        {/* palm */}
        <rect x="30" y="58" width="48" height="30" rx="10" className="fill-emerald-100 stroke-emerald-700" strokeWidth="2.5" />
        {/* wrist */}
        <rect x="42" y="86" width="24" height="10" rx="4" className="fill-emerald-100 stroke-emerald-700" strokeWidth="2.5" />

        {/* thumb - hinges out to the left of the palm */}
        {(() => {
          const extended = thumbState === "extended";
          const up = shape.thumb === "up";
          if (up) {
            return (
              <rect x="20" y="38" width="9" height="24" rx="4.5"
                className="fill-emerald-200 stroke-emerald-700" strokeWidth="2.5" />
            );
          }
          if (shape.thumb === "across") {
            // laid horizontally over the closed fingers
            return (
              <rect x="30" y="60" width="30" height="8" rx="4"
                className="fill-emerald-200 stroke-emerald-700" strokeWidth="2.5" />
            );
          }
          if (shape.thumb === "front") {
            return (
              <rect x="34" y="56" width="26" height="8" rx="4"
                className="fill-emerald-300 stroke-emerald-800" strokeWidth="2.5" />
            );
          }
          // 'side' or a touch-* variant: angled away from the palm
          const len = extended ? 26 : 15;
          return (
            <rect x={26 - (extended ? 8 : 0)} y={70 - len} width="9" height={len} rx="4.5"
              transform={`rotate(-28 30 ${70 - len / 2})`}
              className="fill-emerald-200 stroke-emerald-700" strokeWidth="2.5" />
          );
        })()}

        {/* four fingers */}
        {FINGERS.map((f, i) => {
          const state = fingerStates[i];
          const reach = EXTENSION[state];
          const height = Math.max(8, f.length * reach);
          const y = f.baseY - height;
          // spread fans the outer fingers away from the middle
          const dx = spreadPush * (i - 1.5) * 0.9;
          return (
            <rect
              key={FINGER_LABELS[i + 1]}
              x={f.x + dx}
              y={y}
              width={f.width}
              height={height}
              rx={f.width / 2}
              className={
                state === "tucked"
                  ? "fill-emerald-50 stroke-emerald-400"
                  : state === "folded"
                    ? "fill-emerald-200 stroke-emerald-700"
                    : "fill-emerald-100 stroke-emerald-700"
              }
              strokeWidth="2.5"
              strokeDasharray={state === "tucked" ? "3 2" : undefined}
            />
          );
        })}

        {/* a small ring marks a thumb-to-fingertip contact (F, O, 6-9) */}
        {shape.thumb.startsWith("touch") && (() => {
          const target = { touchIndex: 0, touchMiddle: 1, touchRing: 2, touchPinky: 3 }[
            shape.thumb as "touchIndex" | "touchMiddle" | "touchRing" | "touchPinky"
          ];
          const f = FINGERS[target];
          const reach = EXTENSION[fingerStates[target]];
          return (
            <circle
              cx={f.x + f.width / 2}
              cy={f.baseY - f.length * reach + 3}
              r="6"
              className="fill-none stroke-amber-500"
              strokeWidth="2.5"
            />
          );
        })()}
      </svg>

      {showMotion && shape.motion && (
        <figcaption className="text-[10px] text-slate-500 text-center max-w-[10rem] leading-tight">
          ↻ {shape.motion}
        </figcaption>
      )}
    </figure>
  );
};

export default HandshapeDiagram;
