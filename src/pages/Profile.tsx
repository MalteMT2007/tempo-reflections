import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, updateProfile, DbProfile } from "@/lib/api";
import { computeStats, formatMinutes, loadSessions } from "@/lib/storage";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    instrument: "",
    genre: "",
    genre_label: "",
    bio: "",
  });

  const stats = computeStats(loadSessions());

  useEffect(() => {
    document.title = "Your profile — Practice";
    if (!user) return;
    getProfile(user.id)
      .then((p) => {
        if (p) {
          setProfile(p);
          setForm({
            username: p.username,
            display_name: p.display_name ?? "",
            instrument: p.instrument ?? "",
            genre: p.genre ?? "",
            genre_label: p.genre_label ?? "",
            bio: p.bio ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        username: form.username.trim(),
        display_name: form.display_name.trim() || null,
        instrument: form.instrument.trim() || null,
        genre: form.genre.trim() || null,
        genre_label: form.genre_label.trim() || null,
        bio: form.bio.trim() || null,
      });
      toast.success("Profile saved.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>;
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-md mx-auto px-6 pt-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-ink-soft hover:text-ink mb-6">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Profile</p>
          <h1 className="font-serif text-4xl font-light text-ink">{form.display_name || `@${form.username}`}</h1>
          <p className="font-serif italic text-ink-soft mt-1">@{form.username}</p>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="Total" value={formatMinutes(stats.weekSec + (stats.todaySec - stats.todaySec))} />
          <Stat label="This week" value={formatMinutes(stats.weekSec)} />
          <Stat label="Streak" value={`${stats.streak}d`} />
        </section>

        <section className="space-y-5">
          <Field label="Username">
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="Display name">
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="How others see you" className={inputCls} />
          </Field>
          <Field label="Instrument">
            <input value={form.instrument} onChange={(e) => setForm({ ...form, instrument: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="Genre">
            <input value={form.genre_label || form.genre}
              onChange={(e) => setForm({ ...form, genre_label: e.target.value })}
              placeholder="Classical, jazz, your own…" className={inputCls} />
          </Field>
          <Field label="About">
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3} placeholder="A line or two about your practice."
              className={`${inputCls} resize-none font-serif`} />
          </Field>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="mt-8 w-full bg-ink text-paper rounded-full py-3 flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition shadow-elev text-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save changes</>}
        </button>
      </div>
    </main>
  );
};

const inputCls =
  "w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/60 placeholder:italic transition";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{label}</p>
    {children}
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-card/50 p-4">
    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</p>
    <p className="font-serif text-2xl font-light text-ink tabular leading-none">{value}</p>
  </div>
);

export default Profile;
