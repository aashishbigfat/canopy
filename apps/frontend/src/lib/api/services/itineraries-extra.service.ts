/**
 * Phase 5 — Itinerary engine (categories / schedule / hotels / flights / PDF / proforma).
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/itineraries";

export interface ItineraryCategory {
  id: string;
  name: string;
  description?: string | null;
  sorting: number;
  is_active: boolean;
}

export interface ItineraryHotel {
  id: string;
  itinerary_id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  nights?: number | null;
  rooms?: number | null;
  pax?: number | null;
  cost?: number | null;
  currency?: string | null;
  star_rating?: number | null;
  confirmation_no?: string | null;
}

export interface ItineraryFlight {
  id: string;
  itinerary_id: string;
  airline?: string | null;
  flight_no?: string | null;
  cabin_class?: string | null;
  from_city?: string | null;
  to_city?: string | null;
  depart_at?: string | null;
  arrive_at?: string | null;
  pax?: number | null;
  cost?: number | null;
  currency?: string | null;
  pnr?: string | null;
}

export interface ProformaInvoice {
  id: string;
  invoice_no?: string | null;
  status: string;
  total: number;
  currency: string;
  pdf_url?: string | null;
  issued_to_name?: string | null;
}

export interface PDFJob {
  id: string;
  itinerary_id: string;
  status: string;
  pdf_url?: string | null;
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export const itineraryExtrasService = {
  // categories
  listCategories: async (): Promise<ItineraryCategory[]> =>
    (await apiClient.get(`${BASE}/categories`)).data,
  createCategory: async (payload: { name: string; description?: string; sorting?: number }) =>
    (await apiClient.post(`${BASE}/categories`, payload)).data,
  // hotels
  listHotels: async (itineraryId?: string): Promise<ItineraryHotel[]> =>
    (await apiClient.get(`${BASE}/hotels`, { params: itineraryId ? { itinerary_id: itineraryId } : {} })).data,
  createHotel: async (payload: any): Promise<ItineraryHotel> =>
    (await apiClient.post(`${BASE}/hotels`, payload)).data,
  searchHotels: async (query: any) => (await apiClient.post(`${BASE}/hotels/search`, query)).data,
  // flights
  listFlights: async (itineraryId?: string): Promise<ItineraryFlight[]> =>
    (await apiClient.get(`${BASE}/flights`, { params: itineraryId ? { itinerary_id: itineraryId } : {} })).data,
  createFlight: async (payload: any): Promise<ItineraryFlight> =>
    (await apiClient.post(`${BASE}/flights`, payload)).data,
  searchFlights: async (query: any) => (await apiClient.post(`${BASE}/flights/search`, query)).data,
  // tour
  listTour: async () => (await apiClient.get(`${BASE}/tour`)).data,
  createTour: async (payload: any) => (await apiClient.post(`${BASE}/tour`, payload)).data,
  copyTour: async (id: string) => (await apiClient.post(`${BASE}/tour/${id}/copy`)).data,
  // proforma
  listProforma: async (): Promise<ProformaInvoice[]> =>
    (await apiClient.get(`${BASE}/proforma`)).data,
  createProforma: async (payload: any): Promise<ProformaInvoice> =>
    (await apiClient.post(`${BASE}/proforma`, payload)).data,
  generateProforma: async (id: string) =>
    (await apiClient.post(`${BASE}/proforma/${id}/generate`)).data,
  emailProforma: async (id: string, to: string) =>
    (await apiClient.post(`${BASE}/proforma/${id}/email`, { to })).data,
  // pdf
  requestPdf: async (payload: { itinerary_id: string; template_id?: string; template_type_id?: number }): Promise<PDFJob> =>
    (await apiClient.post(`${BASE}/pdf/request`, payload)).data,
  pdfStatus: async (jobId: string): Promise<PDFJob> =>
    (await apiClient.get(`${BASE}/pdf/${jobId}/status`)).data,
  // header / footer
  listHeaderFooters: async (type?: "header" | "footer" | "banner") =>
    (await apiClient.get(`${BASE}/header-footers`, { params: type ? { type } : {} })).data,
  // copy / attach
  copyItinerary: async (id: string) => (await apiClient.post(`${BASE}/${id}/copy`)).data,
  attachToOpportunity: async (id: string, opportunityId: string, notes?: string) =>
    (await apiClient.post(`${BASE}/${id}/attach-opportunity`, {
      opportunity_id: opportunityId,
      notes,
    })).data,
};
