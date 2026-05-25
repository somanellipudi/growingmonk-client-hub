# WhatsApp Business API Setup

## What you need

1. `WHATSAPP_ACCESS_TOKEN` — permanent system user token
2. `WHATSAPP_PHONE_NUMBER_ID` — numeric ID of your verified phone number
3. Two approved message templates

---

## Step 1 — Phone Number ID

1. Go to [Meta for Developers](https://developers.facebook.com) → your app
2. Left sidebar → **WhatsApp** → **API Setup**
3. Under the "From" phone number, copy the numeric ID below it
4. Paste into `.env.local` as `WHATSAPP_PHONE_NUMBER_ID`

---

## Step 2 — Permanent Access Token (System User)

Do NOT use the temporary token on the API Setup page — it expires in 24 hours.

1. Go to [Meta Business Suite](https://business.facebook.com) → your business
2. **Settings** → **Users** → **System Users**
3. Click **Add** → name: `growingmonk-hub` → role: **Admin**
4. Click **Generate New Token** → select your WhatsApp app
5. Add permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
6. Copy the token → paste into `.env.local` as `WHATSAPP_ACCESS_TOKEN`

This token does not expire unless manually revoked.

---

## Step 3 — Create Message Templates

Go to [Meta Business Manager → Message Templates](https://business.facebook.com/wa/manage/message-templates) → **Create template**

### Template 1: Weekly Report

| Field    | Value                      |
|----------|----------------------------|
| Category | Utility                    |
| Name     | `weekly_report`            |
| Language | English                    |

**Body text:**
```
Hi, here's your weekly report for *{{1}}*:

📸 Instagram: {{2}} posts, avg reach {{3}}
⭐ Google: {{4}} new reviews
💰 Ads: {{5}} spend, {{6}} leads

🎯 *Top insight:* {{7}}

— GrowingMonk Team
```

Variables in order: client name, post count, avg reach, new reviews, ad spend, leads, top insight.

---

### Template 2: Review Request

| Field    | Value              |
|----------|--------------------|
| Category | Utility            |
| Name     | `review_request`   |
| Language | English            |

**Body text:**
```
Hi {{1}}! 👋

Thank you for visiting *{{2}}*. We'd love to hear about your experience!

Could you spare 1 minute to leave us a Google review? It helps us a lot 🙏

👉 {{3}}

Thank you!
```

Variables in order: customer first name, business name, Google review link.

---

## Step 4 — Update .env.local

```env
WHATSAPP_ACCESS_TOKEN=EAABc...
WHATSAPP_PHONE_NUMBER_ID=12345...
WHATSAPP_WEEKLY_REPORT_TEMPLATE=weekly_report
WHATSAPP_REVIEW_REQUEST_TEMPLATE=review_request
```

Restart the dev server after adding credentials.

---

## Notes

- Utility category templates are approved within minutes to a few hours
- The review link is auto-built from the client's `gbpPlaceId` — make sure it's set in the client form
- The weekly report pre-fills from `client.whatsappNumber` — set this in the client edit form
- The blast send uses free-form text — recipient must have messaged your WhatsApp number within 24 hours, or use a pre-approved marketing template
