import { env } from "@/lib/server/env";

const WA_BASE = "https://graph.facebook.com/v21.0";

export type TemplateComponent = {
  type: "header" | "body" | "button";
  sub_type?: "url" | "quick_reply";
  index?: number;
  parameters: Array<
    | { type: "text"; text: string }
    | { type: "currency"; currency: { fallback_value: string; code: string; amount_1000: number } }
    | { type: "image"; image: { link: string } }
  >;
};

export type SendTemplateOptions = {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
};

export type SendTextOptions = {
  to: string;
  text: string;
  previewUrl?: boolean;
};

export type WhatsAppSendResult = {
  messageId: string;
  to: string;
};

function formatPhone(phone: string): string {
  // Strip everything except digits, ensure E.164 format
  const digits = phone.replace(/\D/g, "");
  // Indian numbers: add 91 prefix if 10 digits
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function assertConfigured() {
  if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) {
    throw new Error("WhatsApp Business API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.");
  }
}

export async function sendWhatsAppTemplate(opts: SendTemplateOptions): Promise<WhatsAppSendResult> {
  assertConfigured();
  const to = formatPhone(opts.to);
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode ?? "en" },
      ...(opts.components?.length ? { components: opts.components } : {}),
    },
  };

  const res = await fetch(`${WA_BASE}/${env.whatsappPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string; code: number } };
  if (!res.ok || data.error) {
    throw new Error(`WhatsApp API error: ${data.error?.message ?? res.status}`);
  }

  return { messageId: data.messages?.[0]?.id ?? "", to };
}

export async function sendWhatsAppText(opts: SendTextOptions): Promise<WhatsAppSendResult> {
  assertConfigured();
  const to = formatPhone(opts.to);
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: opts.previewUrl ?? false,
      body: opts.text,
    },
  };

  const res = await fetch(`${WA_BASE}/${env.whatsappPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string; code: number } };
  if (!res.ok || data.error) {
    throw new Error(`WhatsApp API error: ${data.error?.message ?? res.status}`);
  }

  return { messageId: data.messages?.[0]?.id ?? "", to };
}

// Build body parameters for a template from a string array
export function bodyParams(values: string[]): TemplateComponent {
  return {
    type: "body",
    parameters: values.map((text) => ({ type: "text" as const, text })),
  };
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(env.whatsappAccessToken && env.whatsappPhoneNumberId);
}
