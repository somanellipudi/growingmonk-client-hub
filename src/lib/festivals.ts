export type Festival = {
  name: string;
  date: string; // YYYY-MM-DD
  type: "national" | "hindu" | "muslim" | "sikh" | "christian" | "commercial";
  niches: string[]; // which niches benefit most
  contentAngle: string; // one-line content suggestion
};

// Pre-computed for 2025, 2026, 2027 — variable dates need manual lookup each year
const FESTIVALS: Festival[] = [
  // ── 2025 ──────────────────────────────────────────────────────────────────
  { name: "Makar Sankranti", date: "2025-01-14", type: "hindu", niches: ["restaurant", "salon", "local_service"], contentAngle: "New beginnings, sesame & jaggery sweets, kite flying imagery" },
  { name: "Republic Day", date: "2025-01-26", type: "national", niches: ["ecommerce", "local_service", "coach"], contentAngle: "Patriotic themes, tricolor palette, national pride messaging" },
  { name: "Valentine's Day", date: "2025-02-14", type: "commercial", niches: ["restaurant", "salon", "ecommerce", "clinic"], contentAngle: "Couple packages, gifting, self-care, love themes" },
  { name: "Maha Shivratri", date: "2025-02-26", type: "hindu", niches: ["restaurant", "salon", "local_service"], contentAngle: "Spiritual themes, fasting menus, wellness focus" },
  { name: "Holi", date: "2025-03-14", type: "hindu", niches: ["salon", "ecommerce", "restaurant", "local_service"], contentAngle: "Colors, joy, skin & hair care post-Holi, festive offers" },
  { name: "Gudi Padwa / Ugadi", date: "2025-03-30", type: "hindu", niches: ["restaurant", "local_service", "salon"], contentAngle: "Marathi/Telugu New Year, traditional sweets, new beginnings" },
  { name: "Eid ul-Fitr", date: "2025-03-31", type: "muslim", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Celebration of Eid, festive fashion, special menus" },
  { name: "Ram Navami", date: "2025-04-06", type: "hindu", niches: ["restaurant", "local_service"], contentAngle: "Devotional themes, sattvic food, community celebrations" },
  { name: "Akshaya Tritiya", date: "2025-04-30", type: "hindu", niches: ["ecommerce", "clinic", "salon"], contentAngle: "Auspicious day for purchases, gold/jewellery themes, new beginnings" },
  { name: "Mother's Day", date: "2025-05-11", type: "commercial", niches: ["salon", "restaurant", "ecommerce", "clinic"], contentAngle: "Celebrate moms, gift ideas, pampering packages, family moments" },
  { name: "Eid ul-Adha", date: "2025-06-07", type: "muslim", niches: ["restaurant", "ecommerce"], contentAngle: "Sacrifice, community, sharing, festive meals" },
  { name: "Father's Day", date: "2025-06-15", type: "commercial", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Dad appreciation, gifting, experiences, family outings" },
  { name: "Independence Day", date: "2025-08-15", type: "national", niches: ["ecommerce", "restaurant", "local_service"], contentAngle: "Freedom, tricolor, patriotic offers, national pride" },
  { name: "Raksha Bandhan", date: "2025-08-09", type: "hindu", niches: ["ecommerce", "restaurant", "salon"], contentAngle: "Sibling bond, rakhi gifts, mithai, sibling discounts" },
  { name: "Janmashtami", date: "2025-08-16", type: "hindu", niches: ["restaurant", "local_service"], contentAngle: "Krishna themes, dahi handi, devotion, midnight celebrations" },
  { name: "Ganesh Chaturthi", date: "2025-08-27", type: "hindu", niches: ["restaurant", "local_service", "salon"], contentAngle: "Lord Ganesha, modak, community pandals, eco-friendly themes" },
  { name: "Onam", date: "2025-09-05", type: "hindu", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Kerala harvest festival, pookalam, Onam sadhya feast" },
  { name: "Gandhi Jayanti", date: "2025-10-02", type: "national", niches: ["coach", "local_service"], contentAngle: "Simplicity, truth, service — values-led brand messaging" },
  { name: "Navratri begins", date: "2025-10-02", type: "hindu", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Nine nights of Durga, garba, fasting menus, festive fashion" },
  { name: "Dussehra", date: "2025-10-12", type: "hindu", niches: ["ecommerce", "restaurant", "local_service"], contentAngle: "Victory of good over evil, Ravana burning, new beginnings" },
  { name: "Dhanteras", date: "2025-10-18", type: "hindu", niches: ["ecommerce", "salon", "clinic"], contentAngle: "Auspicious shopping day, gold/silver, Lakshmi worship" },
  { name: "Diwali", date: "2025-10-20", type: "hindu", niches: ["ecommerce", "restaurant", "salon", "clinic", "local_service", "franchise"], contentAngle: "Festival of lights, gifting, sweets, offers, family celebrations" },
  { name: "Bhai Dooj", date: "2025-10-23", type: "hindu", niches: ["restaurant", "ecommerce"], contentAngle: "Sibling celebrations, gifting, family togetherness" },
  { name: "Chhath Puja", date: "2025-10-26", type: "hindu", niches: ["restaurant", "local_service"], contentAngle: "Sun worship, folk traditions, community spirit" },
  { name: "Guru Nanak Jayanti", date: "2025-11-05", type: "sikh", niches: ["restaurant", "local_service"], contentAngle: "Seva, community, langar, unity messaging" },
  { name: "Christmas", date: "2025-12-25", type: "christian", niches: ["restaurant", "ecommerce", "salon", "franchise"], contentAngle: "Gifting, celebration, family, year-end warmth" },
  { name: "New Year's Eve", date: "2025-12-31", type: "commercial", niches: ["restaurant", "salon", "ecommerce"], contentAngle: "Year-end celebration, resolutions, new chapter, party specials" },

  // ── 2026 ──────────────────────────────────────────────────────────────────
  { name: "New Year's Day", date: "2026-01-01", type: "commercial", niches: ["coach", "clinic", "salon", "ecommerce"], contentAngle: "Fresh start, resolutions, transformation, new habits" },
  { name: "Makar Sankranti", date: "2026-01-14", type: "hindu", niches: ["restaurant", "salon", "local_service"], contentAngle: "New beginnings, sesame & jaggery sweets, kite flying imagery" },
  { name: "Republic Day", date: "2026-01-26", type: "national", niches: ["ecommerce", "local_service", "coach"], contentAngle: "Patriotic themes, tricolor palette, national pride messaging" },
  { name: "Valentine's Day", date: "2026-02-14", type: "commercial", niches: ["restaurant", "salon", "ecommerce", "clinic"], contentAngle: "Couple packages, gifting, self-care, love themes" },
  { name: "Maha Shivratri", date: "2026-02-15", type: "hindu", niches: ["restaurant", "salon", "local_service"], contentAngle: "Spiritual themes, fasting menus, wellness focus" },
  { name: "Holi", date: "2026-03-03", type: "hindu", niches: ["salon", "ecommerce", "restaurant", "local_service"], contentAngle: "Colors, joy, skin & hair care post-Holi, festive offers" },
  { name: "Eid ul-Fitr", date: "2026-03-20", type: "muslim", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Celebration of Eid, festive fashion, special menus" },
  { name: "Gudi Padwa / Ugadi", date: "2026-03-19", type: "hindu", niches: ["restaurant", "local_service", "salon"], contentAngle: "New Year celebrations, traditional sweets, new beginnings" },
  { name: "Ram Navami", date: "2026-03-26", type: "hindu", niches: ["restaurant", "local_service"], contentAngle: "Devotional themes, sattvic food, community celebrations" },
  { name: "Akshaya Tritiya", date: "2026-04-19", type: "hindu", niches: ["ecommerce", "clinic", "salon"], contentAngle: "Auspicious shopping, gold themes, new starts" },
  { name: "Mother's Day", date: "2026-05-10", type: "commercial", niches: ["salon", "restaurant", "ecommerce", "clinic"], contentAngle: "Celebrate moms, gift ideas, pampering packages, family moments" },
  { name: "Eid ul-Adha", date: "2026-05-27", type: "muslim", niches: ["restaurant", "ecommerce"], contentAngle: "Sacrifice, community, sharing, festive meals" },
  { name: "Father's Day", date: "2026-06-21", type: "commercial", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Dad appreciation, gifting, experiences, family outings" },
  { name: "Independence Day", date: "2026-08-15", type: "national", niches: ["ecommerce", "restaurant", "local_service"], contentAngle: "Freedom, tricolor, patriotic offers, national pride" },
  { name: "Raksha Bandhan", date: "2026-08-28", type: "hindu", niches: ["ecommerce", "restaurant", "salon"], contentAngle: "Sibling bond, rakhi gifts, mithai, sibling discounts" },
  { name: "Janmashtami", date: "2026-08-30", type: "hindu", niches: ["restaurant", "local_service"], contentAngle: "Krishna themes, dahi handi, devotion, midnight celebrations" },
  { name: "Ganesh Chaturthi", date: "2026-08-19", type: "hindu", niches: ["restaurant", "local_service", "salon"], contentAngle: "Lord Ganesha, modak, community pandals, eco-friendly themes" },
  { name: "Onam", date: "2026-09-14", type: "hindu", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Kerala harvest festival, pookalam, Onam sadhya feast" },
  { name: "Gandhi Jayanti", date: "2026-10-02", type: "national", niches: ["coach", "local_service"], contentAngle: "Simplicity, truth, service — values-led brand messaging" },
  { name: "Navratri begins", date: "2026-09-21", type: "hindu", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Nine nights of Durga, garba, fasting menus, festive fashion" },
  { name: "Dussehra", date: "2026-10-01", type: "hindu", niches: ["ecommerce", "restaurant", "local_service"], contentAngle: "Victory of good over evil, Ravana burning, new beginnings" },
  { name: "Dhanteras", date: "2026-11-06", type: "hindu", niches: ["ecommerce", "salon", "clinic"], contentAngle: "Auspicious shopping day, gold/silver, Lakshmi worship" },
  { name: "Diwali", date: "2026-11-08", type: "hindu", niches: ["ecommerce", "restaurant", "salon", "clinic", "local_service", "franchise"], contentAngle: "Festival of lights, gifting, sweets, offers, family celebrations" },
  { name: "Bhai Dooj", date: "2026-11-11", type: "hindu", niches: ["restaurant", "ecommerce"], contentAngle: "Sibling celebrations, gifting, family togetherness" },
  { name: "Guru Nanak Jayanti", date: "2026-11-25", type: "sikh", niches: ["restaurant", "local_service"], contentAngle: "Seva, community, langar, unity messaging" },
  { name: "Christmas", date: "2026-12-25", type: "christian", niches: ["restaurant", "ecommerce", "salon", "franchise"], contentAngle: "Gifting, celebration, family, year-end warmth" },
  { name: "New Year's Eve", date: "2026-12-31", type: "commercial", niches: ["restaurant", "salon", "ecommerce"], contentAngle: "Year-end celebration, resolutions, new chapter, party specials" },

  // ── 2027 ──────────────────────────────────────────────────────────────────
  { name: "New Year's Day", date: "2027-01-01", type: "commercial", niches: ["coach", "clinic", "salon", "ecommerce"], contentAngle: "Fresh start, resolutions, transformation, new habits" },
  { name: "Makar Sankranti", date: "2027-01-14", type: "hindu", niches: ["restaurant", "salon", "local_service"], contentAngle: "New beginnings, sesame & jaggery sweets, kite flying imagery" },
  { name: "Republic Day", date: "2027-01-26", type: "national", niches: ["ecommerce", "local_service", "coach"], contentAngle: "Patriotic themes, tricolor palette, national pride messaging" },
  { name: "Valentine's Day", date: "2027-02-14", type: "commercial", niches: ["restaurant", "salon", "ecommerce", "clinic"], contentAngle: "Couple packages, gifting, self-care, love themes" },
  { name: "Holi", date: "2027-03-22", type: "hindu", niches: ["salon", "ecommerce", "restaurant", "local_service"], contentAngle: "Colors, joy, skin & hair care post-Holi, festive offers" },
  { name: "Mother's Day", date: "2027-05-09", type: "commercial", niches: ["salon", "restaurant", "ecommerce", "clinic"], contentAngle: "Celebrate moms, gift ideas, pampering packages, family moments" },
  { name: "Father's Day", date: "2027-06-20", type: "commercial", niches: ["restaurant", "ecommerce", "salon"], contentAngle: "Dad appreciation, gifting, experiences, family outings" },
  { name: "Independence Day", date: "2027-08-15", type: "national", niches: ["ecommerce", "restaurant", "local_service"], contentAngle: "Freedom, tricolor, patriotic offers, national pride" },
  { name: "Ganesh Chaturthi", date: "2027-09-06", type: "hindu", niches: ["restaurant", "local_service", "salon"], contentAngle: "Lord Ganesha, modak, community pandals, eco-friendly themes" },
  { name: "Diwali", date: "2027-10-29", type: "hindu", niches: ["ecommerce", "restaurant", "salon", "clinic", "local_service", "franchise"], contentAngle: "Festival of lights, gifting, sweets, offers, family celebrations" },
  { name: "Christmas", date: "2027-12-25", type: "christian", niches: ["restaurant", "ecommerce", "salon", "franchise"], contentAngle: "Gifting, celebration, family, year-end warmth" },
  { name: "New Year's Eve", date: "2027-12-31", type: "commercial", niches: ["restaurant", "salon", "ecommerce"], contentAngle: "Year-end celebration, resolutions, new chapter, party specials" },
];

export function getUpcomingFestivals(daysAhead = 45, fromDate?: Date): Festival[] {
  const from = fromDate ?? new Date();
  const fromStr = from.toISOString().slice(0, 10);
  const to = new Date(from);
  to.setDate(to.getDate() + daysAhead);
  const toStr = to.toISOString().slice(0, 10);
  return FESTIVALS.filter((f) => f.date >= fromStr && f.date <= toStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getUpcomingFestivalsForNiche(niche: string, daysAhead = 45): Festival[] {
  return getUpcomingFestivals(daysAhead).filter(
    (f) => f.niches.includes(niche) || f.niches.includes("ecommerce") // commercial ones are universal
  );
}

export function daysUntil(dateStr: string, from?: Date): number {
  const base = from ?? new Date();
  base.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}
