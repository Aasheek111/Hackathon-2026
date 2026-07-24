import React, { useState } from "react";
import { handshapeFor } from "../data/handshapes";

/**
 * Renders the committed handshape asset for a fingerspelled letter or digit
 * (`frontend/public/signs/asl/<TERM>.svg`, produced by
 * scripts/generate-sign-assets.mjs).
 *
 * Files rather than inline SVG so the browser caches them once and reuses
 * them across the ~36-card practice grid, and so a licensed sign-media set
 * could later be dropped in by replacing files instead of editing components.
 *
 * Falls back to the term itself if the asset is missing or fails to load -
 * a sign the learner can't see is better than an empty box with no clue what
 * it was meant to be.
 */
export const SignSymbol: React.FC<{
  /** A letter A-Z or a digit 1-10. */
  term: string;
  size?: number;
  className?: string;
  /** Show the movement caption for signs a static image can't convey (J, Z, 10). */
  showMotion?: boolean;
}> = ({ term, size = 96, className = "", showMotion = true }) => {
  const [failed, setFailed] = useState(false);
  const key = term.trim().toUpperCase();
  const shape = handshapeFor(key);

  // No handshape data means this is a word sign (movement-based), not a
  // fingerspelled character - those have no static asset by design.
  if (!shape || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-label={`Sign for ${term}`}
      >
        {key}
      </span>
    );
  }

  return (
    <figure className={`inline-flex flex-col items-center gap-1 m-0 ${className}`}>
      <img
        src={`/signs/asl/${encodeURIComponent(key)}.svg`}
        alt={`American Sign Language handshape for ${key}`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="select-none"
        draggable={false}
      />
      {showMotion && shape.motion && (
        <figcaption className="text-[10px] text-slate-600 text-center max-w-[10rem] leading-tight">
          ↻ {shape.motion}
        </figcaption>
      )}
    </figure>
  );
};

export default SignSymbol;
