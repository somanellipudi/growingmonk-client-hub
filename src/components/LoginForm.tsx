"use client";

import { useState } from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setMessage(payload.error || "Login failed.");
        return;
      }
      window.location.assign(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 max-w-md">
      <label className="text-sm font-semibold text-ink" htmlFor="email">Allowlisted email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@growingmonk.com"
        className="mt-2 h-11 w-full border border-stoneLine bg-paper px-3 text-sm text-ink outline-none focus:border-gm-orange"
      />
      <Button type="submit" disabled={loading} className="mt-4">
        <Chrome size={18} /> {loading ? "Checking..." : "Continue"}
      </Button>
      {message ? <p className="mt-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </form>
  );
}
