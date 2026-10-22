"use client";

import { useEffect, useRef, useState } from "react";

// Compteur animé (ease-out) : anime depuis 0 (ou from) vers `target` au montage.
export function useCountUp(target: number | null, duration = 900, from = 0) {
  const [value, setValue] = useState(from);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target == null) {
      setValue(from);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

// Retourne la valeur finale une fois l'animation terminée (pour affichage formaté).
export function useIsCountDone(target: number | null, duration = 900) {
  const value = useCountUp(target, duration);
  const done = target != null && value >= target;
  return done;
}
