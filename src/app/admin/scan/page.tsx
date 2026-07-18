"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import {
  isAdminUser,
  type ClubEvent,
  type Member,
  type PointTemplate,
  type Ticket,
} from "@/lib/types";

const SCANNER_ID = "qr-scanner-region";

type ScanPayload =
  | { kind: "member"; id: string }
  | { kind: "event"; id: string }
  | { kind: "ticket"; id: string };

function isTicketUsable(ticket: Ticket) {
  return (
    ticket.status === "valid" &&
    (ticket.payment_status === "approved" || ticket.payment_status === "not_required")
  );
}

function parseScan(decodedText: string): ScanPayload | null {
  const member = decodedText.match(/^member:(.+)$/);
  if (member) return { kind: "member", id: member[1] };

  const event = decodedText.match(/^event:(.+)$/);
  if (event) return { kind: "event", id: event[1] };

  const ticket = decodedText.match(/^ticket:(.+)$/);
  if (ticket) return { kind: "ticket", id: ticket[1] };

  return null;
}

export default function ScanPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [templates, setTemplates] = useState<PointTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    points_delta: 1,
    reason: "",
  });
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const [target, setTarget] = useState<Member | null>(null);
  const [memberTicket, setMemberTicket] = useState<Ticket | null>(null);
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  useEffect(() => {
    if (!isAdminUser(operator)) return;

    supabase
      .from("point_templates")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => setTemplates((data ?? []) as PointTemplate[]));

    supabase
      .from("events")
      .select("*")
      .order("event_time", { ascending: false })
      .then(({ data }) => setEvents((data ?? []) as ClubEvent[]));
  }, [operator]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  function applyTemplate(template: PointTemplate) {
    setSelectedTemplateId(template.id);
    setPoints(template.points_delta);
    setReason(template.reason);
  }

  async function addTemplate(e: FormEvent) {
    e.preventDefault();
    setTemplateError(null);

    const { data, error } = await supabase
      .from("point_templates")
      .insert(templateForm)
      .select()
      .single();

    if (error) {
      setTemplateError(error.message);
      return;
    }

    if (data) setTemplates((prev) => [...prev, data as PointTemplate]);
    setTemplateForm({ name: "", points_delta: 1, reason: "" });
  }

  async function deleteTemplate(id: string) {
    await supabase.from("point_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId(null);
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    scannerRef.current = null;

    try {
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      // Ignore scanner shutdown errors.
    }
  }

  async function loadMember(memberId: string) {
    const { data, error } = await supabase.from("members").select("*").eq("id", memberId).single();

    if (error || !data) {
      setScanError("Member not found");
      setTarget(null);
      setMemberTicket(null);
      return;
    }

    const memberRow = data as Member;
    setTarget(memberRow);

    if (selectedEventId) {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("member_id", memberRow.id)
        .eq("event_id", selectedEventId)
        .maybeSingle();

      setMemberTicket((ticket as Ticket | null) ?? null);
    } else {
      setMemberTicket(null);
    }
  }

  async function loadTicket(ticketId: string) {
    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticketData) {
      setScanError("Ticket not found");
      setTarget(null);
      setMemberTicket(null);
      return;
    }

    const ticket = ticketData as Ticket;

    if (!isTicketUsable(ticket)) {
      setScanError("This ticket cannot be used");
      setTarget(null);
      setMemberTicket(ticket);
      setSelectedEventId(ticket.event_id);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("id", ticket.member_id)
      .single();

    if (memberError || !memberData) {
      setScanError("Member not found");
      setTarget(null);
      setMemberTicket(null);
      return;
    }

    setTarget(memberData as Member);
    setMemberTicket(ticket);
    setSelectedEventId(ticket.event_id);
  }

  async function handleScan(decodedText: string) {
    const payload = parseScan(decodedText);
    if (!payload) return;

    await stopScanner();
    setScanning(false);
    setScanError(null);
    setMessage(null);

    if (payload.kind === "event") {
      setSelectedEventId(payload.id);
      setTarget(null);
      setMemberTicket(null);
      setMessage("Event selected. Now scan a member or ticket.");
      return;
    }

    if (payload.kind === "ticket") {
      await loadTicket(payload.id);
      return;
    }

    await loadMember(payload.id);
  }

  async function startScanning() {
    setScanError(null);
    setTarget(null);
    setMemberTicket(null);
    setMessage(null);

    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      );
      setScanning(true);
    } catch {
      scannerRef.current = null;
      setScanError("Could not start the camera, please check permissions");
    }
  }

  async function submitPoints(e: FormEvent) {
    e.preventDefault();
    if (!target || !operator) return;

    setSubmitting(true);
    setMessage(null);

    const eventIdToLog = selectedEventId || memberTicket?.event_id || null;

    const { error } = await supabase.from("point_logs").insert({
      member_id: target.id,
      points_delta: points,
      reason,
      operator_id: operator.id,
      event_id: eventIdToLog,
    });

    if (error) {
      setSubmitting(false);
      setMessage(`Failed: ${error.message}`);
      return;
    }

    const ticketUsable = !!memberTicket && isTicketUsable(memberTicket);

    if (ticketUsable) {
      await supabase.from("tickets").update({ status: "used" }).eq("id", memberTicket.id);
    }

    setSubmitting(false);
    setMessage(
      ticketUsable
        ? `Added ${points} pts to ${target.name} and marked their ticket as used`
        : `Added ${points} pts to ${target.name}`
    );

    setTarget(null);
    setMemberTicket(null);

    if (!selectedTemplateId) {
      setReason("");
      setPoints(1);
    }
  }

  if (loading || !operator) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <section className="rounded-2xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Scan</h1>
          <button
            type="button"
            onClick={() => setShowTemplateForm((v) => !v)}
            className="text-sm text-accent"
          >
            {showTemplateForm ? "Close" : "Manage"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className={`rounded-xl px-3 py-2 text-sm border ${
                selectedTemplateId === t.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border"
              }`}
            >
              {t.name} ({t.points_delta >= 0 ? "+" : ""}
              {t.points_delta})
            </button>
          ))}
          {templates.length === 0 && !showTemplateForm ? (
            <span className="text-sm text-foreground/60">No templates yet</span>
          ) : null}
        </div>

        {showTemplateForm ? (
          <form onSubmit={addTemplate} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Template name"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={templateForm.points_delta}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, points_delta: Number(e.target.value) })
                }
                className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={templateForm.reason}
                onChange={(e) => setTemplateForm({ ...templateForm, reason: e.target.value })}
                placeholder="Reason"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium"
              >
                Add Template
              </button>
            </div>
            {templateError ? <p className="text-sm text-red-600">{templateError}</p> : null}

            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {t.name} · {t.reason} · {t.points_delta >= 0 ? "+" : ""}
                    {t.points_delta}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(t.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border p-4 space-y-3">
        <label className="block text-sm font-medium">
          Event
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="">No event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({new Date(ev.event_time).toLocaleDateString()})
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-dashed border-border p-4">
          <div id={SCANNER_ID} />
        </div>

        {!scanning ? (
          <button
            type="button"
            onClick={startScanning}
            className="w-full rounded-xl border border-border py-2 font-medium"
          >
            Start Scanning
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              void stopScanner();
              setScanning(false);
            }}
            className="w-full rounded-xl border border-border py-2 font-medium"
          >
            Cancel
          </button>
        )}

        {scanError ? <p className="text-sm text-red-600">{scanError}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
      </section>

      {target ? (
        <section className="rounded-2xl border border-border p-4 space-y-4">
          <div>
            <p className="text-sm text-foreground/60">Member</p>
            <p className="text-lg font-semibold">
              {target.name} <span className="text-sm font-normal">({target.points} pts)</span>
            </p>
          </div>

          {memberTicket ? (
            <div className="rounded-xl bg-foreground/5 p-3 text-sm">
              <p>
                Ticket for event: <strong>{memberTicket.event_id}</strong>
              </p>
              <p>Status: {memberTicket.status}</p>
              <p>Payment: {memberTicket.payment_status}</p>
            </div>
          ) : null}

          <form onSubmit={submitPoints} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-28 rounded-xl border border-border bg-background px-3 py-2"
              />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-accent px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add Points"}
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
