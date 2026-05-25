"use client";

import { useState } from "react";
import { Check, Send, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

// â”€â”€â”€ Send WhatsApp Blast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sends the AI-drafted blast message to a single recipient phone number.
// Used inside the WhatsApp blast panel on the client detail page.

export function WhatsAppBlastButton({
  clientId,
  message,
}: {
  clientId: string;
  message: string;
}) {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const cleaned = phone.trim();
    if (!cleaned) { setError("Enter a phone number."); return; }
    setSending(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch(`/api/clients/${clientId}/whatsapp/send-blast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, message }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) { setError(data.error ?? "Failed to send."); return; }
      setSent(true);
      setPhone("");
      setTimeout(() => setSent(false), 4000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(""); setSent(false); }}
          placeholder="+91 98765 43210"
          className="flex-1 border border-stoneLine bg-paper px-3 py-2 text-xs outline-none focus:border-gm-orange font-mono"
        />
        <Button type="button" onClick={() => void send()} disabled={sending || !phone.trim()}>
          {sending
            ? <><RefreshCw size={13} className="animate-spin" /> Sendingâ€¦</>
            : sent
            ? <><Check size={13} /> Sent!</>
            : <><Send size={13} /> Send</>
          }
        </Button>
      </div>
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      {sent && <p className="text-xs font-semibold text-green-700">Message sent via WhatsApp âœ“</p>}
    </div>
  );
}

// â”€â”€â”€ Send Weekly Report to Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sends the auto-formatted weekly performance summary to the client's WhatsApp.
// Uses the weekly_report template â€” configure WHATSAPP_WEEKLY_REPORT_TEMPLATE in .env.

export function WhatsAppReportButton({
  clientId,
  defaultPhone,
  clientName,
}: {
  clientId: string;
  defaultPhone?: string;
  clientName: string;
}) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const cleaned = phone.trim();
    if (!cleaned) { setError("Enter client WhatsApp number."); return; }
    setSending(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch(`/api/clients/${clientId}/whatsapp/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) { setError(data.error ?? "Failed to send report."); return; }
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink">Send weekly report to {clientName}</p>
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(""); setSent(false); }}
          placeholder="+91 98765 43210"
          className="flex-1 border border-stoneLine bg-paper px-3 py-2 text-xs outline-none focus:border-gm-orange font-mono"
        />
        <Button type="button" onClick={() => void send()} disabled={sending || !phone.trim()}>
          {sending
            ? <><RefreshCw size={13} className="animate-spin" /> Sendingâ€¦</>
            : sent
            ? <><Check size={13} /> Sent!</>
            : <><MessageSquare size={13} /> Send report</>
          }
        </Button>
      </div>
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      {sent && <p className="text-xs font-semibold text-green-700">Weekly report sent to client âœ“</p>}
    </div>
  );
}

// â”€â”€â”€ Review Request Sender â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sends a WhatsApp review request to a customer after their visit.
// Uses the review_request template with customer name + business name + review link.

export function ReviewRequestSender({ clientId }: { clientId: string }) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const cleanPhone = phone.trim();
    if (!cleanPhone) { setError("Customer phone number is required."); return; }
    setSending(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch(`/api/clients/${clientId}/whatsapp/send-review-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, customerName: customerName.trim() || undefined }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) { setError(data.error ?? "Failed to send."); return; }
      setSent(true);
      setCustomerName("");
      setPhone("");
      setTimeout(() => setSent(false), 5000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-stoneLine bg-paper p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-gm-orange" />
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Request a Google review
        </p>
      </div>
      <p className="text-xs text-muted leading-5">
        Send a WhatsApp message to a customer asking them to leave a Google review. Works best right after a visit.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name (optional)"
          className="border border-stoneLine bg-paper px-3 py-2 text-xs outline-none focus:border-gm-orange"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(""); setSent(false); }}
          placeholder="Customer WhatsApp number *"
          className="border border-stoneLine bg-paper px-3 py-2 text-xs outline-none focus:border-gm-orange font-mono"
        />
      </div>
      <Button type="button" onClick={() => void send()} disabled={sending || !phone.trim()}>
        {sending
          ? <><RefreshCw size={13} className="animate-spin" /> Sendingâ€¦</>
          : sent
          ? <><Check size={13} /> Review request sent!</>
          : <><Send size={13} /> Send review request</>
        }
      </Button>
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      {sent && (
        <p className="text-xs font-semibold text-green-700">
          Review request sent âœ“ â€” customer will receive a WhatsApp with the Google review link.
        </p>
      )}
    </div>
  );
}
