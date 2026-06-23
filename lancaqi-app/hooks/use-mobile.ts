import * as React from "react"

const MOBILE_BREAKPOINT = 768

// `useSyncExternalStore` lê o media query sem setState síncrono dentro de
// efeito (regra react-hooks do Next 16) e é seguro no SSR via o getServerSnapshot.
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  )
}
