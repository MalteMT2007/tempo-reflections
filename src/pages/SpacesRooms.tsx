import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RoomsPanel from "@/components/spaces/RoomsPanel";
import { PageHeader } from "@/components/PageHeader";

export default function SpacesRooms() {
  useEffect(() => { document.title = "Rooms — Tempo"; }, []);
  const nav = useNavigate();
  const [params] = useSearchParams();

  // RoomsPanel reads ?id= via its internal state today; we just render it.
  // Pass the room id through localStorage hint for the panel to pick up if desired.
  useEffect(() => {
    const id = params.get("id");
    if (id) (window as any).__tempoOpenRoomId = id;
  }, [params]);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-8 sm:pt-10 pb-12">
      <button
        onClick={() => nav("/spaces")}
        className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Spaces
      </button>
      <PageHeader title="Rooms" subtitle="Joinable groups for messages and rehearsal chat." />
      <div className="mt-6">
        <RoomsPanel />
      </div>
    </div>
  );
}
