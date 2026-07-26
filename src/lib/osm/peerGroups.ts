// Comparison groups for the /analyse page.
//
// Regions are not directly comparable — a dense inner-city Bezirk and a village
// are different animals — so ranking and rating happen only within a group,
// never across it. The split follows the administrative boundary: Karlsruhe's
// own districts (AL9/AL10) on one side, the surrounding municipalities (AL8) on
// the other. It is the division readers already have in their heads, and the
// admin level is a hard fact on every region, so nothing here rests on
// thresholds that would need defending.

import { RegionInfo } from "@/models/region";

export type PeerGroup = "stadt" | "umland";

export const PEER_GROUPS: PeerGroup[] = ["stadt", "umland"];

export const PEER_GROUP_LABEL: Record<PeerGroup, string> = {
  stadt: "Karlsruher Stadtteile",
  umland: "Umland-Gemeinden",
};

/** One-line description of who is in the group, shown under the chips. */
export const PEER_GROUP_HINT: Record<PeerGroup, string> = {
  stadt: "Stadtbezirke und Stadtteile innerhalb der Stadtgrenze",
  umland: "die Gemeinden rundherum",
};

/** AL9/AL10 tile Karlsruhe city; AL8 are the surrounding municipalities. */
export function peerGroupOf(info: RegionInfo): PeerGroup {
  return info.adminLevel === 8 ? "umland" : "stadt";
}

/**
 * Lookup by region name for the analyses that only see parkings, which carry a
 * region name but none of the reference data behind it.
 */
export function buildPeerGroups(regions: RegionInfo[]): Map<string, PeerGroup> {
  return new Map(regions.map((info) => [info.name, peerGroupOf(info)]));
}
