// Classifies a sheet-music PDF based on filename + first-page text snippet.
// Returns suggested composer / instrument / tags (categories).
// Uses Lovable AI Gateway with structured tool-calling output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KNOWN_INSTRUMENTS = [
  "Piano", "Violin", "Viola", "Cello", "Double bass",
  "Flute", "Oboe", "Clarinet", "Bassoon",
  "Trumpet", "Horn", "Trombone", "Tuba",
  "Saxophone", "Guitar", "Voice (SATB)", "Soprano", "Alto", "Tenor", "Bass",
  "Percussion", "Harp", "Organ", "Accordion", "Ensemble (full score)",
];
const KNOWN_TAGS = [
  "Solo", "Chamber", "Orchestral", "Choral", "Sonata", "Concerto",
  "Etude", "Scales/Exercises", "Jazz", "Pop", "Folk",
  "Baroque", "Classical", "Romantic", "Modern", "Contemporary",
  "Audition", "Performance", "Practice",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename, textSnippet } = await req.json();
    if (typeof filename !== "string") {
      return json({ error: "filename required" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userMsg =
      `Filename: ${filename}\n` +
      (textSnippet
        ? `First-page text excerpt:\n"""${String(textSnippet).slice(0, 2000)}"""`
        : `(No text could be extracted from the PDF.)`);

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You classify sheet-music PDFs. Given a filename and an optional first-page text excerpt, " +
            "infer the most likely composer (full name if discernible), the primary instrument, " +
            "a short suggested title, and 1–4 helpful category tags. " +
            `Only choose instruments from this list (or the closest match): ${KNOWN_INSTRUMENTS.join(", ")}. ` +
            `Prefer tag categories from this list when applicable: ${KNOWN_TAGS.join(", ")}. ` +
            "If you cannot tell, leave a field as an empty string or omit tags. Never invent a composer.",
        },
        { role: "user", content: userMsg },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_metadata",
            description: "Return suggested metadata for the score.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Cleaned-up display title; empty string if unsure." },
                composer: { type: "string", description: "Full composer name; empty string if unsure." },
                instrument: { type: "string", description: "Primary instrument; empty string if unsure." },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "1–4 short category tags (e.g. 'Sonata', 'Romantic', 'Solo').",
                },
                confidence: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Your overall confidence in these suggestions.",
                },
              },
              required: ["title", "composer", "instrument", "tags", "confidence"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "suggest_metadata" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) return json({ error: "Rate limit exceeded, try again shortly." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted. Add credits in Workspace > Usage." }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return json({ error: "AI gateway error" }, 502);
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = call?.function?.arguments;
    if (!argsRaw) return json({ error: "No suggestion returned" }, 502);

    let parsed: any = {};
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch {
      return json({ error: "Malformed AI response" }, 502);
    }

    return json({
      title: String(parsed.title ?? "").trim(),
      composer: String(parsed.composer ?? "").trim(),
      instrument: String(parsed.instrument ?? "").trim(),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t: any) => typeof t === "string" && t.trim()).slice(0, 6)
        : [],
      confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
    });
  } catch (e) {
    console.error("classify-score error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
