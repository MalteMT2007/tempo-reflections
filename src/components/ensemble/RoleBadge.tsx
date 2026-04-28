import { Badge } from "@/components/ui/badge";
import { EnsembleRole } from "@/lib/ensembles";

export function RoleBadge({ role, sectionName }: { role: EnsembleRole; sectionName?: string | null }) {
  if (role === "admin") return <Badge className="bg-ink text-paper hover:bg-ink">Admin</Badge>;
  if (role === "section_member") return <Badge variant="outline" className="border-ink/40">{sectionName || "Section"}</Badge>;
  return <Badge variant="secondary">Member</Badge>;
}
