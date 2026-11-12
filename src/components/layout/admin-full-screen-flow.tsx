"use client";

import * as React from "react";

/**
 * Lets a full-screen flow (for example the quote builder) tell `AdminShell` to hide the
 * bottom bar, desktop rail and "Más" sheet while it is open. `AdminShell` owns the state;
 * the flow only reports whether it is active.
 */
export const AdminFullScreenFlowContext = React.createContext<((active: boolean) => void) | null>(null);

export function useAdminFullScreenFlow(active: boolean) {
  const setFlowActive = React.useContext(AdminFullScreenFlowContext);

  React.useEffect(() => {
    if (!active || !setFlowActive) return;
    setFlowActive(true);
    return () => setFlowActive(false);
  }, [active, setFlowActive]);
}
