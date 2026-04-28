import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { searchProfiles } from "@/lib/api";
import { createInvite, EnsembleRole, Section } from "@/lib/ensembles";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ensembleId: string;
  sections: Section[];
  onCreated?: () => void;
};

export default function InviteMemberDialog({ open, onOpenChange, ensembleId, sections, onCreated }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"colleague" | "email">("colleague");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<{ id: string; username: string; display_name: string | null } | null>(null);
  const [role, setRole] = useState<EnsembleRole>("member");
  const [sectionId, setSectionId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail(""); setQuery(""); setResults([]); setPicked(null);
      setRole("member"); setSectionId(""); setTab("colleague");
    }
  }, [open]);

  useEffect(() => {
    let alive = true;
    if (tab !== "colleague" || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await searchProfiles(query, user?.id);
        if (alive) setResults(r);
      } catch {}
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [query, tab, user?.id]);

  const canSubmit = (tab === "email" ? /\S+@\S+\.\S+/.test(email) : !!picked)
    && (role !== "section_member" || !!sectionId);

  const submit = async () => {
    setBusy(true);
    try {
      await createInvite({
        ensembleId,
        email: tab === "email" ? email.trim().toLowerCase() : null,
        inviteeUserId: tab === "colleague" ? picked!.id : null,
        role,
        sectionId: role === "section_member" ? sectionId : null,
      });
      toast.success("Invite sent");
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Could not invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Invite to ensemble</DialogTitle>
          <DialogDescription>Add a colleague or send an email invitation.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="colleague">From colleagues</TabsTrigger>
            <TabsTrigger value="email">By email</TabsTrigger>
          </TabsList>

          <TabsContent value="colleague" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or username" value={query} onChange={(e) => { setQuery(e.target.value); setPicked(null); }} />
            </div>
            {results.length > 0 && !picked && (
              <ul className="border border-border rounded-md max-h-44 overflow-auto">
                {results.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => { setPicked(r); setQuery(r.display_name || r.username); setResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                      <div className="font-medium">{r.display_name || r.username}</div>
                      <div className="text-xs text-muted-foreground">@{r.username}{r.instrument ? ` · ${r.instrument}` : ""}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {picked && <p className="text-xs text-muted-foreground">Selected: <span className="text-ink">{picked.display_name || picked.username}</span></p>}
          </TabsContent>

          <TabsContent value="email">
            <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-2">They'll see this invite when they sign in with this email.</p>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(["admin", "member", "section_member"] as EnsembleRole[]).map((r) => (
                <button key={r} onClick={() => setRole(r)}
                  className={`text-xs py-2 rounded-md border transition ${role === r ? "border-ink bg-ink text-paper" : "border-border text-ink-soft hover:text-ink"}`}>
                  {r === "admin" ? "Admin" : r === "member" ? "Member" : "Section"}
                </button>
              ))}
            </div>
          </div>
          {role === "section_member" && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Section</label>
              {sections.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No sections yet — create one in Settings first.</p>
              ) : (
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm">
                  <option value="">Choose a section…</option>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="text-sm text-ink-soft hover:text-ink px-3 py-2">Cancel</button>
          <button onClick={submit} disabled={!canSubmit || busy}
            className="bg-ink text-paper rounded-full px-5 py-2 text-sm disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
