"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser, type PaymentStatus } from "@/lib/types";

type TicketRow = {
  id: string;
  guest_name: string | null;
  payment_screenshot_urls: string[] | null;
  payment_status: PaymentStatus;
  created_at: string;
  event_id: string;
  member_id: string;
  members: { name: string } | null;
  events: { name: string; price: number } | null;
};

type Submission = {
  key: string;
  status: PaymentStatus;
  memberName: string;
  eventName: string;
  price: number;
  guestCount: number;
  screenshotUrls: string[];
  createdAt: string;
  allIds: string[];
};

// Groups by (event, member, status) so a later "add guest" submission shows up
// as its own reviewable item instead of being hidden behind an already
// approved/rejected primary ticket.
function groupIntoSubmissions(rows: TicketRow[]): Submission[] {
  const groups = new Map<string, TicketRow[]>();
  for (const row of rows) {
    if (!row.payment_screenshot_urls || row.payment_screenshot_urls.length === 0) continue;
    const key = `${row.event_id}-${row.member_id}-${row.payment_status}`;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  const submissions: Submission[] = [];
  for (const [key, rows] of groups) {
    const first = rows[0];
    submissions.push({
      key,
      status: first.payment_status,
      memberName: first.members?.name ?? "Unknown",
      eventName: first.events?.name ?? "Unknown",
      price: first.events?.price ?? 0,
      guestCount: rows.filter((r) => r.guest_name).length,
      screenshotUrls: first.payment_screenshot_urls ?? [],
      createdAt: rows.reduce(
        (latest, r) => (r.created_at > latest ? r.created_at : latest),
        first.created_at
      ),
      allIds: rows.map((r) => r.id),
    });
  }
  return submissions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function AdminPaymentsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadSubmissions() {
    const { data } = await supabase
      .from("tickets")
      .select(
        "id, guest_name, payment_screenshot_urls, payment_status, created_at, event_id, member_id, members(name), events(name, price)"
      )
      .order("created_at", { ascending: false });

    const rows = (data as unknown as TicketRow[]) ?? [];
    const grouped = groupIntoSubmissions(rows);
    setSubmissions(showAll ? grouped : grouped.filter((s) => s.status === "pending"));
  }

  useEffect(() => {
    if (isAdminUser(operator)) loadSubmissions();
  }, [operator, showAll]);

  async function setStatus(submission: Submission, status: "approved" | "rejected") {
    await supabase.from("tickets").update({ payment_status: status }).in("id", submission.allIds);
    loadSubmissions();
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="text-sm text-foreground/60 hover:text-accent">
        &larr; Back to Admin
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Review Payments</h1>
        <button onClick={() => setShowAll(!showAll)} className="text-sm text-accent">
          {showAll ? "Show pending only" : "Show all"}
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {submissions.map((s) => {
          const heads = s.guestCount > 0 ? s.guestCount : 1;
          const total = s.price * heads;
          return (
            <li key={s.key} className="border border-border rounded-xl p-4 flex flex-col gap-3">
              {s.screenshotUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {s.screenshotUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt="Payment screenshot"
                      className="max-h-80 w-auto shrink-0 object-contain rounded-xl border border-border"
                    />
                  ))}
                </div>
              )}
              <div className="text-sm">
                <p className="font-medium">
                  {s.memberName}
                  {s.guestCount > 0 ? ` (${s.guestCount} guest${s.guestCount > 1 ? "s" : ""})` : ""}
                </p>
                <p className="text-foreground/60">
                  {s.eventName} · £{total.toFixed(2)} total
                </p>
                <p className="text-foreground/60">{new Date(s.createdAt).toLocaleString()}</p>
                <p
                  className={`font-medium ${
                    s.status === "approved"
                      ? "text-primary"
                      : s.status === "rejected"
                        ? "text-red-600"
                        : "text-accent"
                  }`}
                >
                  {s.status.toUpperCase()}
                </p>
              </div>
              {s.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus(s, "approved")}
                    className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(s, "rejected")}
                    className="flex-1 border border-border rounded-xl py-2 text-sm font-medium text-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {submissions.length === 0 && (
          <p className="text-sm text-foreground/60">No payments to review</p>
        )}
      </ul>
    </div>
  );
}
