/**
 * Sprint A2 day-level mutations + base itinerary fetch.
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/itineraries";

export interface ItineraryDay {
  id: string;
  itinerary_id: string;
  day_number: number;
  title: string;
  description?: string | null;
  city?: string | null;
  destination_id?: string | null;
  hotel_name?: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  transport_mode?: string | null;
  transport_details?: string | null;
}

export const itineraryDayService = {
  // GET via existing itineraries router (assumes day list endpoint exists)
  listDays: async (itineraryId: string): Promise<ItineraryDay[]> => {
    try {
      const { data } = await apiClient.get(`${BASE}/${itineraryId}/days`);
      return data;
    } catch {
      return [];
    }
  },
  updateDayDestinations: async (itineraryId: string, dayId: string, destinationIds: string[]) =>
    (await apiClient.post(`${BASE}/${itineraryId}/days/${dayId}/destinations`, {
      destination_ids: destinationIds,
    })).data,
  updateDayDescriptions: async (
    itineraryId: string,
    dayId: string,
    payload: { title?: string; description?: string },
  ) =>
    (await apiClient.post(`${BASE}/${itineraryId}/days/${dayId}/descriptions`, payload)).data,
  updateDayInclusions: async (itineraryId: string, dayId: string, inclusionIds: string[]) =>
    (await apiClient.post(`${BASE}/${itineraryId}/days/${dayId}/inclusions`, {
      inclusion_ids: inclusionIds,
    })).data,
  publishHtml: async (itineraryId: string, templateId?: string, templateTypeId?: number) =>
    (
      await apiClient.get(`${BASE}/${itineraryId}/publish-html`, {
        params: { template_id: templateId, template_type_id: templateTypeId },
      })
    ).data,
};
