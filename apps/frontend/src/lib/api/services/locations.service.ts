import { apiClient } from "@/lib/api/client";

export interface Country {
    id: string;
    name: string;
    code: string;
    phone_code: string;
    currency: string;
    currency_symbol: string;
}

export interface State {
    id: string;
    name: string;
    code: string;
    country_id: string;
}

export interface City {
    id: string;
    name: string;
    state_id: string;
    country_id: string;
}

export const locationService = {
    // Country methods
    getCountries: async (isPopular?: boolean): Promise<{ countries: Country[] }> => {
        const params = new URLSearchParams();
        if (isPopular) params.append("is_popular", "true");
        const { data } = await apiClient.get(`/countries/?${params.toString()}`);
        return data;
    },

    searchCountries: async (query: string): Promise<{ countries: Country[] }> => {
        const { data } = await apiClient.get(`/countries/search?query=${query}`);
        return data;
    },

    getCountry: async (id: string): Promise<Country> => {
        const { data } = await apiClient.get(`/countries/${id}`);
        return data;
    },

    // State methods
    getStates: async (countryId: string): Promise<{ states: State[] }> => {
        const { data } = await apiClient.get(`/countries/${countryId}/states`);
        return data;
    },

    searchStates: async (query: string, countryId?: string): Promise<{ states: State[] }> => {
        let url = `/countries/states/search?query=${query}`;
        if (countryId) url += `&country_id=${countryId}`;
        const { data } = await apiClient.get(url);
        return data;
    },

    // City methods
    getCitiesByState: async (stateId: string): Promise<{ cities: City[] }> => {
        const { data } = await apiClient.get(`/countries/states/${stateId}/cities`);
        return data;
    },

    searchCities: async (query: string, countryId?: string, stateId?: string): Promise<{ cities: City[] }> => {
        let url = `/countries/cities/search?query=${query}`;
        if (countryId) url += `&country_id=${countryId}`;
        if (stateId) url += `&state_id=${stateId}`;
        const { data } = await apiClient.get(url);
        return data;
    }
};
