"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Ticket } from "@/lib/types";

type TicketWithEvent = Ticket & {
  events: { name: string; location: string | null; event_time: string } | null;
};

export default function TicketsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);

  useEffect(() => {
    if (!loading && !member) router.push("/login");
  }, [loading, member, router]);

  useEffect(() => {
    if (!member) return;
    supabase
      .from("tickets")
      .select("*, events(name, location, event_time)")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTickets((data as unknown as TicketWithEvent[]) ?? []));
  }, [member]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">My Tickets</h1>
      <ul className="flex flex-col gap-4">
        {tickets.map((t) => (
          <li
            key={t.id}
            className="border border-border rounded-2xl p-5 flex flex-col items-center gap-3"
          >
            <QRCodeSVG value={`ticket:${t.id}`} size={150} />
            <p className="font-semibold text-lg text-center">{t.events?.name}</p>
            <p className="text-sm text-foreground/60 text-center">
              {t.events?.event_time
                ? new Date(t.events.event_time).toLocaleString()
                : ""}
              {t.events?.location ? ` · ${t.events.location}` : ""}
            </p>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                t.status === "valid"
                  ? "bg-primary text-white"
                  : "bg-border text-foreground/60"
              }`}
            >
              {t.status === "valid" ? "VALID" : "USED"}
            </span>
          </li>
        ))}
        {tickets.length === 0 && (
          <p className="text-sm text-foreground/60">
            No tickets yet. Get one from the Events page.
          </p>
        )}
      </ul>
    </div>
  );
}
