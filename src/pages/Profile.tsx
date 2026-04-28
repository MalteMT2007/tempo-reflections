import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Upload, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  checkUsernameAvailable,
  validateUsername,
  DbProfile,
} from "@/lib/api";
import { computeStats, formatMinutes, loadSessions } from "@/lib/storage";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(true);
  const [formatErr, setFormatErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    username: "",
    display_name: "",
    instrument: "",
    genre_label: "",
    bio: "",
    avatar_url: "" as string | null | "",
  });
  const [originalUsername, setOriginalUsername] = useState("");

  const stats = computeStats(loadSessions());

  useEffect(() => {
    document.title = "Your profile — Practice";
    if (!user) return;
    getProfile(user.id)
      .then((p) => {
        if (p) {
          setProfile(p);
          setOriginalUsername(p.username);
          setForm({
            username: p.username,
            display_name: p.display_name ?? "",
            instrument: p.instrument ?? "",
            genre_label: p.genre_label ?? p.genre ?? "",
            bio: p.bio ?? "",
            avatar_url: p.avatar_url ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Live username check
  useEffect(() => {
    const v = form.username.trim().toLowerCase();
    if (v === originalUsername) { setAvailable(true); setFormatErr(null); return; }
    const fmt = validateUsername(v);
    setFormatErr(v ? fmt : null);
    if (fmt) { setAvailable(null); return; }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(v);
        setAvailable(ok);
      } catch { setAvailable(null); }
      finally { setChecking(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [form.username, originalUsername]);

  const onPickFile = async (f: File | null) => {
    if (!f || !user) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, f);
      setForm((s) => ({ ...s, avatar_url: url }));
    } catch (e: any) {
      toast.error(e.message ?? "Could not upload");
    } finally { setUploading(false); }
  };

  const canSave =
    !!form.display_name.trim() &&
    !!form.username.trim() &&
    !formatErr &&
    available !== false &&
    !checking;

  const save = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: form.username.trim().toLowerCase(),
        display_name: form.display_name.trim() || null,
        instrument: form.instrument.trim() || null,
        genre_label: form.genre_label.trim() || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url || null,
        onboarding_complete: true,
      }, { onConflict: "id" });
      if (error) throw error;
      setOriginalUsername(form.username.trim().toLowerCase());
      toast.success("Profile saved.");
    } catch (e: any) {
      const msg = String(e.message ?? "");
      if (msg.includes("profiles_username_key") || msg.toLowerCase().includes("duplicate")) {
        toast.error("Username already taken");
        setAvailable(false);
      } else {
        toast.error(msg || "Could not save");
      }
    } finally { setSaving(false); }
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

        <header className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-20 w-20 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center hover:border-ink/40 transition shrink-0"
          >
            {form.avatar_url ? (
              <img src={form.avatar_url as string} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-5 w-5 text-ink-soft" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-paper" />
              </div>
            )}
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-1">Profile</p>
            <h1 className="text-[28px] md:text-[34px] font-semibold tracking-tight truncate">{form.display_name || `@${form.username}`}</h1>
            <p className="font-serif italic text-ink-soft truncate">@{form.username}</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </header>

        <section className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="This week" value={formatMinutes(stats.weekSec)} />
          <Stat label="Today" value={formatMinutes(stats.todaySec)} />
          <Stat label="Streak" value={`${stats.streak}d`} />
        </section>

        <section className="space-y-5">
          <Field label="Display name">
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              maxLength={60} className={inputCls} />
          </Field>

          <Field label="Username">
            <div className="relative">
              <span className="absolute left-0 top-2 font-serif text-lg text-ink-soft">@</span>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                maxLength={20}
                className={`${inputCls} pl-5 pr-8`}
              />
              <span className="absolute right-0 top-2.5">
                {checking && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />}
                {!checking && available === true && <Check className="h-4 w-4 text-emerald-600" />}
                {!checking && (available === false || formatErr) && <X className="h-4 w-4 text-destructive" />}
              </span>
            </div>
            <p className="text-[11px] mt-1.5 font-serif italic">
              {formatErr ? <span className="text-destructive">{formatErr}</span>
                : available === false ? <span className="text-destructive">Username already taken</span>
                : <span className="text-muted-foreground">Lowercase letters, numbers, underscore. 3–20 chars.</span>}
            </p>
          </Field>

          <Field label="Instrument">
            <input value={form.instrument} onChange={(e) => setForm({ ...form, instrument: e.target.value })}
              className={inputCls} />
          </Field>

          <Field label="Genre">
            <input value={form.genre_label}
              onChange={(e) => setForm({ ...form, genre_label: e.target.value })}
              placeholder="Classical, jazz, your own…" className={inputCls} />
          </Field>

          <Field label="Bio">
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3} maxLength={280} placeholder="A line or two about your practice."
              className={`${inputCls} resize-none font-serif`} />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{form.bio.length}/280</p>
          </Field>
        </section>

        <button
          onClick={save}
          disabled={saving || !canSave}
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
