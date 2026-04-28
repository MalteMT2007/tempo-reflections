import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, Upload, X } from "lucide-react";
import {
  checkUsernameAvailable,
  uploadAvatar,
  validateUsername,
  updateProfile,
  DbProfile,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = { onComplete: (p: DbProfile) => void; initial?: Partial<DbProfile> };

export const ProfileOnboarding = ({ onComplete, initial }: Props) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [formatErr, setFormatErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Live username check
  useEffect(() => {
    const v = username.trim().toLowerCase();
    if (v === (initial?.username ?? "")) {
      setAvailable(true); setFormatErr(null); return;
    }
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
  }, [username, initial?.username]);

  const onPickFile = async (f: File | null) => {
    if (!f || !user) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, f);
      setAvatarUrl(url);
    } catch (e: any) {
      toast.error(e.message ?? "Kunde inte ladda upp");
    } finally { setUploading(false); }
  };

  const canSubmit =
    !!displayName.trim() &&
    available === true &&
    !formatErr &&
    !checking &&
    !uploading;

  const submit = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);
    try {
      const uname = username.trim().toLowerCase();
      await updateProfile(user.id, {
        username: uname,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        onboarding_complete: true,
      } as any);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) onComplete(data as DbProfile);
      toast.success("Välkommen!");
    } catch (e: any) {
      const msg = String(e.message ?? "");
      if (msg.includes("profiles_username_key") || msg.toLowerCase().includes("duplicate")) {
        toast.error("Username already taken");
        setAvailable(false);
      } else {
        toast.error(msg || "Något gick fel");
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-12 pb-16 min-h-screen">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Welcome</p>
          <h1 className="font-serif text-4xl font-light text-ink leading-tight">Set up your profile</h1>
          <p className="font-serif italic text-ink-soft mt-2">Other musicians will see this.</p>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-20 w-20 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center hover:border-ink/40 transition shrink-0"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-5 w-5 text-ink-soft" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-paper" />
              </div>
            )}
          </button>
          <div className="text-sm">
            <p className="font-serif text-ink">Profile picture</p>
            <p className="font-serif italic text-xs text-ink-soft">JPG or PNG, up to 5 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-6">
          <Field label="Display name">
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className={inputCls}
            />
          </Field>

          <Field label="Username">
            <div className="relative">
              <span className="absolute left-0 top-2 font-serif text-lg text-ink-soft">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="yourname"
                maxLength={20}
                className={`${inputCls} pl-5 pr-8`}
              />
              <span className="absolute right-0 top-2.5">
                {checking && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />}
                {!checking && available === true && username && (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
                {!checking && (available === false || formatErr) && username && (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </span>
            </div>
            <p className="text-[11px] mt-1.5 font-serif italic">
              {formatErr ? <span className="text-destructive">{formatErr}</span>
                : available === false ? <span className="text-destructive">Username already taken</span>
                : available === true && username ? <span className="text-emerald-700">Available</span>
                : <span className="text-muted-foreground">Lowercase letters, numbers, underscore. 3–20 chars.</span>}
            </p>
          </Field>

          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two about you and your music."
              rows={3}
              maxLength={280}
              className={`${inputCls} resize-none font-serif`}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{bio.length}/280</p>
          </Field>
        </div>

        <button
          disabled={!canSubmit || saving}
          onClick={submit}
          className="mt-8 w-full bg-ink text-paper rounded-full py-4 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition shadow-elev"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enter your studio <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
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
