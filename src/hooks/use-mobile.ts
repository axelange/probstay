import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * matchMedia is an external store, so it's read through
 * useSyncExternalStore rather than mirrored into state from an effect.
 * The shadcn default does the latter, which renders twice on mount and
 * trips react-hooks/set-state-in-effect.
 *
 * getServerSnapshot returns false: there is no viewport on the server,
 * and React uses this value for the hydrating render before swapping to
 * the real one, so no mismatch.
 */
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
