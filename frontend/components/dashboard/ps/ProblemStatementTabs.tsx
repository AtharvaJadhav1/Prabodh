"use client";

import RepositoryBrowser from "./RepositoryBrowser";
import type { CatalogPreference } from "./PreferenceSlotsPanel";

type Props = {
  targetRank: number;
  usedPsIds: string[];
  onPick: (pref: CatalogPreference) => void;
};

/** Catalog-only picker — Student Innovation / manual entry removed. */
export default function ProblemStatementTabs({ targetRank, usedPsIds, onPick }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <RepositoryBrowser targetRank={targetRank} usedPsIds={usedPsIds} onPick={onPick} />
    </div>
  );
}
