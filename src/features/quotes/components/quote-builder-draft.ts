import type { QuoteBuilderState } from "./quote-builder-state";
import type { CustomerOption } from "./quote-builder";

export type QuoteBuilderDraft = { state: QuoteBuilderState; customer: CustomerOption | null };

export const quoteDraftKey = (quoteId?: string) => `sebasam:quote-draft:${quoteId ?? "new"}`;

// shortcut: one draft per quote (or one for "new") in this browser's localStorage, no server copy; upgrade if drafts must follow the user across devices.
export function loadQuoteDraft(key: string): QuoteBuilderDraft | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as QuoteBuilderDraft | null;
    return parsed && Array.isArray(parsed.state?.sections) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveQuoteDraft(key: string, draft: QuoteBuilderDraft) {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage blocked or full: the draft is a convenience, closing still works.
  }
}

export function clearQuoteDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
