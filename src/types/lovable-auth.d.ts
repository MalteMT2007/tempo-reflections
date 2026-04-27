// Augment the @lovable.dev/cloud-auth-js types so the auto-generated
// src/integrations/lovable/index.ts compiles. The runtime supports "lovable"
// as a provider, but the published types omit it.
declare module "@lovable.dev/cloud-auth-js" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type OAuthProvider = "google" | "apple" | "microsoft" | "lovable" | (string & {});
}
export {};
