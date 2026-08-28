import type { CampaignStatus, ApplicationStatus } from "@/lib/types";

// Single source of truth for status coloring — consistent across brand,
// creator, and admin views. Semantic palette: success=green, warning=amber,
// danger=red, neutral=ink.
const TONE: Record<string, string> = {
  draft: "bg-ink/10 text-ink-soft",
  live: "bg-success/15 text-success",
  closed: "bg-ink/10 text-ink-2",
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
};

export function StatusBadge({
  status,
}: {
  status: CampaignStatus | ApplicationStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TONE[status]}`}
    >
      {status}
    </span>
  );
}
