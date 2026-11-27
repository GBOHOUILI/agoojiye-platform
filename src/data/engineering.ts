import type { Essai, Proto } from "@/types";
import { ESSAIS, PROTOS } from "./seed";
import { shiftValue } from "./rebase";

// Read-only engineering data are not stored: they are served shifted by the offset stored with the
// demo document, so they stay on the same time base as the stored anomalies and observations.
let last: { offset: number; value: { prototypes: Proto[]; tests: Essai[] } } | undefined;
export function engineeringData(offset: number) {
  if (last?.offset === offset) return last.value;
  const value = {
    prototypes: PROTOS.map(p => ({ ...p, date: shiftValue(p.date, offset) })),
    tests: ESSAIS.map(e => ({ ...e, date: shiftValue(e.date, offset) })),
  };
  last = { offset, value };
  return value;
}
