import "server-only";

import type { GBPReview } from "@/types";

type PlacesApiReview = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  authorAttribution?: { displayName?: string; photoUri?: string };
  publishTime?: string;
};

type PlacesApiResponse = {
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesApiReview[];
};

export type PlaceResult = {
  rating: number | null;
  reviewCount: number | null;
  reviews: GBPReview[];
};

export async function pullPlaceData(placeId: string, mapsApiKey: string): Promise<PlaceResult | null> {
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": mapsApiKey,
          "X-Goog-FieldMask": "id,rating,userRatingCount,reviews",
        },
      }
    );
    if (!response.ok) {
      console.error(`Places API error: ${response.status} ${await response.text().catch(() => "")}`);
      return null;
    }
    const data = (await response.json()) as PlacesApiResponse;
    const reviews: GBPReview[] = (data.reviews ?? []).map((r, i) => {
      const rating = Math.max(1, Math.min(5, Math.round(r.rating ?? 3))) as 1 | 2 | 3 | 4 | 5;
      return {
        reviewId: r.name ?? `place-review-${i}`,
        starRating: rating,
        comment: r.text?.text ?? "",
        createTime: r.publishTime ?? new Date().toISOString(),
        reviewerDisplayName: r.authorAttribution?.displayName ?? "Anonymous",
        reviewerPhotoUrl: r.authorAttribution?.photoUri,
      };
    });
    return {
      rating: data.rating ?? null,
      reviewCount: data.userRatingCount ?? null,
      reviews,
    };
  } catch (err) {
    console.error("Places API fetch failed:", err);
    return null;
  }
}
