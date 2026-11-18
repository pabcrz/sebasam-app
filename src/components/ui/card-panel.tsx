"use client";

import * as React from "react";

export type CardPanelKind = "preview" | "manage";

type CardPanelState = { id: string; kind: CardPanelKind } | null;

const CardPanelContext = React.createContext<{
  state: CardPanelState;
  setState: React.Dispatch<React.SetStateAction<CardPanelState>>;
} | null>(null);

/**
 * One open card panel per list. Opening a card's panel moves the open panel
 * there, so the previous card closes and the new one is marked.
 */
export function CardPanelProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CardPanelState>(null);
  const value = React.useMemo(() => ({ state, setState }), [state]);

  return <CardPanelContext.Provider value={value}>{children}</CardPanelContext.Provider>;
}

export type CardPanel = {
  /** A panel of this card is open, so the card carries the selected mark. */
  selected: boolean;
  isOpen: (kind: CardPanelKind) => boolean;
  open: (kind: CardPanelKind) => void;
  /** Clears only the matching panel; a stale close never clears another card. */
  close: (kind: CardPanelKind) => void;
};

/** Open state of one card's panel. Without a provider, the card keeps its own state. */
export function useCardPanel(id: string): CardPanel {
  const shared = React.useContext(CardPanelContext);
  const [localState, setLocalState] = React.useState<CardPanelState>(null);
  const state = shared ? shared.state : localState;
  const setState = shared ? shared.setState : setLocalState;
  const currentKind = state?.id === id ? state.kind : null;

  return {
    selected: currentKind !== null,
    isOpen: (kind) => currentKind === kind,
    open: (kind) => setState({ id, kind }),
    close: (kind) => setState((previous) => (previous?.id === id && previous.kind === kind ? null : previous)),
  };
}
