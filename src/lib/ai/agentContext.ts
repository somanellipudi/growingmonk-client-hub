import type { Client } from "@/types";

export function buildSystemPrompt(client: Client, mode: "strategy" | "creative" | "pm" = "strategy") {
  return [
    roleLayer(mode),
    nicheLayer(client),
    marketLayer(client),
    clientProfileLayer(client),
    recentHistoryLayer()
  ].join("\n\n");
}

function roleLayer(mode: string) {
  if (mode === "creative") {
    return "LAYER 1 - ROLE\nYou are the senior creative strategist at GrowingMonk. You turn client performance data into specific content, caption, and visual direction that the team can execute this week.";
  }
  if (mode === "pm") {
    return "LAYER 1 - ROLE\nYou are the senior performance marketer at GrowingMonk. You interpret Meta Ads, Instagram, and Google Business Profile data into clear budget and campaign actions.";
  }
  return "LAYER 1 - ROLE\nYou are a senior growth strategist at GrowingMonk. You write practical weekly intelligence briefs from real performance data. You are direct, specific, local-market aware, and never generic.";
}

function nicheLayer(client: Client) {
  const niche = client.niche;
  const expertise: Record<Client["niche"], string> = {
    salon: "Salon and beauty expertise loaded: booking psychology, transformation proof, stylist trust, bridal season demand, keratin/hair-color hooks, WhatsApp booking language, local review credibility, and CPL/ROAS tradeoffs for appointment businesses.",
    restaurant: "Restaurant expertise loaded: menu proof, urgency offers, delivery/dine-in splits, review signals, discovery search demand, repeat purchase prompts, and local food content patterns.",
    ecommerce: "Ecommerce expertise loaded: offer economics, product proof, conversion rate signals, cart/revenue attribution, creative testing, and repeat purchase lifecycle.",
    clinic: "Clinic expertise loaded: trust-first patient acquisition, compliant educational content, local search intent, appointment conversion, and review response sensitivity.",
    coach: "Coach expertise loaded: authority-building content, lead magnet messaging, trust proof, testimonial usage, and high-intent enquiry nurturing.",
    local_service: "Local service expertise loaded: service-area search behavior, proof-led ads, calls/directions metrics, reputation management, and WhatsApp lead follow-up.",
    franchise: "Franchise expertise loaded: local store performance, brand consistency, location-level reviews, regional offers, and repeatable weekly playbooks.",
    other: "General local growth expertise loaded: local market positioning, proof-led content, lead quality, review management, and channel-level performance interpretation."
  };
  return `LAYER 2 - NICHE EXPERTISE\n${expertise[niche]}`;
}

function marketLayer(client: Client) {
  const city = client.city.toLowerCase();
  if (city.includes("hyderabad")) {
    return "LAYER 3 - MARKET INTELLIGENCE\nHyderabad market expertise loaded: Telugu-English/Hinglish friendliness, West Hyderabad premium zones, salon and local-service trust signals, evening browsing behavior, weekend appointment planning, festival/wedding season sensitivity, and WhatsApp-first enquiry behavior. Recommended consumer content windows often include 7:00 PM to 9:00 PM IST when the data supports it.";
  }
  if (city.includes("mumbai")) return "LAYER 3 - MARKET INTELLIGENCE\nMumbai market expertise loaded: high competition, locality-specific proof, commuter timing, premium-service positioning, and fast CTA clarity.";
  if (city.includes("delhi")) return "LAYER 3 - MARKET INTELLIGENCE\nDelhi NCR market expertise loaded: offer sensitivity, premium locality differences, review trust, and direct booking language.";
  if (city.includes("bangalore") || city.includes("bengaluru")) return "LAYER 3 - MARKET INTELLIGENCE\nBangalore market expertise loaded: English-first urban audiences, convenience-led booking, neighborhood specificity, and high social proof expectations.";
  if (city.includes("chennai")) return "LAYER 3 - MARKET INTELLIGENCE\nChennai market expertise loaded: trust-first communication, local language sensitivity, family/referral behavior, and steady review credibility.";
  if (city.includes("new york") || city.includes("nyc")) return "LAYER 3 - MARKET INTELLIGENCE\nNYC market expertise loaded: hyperlocal competition, fast proof, appointment convenience, and direct differentiation.";
  if (city.includes("los angeles") || city.includes("la")) return "LAYER 3 - MARKET INTELLIGENCE\nLA market expertise loaded: visual proof, lifestyle framing, creator-style content, and premium local positioning.";
  if (city.includes("chicago")) return "LAYER 3 - MARKET INTELLIGENCE\nChicago market expertise loaded: neighborhood trust, seasonal demand shifts, review proof, and direct service offers.";
  if (city.includes("houston")) return "LAYER 3 - MARKET INTELLIGENCE\nHouston market expertise loaded: service-area specificity, practical offers, review-led trust, and clear phone/booking CTAs.";
  return `LAYER 3 - MARKET INTELLIGENCE\nUse ${client.city}, ${client.country} local context. Timing, language, and offer advice must fit the client timezone ${client.timezone}.`;
}

function clientProfileLayer(client: Client) {
  return `LAYER 4 - CLIENT PROFILE
Business: ${client.name}
Niche: ${client.nicheSubtype || client.niche}
City: ${client.city}, ${client.country}
Currency: ${client.currency}
Timezone: ${client.timezone}
Platforms: ${[...client.activePlatforms, client.otherPlatformLabel ? `other: ${client.otherPlatformLabel}` : ""].filter(Boolean).join(", ") || "not set"}
Target customer: ${client.targetCustomer || "not set"}
Brand voice: ${client.brandVoice || "not set"}
Business goals: ${client.businessGoals || "not set"}
Known constraints: ${client.knownConstraints || "not set"}
Competitors: ${client.keyCompetitors.join(", ") || "not set"}`;
}

function recentHistoryLayer() {
  return "LAYER 5 - RECENT HISTORY\nNo prior weekly brief history is loaded in MVP. Use only the provided weekly data context and be explicit when data is missing.";
}
