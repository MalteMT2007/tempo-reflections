import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Loader2, Upload, X } from "lucide-react";
import {
  checkUsernameAvailable,
  uploadAvatar,
  validateUsername,
  DbProfile,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = { onComplete: (p: DbProfile) => void; initial?: Partial<DbProfile> };

type Step = 0 | 1 | 2 | 3;

export const ProfileOnboarding = ({ onComplete, initial }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(0);
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
    if (!v) { setAvailable(null); setFormatErr(null); return; }
    if (v === (initial?.username ?? "")) {
      setAvailable(true); setFormatErr(null); return;
    }
    const fmt = validateUsername(v);
    setFormatErr(fmt);
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
      toast.error(e.message ?? "Could not upload");
    } finally { setUploading(false); }
  };

  const stepValid = (s: Step): boolean => {
    if (s === 0) return !!displayName.trim();
    if (s === 1) return !!username.trim() && available === true && !formatErr && !checking;
    if (s === 2) return true; // bio optional
    if (s === 3) return true; // avatar optional
    return false;
  };

  const next = () => {
    if (!stepValid(step)) return;
    if (step < 3) setStep((step + 1) as Step);
    else submit();
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const uname = username.trim().toLowerCase();
      // Upsert ensures the row exists even if the trigger never ran
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: uname,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        onboarding_complete: true,
      }, { onConflict: "id" });
      if (error) throw error;

      const { data, error: selErr } = await supabase
        .from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (selErr) throw selErr;
      if (!data) throw new Error("Could not load profile after save");

      toast.success("Welcome!");
      onComplete(data as DbProfile);
    } catch (e: any) {
      const msg = String(e.message ?? "");
      if (msg.includes("profiles_username_key") || msg.toLowerCase().includes("duplicate")) {
        toast.error("Username already taken");
        setAvailable(false);
        setStep(1);
      } else {
        toast.error(msg || "Something went wrong");
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-12 pb-16 min-h-screen flex flex-col">
        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-ink" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">
            Step {step + 1} of 4
          </p>
          <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none">
            {step === 0 && "What should we call you?"}
            {step === 1 && "Pick a username."}
            {step === 2 && "Tell us about yourself."}
            {step === 3 && "Add a profile picture."}
          </h1>
          <p className="font-serif italic text-ink-soft mt-2">
            {step === 0 && "The name other musicians will see."}
            {step === 1 && "Your unique handle, like @yourname."}
            {step === 2 && "A line or two about your music. Optional."}
            {step === 3 && "Optional, but it makes your profile feel like home."}
          </p>
        </div>

        <div className="flex-1">
          {step === 0 && (
            <div className="animate-fade-in">
              <input
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && stepValid(0)) next(); }}
                placeholder="Your name"
                maxLength={60}
                className={inputCls}
              />
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in">
              <div className="relative">
                <span className="absolute left-0 top-2 font-serif text-lg text-ink-soft">@</span>
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter" && stepValid(1)) next(); }}
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
              <p className="text-[11px] mt-2 font-serif italic">
                {formatErr ? <span className="text-destructive">{formatErr}</span>
                  : available === false ? <span className="text-destructive">Username already taken</span>
                  : available === true && username ? <span className="text-emerald-700">Available</span>
                  : <span className="text-muted-foreground">Lowercase letters, numbers, underscore. 3–20 chars.</span>}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <textarea
                autoFocus
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A line or two about you and your music."
                rows={4}
                maxLength={280}
                className={`${inputCls} resize-none font-serif`}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{bio.length}/280</p>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in flex flex-col items-center gap-5 py-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-32 w-32 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center hover:border-ink/40 transition"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-ink-soft" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-paper" />
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs text-ink-soft hover:text-ink underline-offset-2 hover:underline"
              >
                {avatarUrl ? "Change picture" : "Choose picture"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <p className="font-serif italic text-xs text-ink-soft">JPG or PNG, up to 5 MB.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 space-y-3">
          <button
            disabled={!stepValid(step) || saving || uploading}
            onClick={next}
            className="w-full bg-ink text-paper rounded-full py-4 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition shadow-elev"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                {step === 3 ? "Enter your studio" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep((step - 1) as Step)}
                className="text-xs text-ink-soft hover:text-ink inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            ) : <span />}
            {(step === 2 || step === 3) && (
              <button
                onClick={next}
                className="text-xs text-ink-soft hover:text-ink"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const inputCls =
  "w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/60 placeholder:italic transition";
