/**
 * Phase 1 frontend client — Field registry (custom fields + standard fields).
 */
import { apiClient } from "@/lib/api/client";

export type EntityType =
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "supplier"
  | "personal_account"
  | "task";

export interface AdditionalField {
  id: string;
  name: string;
  label?: string | null;
  field_type: string;
  type_value?: string | null;
  description?: string | null;
  default_value?: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  sorting: number;
  options: string[];
  created_at: string;
  updated_at: string;
}

export interface AdditionalFieldCreate {
  name: string;
  label?: string | null;
  field_type: string;
  type_value?: string | null;
  description?: string | null;
  default_value?: string | null;
  is_mandatory?: boolean;
  is_active?: boolean;
  sorting?: number;
  options?: string[];
}

export type AdditionalFieldUpdate = Partial<AdditionalFieldCreate>;

export interface StandardField {
  id: string;
  entity_type: string;
  field_key: string;
  label?: string | null;
  field_type: string;
  default_value?: string | null;
  type_value?: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  system_mandatory: boolean;
  sorting: number;
  created_at: string;
  updated_at: string;
}

export interface StandardFieldUpsert {
  entity_type: EntityType;
  field_key: string;
  label?: string | null;
  field_type?: string;
  default_value?: string | null;
  type_value?: string | null;
  is_active?: boolean;
  is_mandatory?: boolean;
  system_mandatory?: boolean;
  sorting?: number;
}

export interface CustomFieldValuePayload {
  additional_field_id: string;
  field_value: string;
}

export interface CustomFieldValueRead {
  [additional_field_id: string]: {
    value: string;
    type: string;
    name?: string | null;
    label?: string | null;
  };
}

const CUSTOM = "/custom_fields";
const STANDARD = "/standard_fields";

export const customFieldsService = {
  list: async (entity: EntityType, activeOnly = false): Promise<AdditionalField[]> => {
    const { data } = await apiClient.get<AdditionalField[]>(`${CUSTOM}/${entity}`, {
      params: { active_only: activeOnly },
    });
    return data;
  },

  listActive: async (entity: EntityType): Promise<AdditionalField[]> => {
    const { data } = await apiClient.get<AdditionalField[]>(`${CUSTOM}/${entity}/active`);
    return data;
  },

  get: async (entity: EntityType, id: string): Promise<AdditionalField> => {
    const { data } = await apiClient.get<AdditionalField>(`${CUSTOM}/${entity}/${id}`);
    return data;
  },

  create: async (entity: EntityType, payload: AdditionalFieldCreate): Promise<AdditionalField> => {
    const { data } = await apiClient.post<AdditionalField>(`${CUSTOM}/${entity}`, payload);
    return data;
  },

  update: async (
    entity: EntityType,
    id: string,
    payload: AdditionalFieldUpdate,
  ): Promise<AdditionalField> => {
    const { data } = await apiClient.put<AdditionalField>(`${CUSTOM}/${entity}/${id}`, payload);
    return data;
  },

  delete: async (entity: EntityType, id: string): Promise<void> => {
    await apiClient.delete(`${CUSTOM}/${entity}/${id}`);
  },

  sort: async (
    entity: EntityType,
    items: { id: string; sorting: number }[],
  ): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ updated: number }>(`${CUSTOM}/${entity}/sort`, { items });
    return data;
  },

  toggleStatus: async (
    entity: EntityType,
    id: string,
    isActive: boolean,
  ): Promise<AdditionalField> => {
    const { data } = await apiClient.post<AdditionalField>(`${CUSTOM}/${entity}/status`, {
      id,
      is_active: isActive,
    });
    return data;
  },

  toggleMandatory: async (
    entity: EntityType,
    id: string,
    isMandatory: boolean,
  ): Promise<AdditionalField> => {
    const { data } = await apiClient.post<AdditionalField>(`${CUSTOM}/${entity}/mandatory`, {
      id,
      is_mandatory: isMandatory,
    });
    return data;
  },

  templateTokens: async (
    entity: EntityType,
  ): Promise<{ token: string; label: string; id: string }[]> => {
    const { data } = await apiClient.get<{ token: string; label: string; id: string }[]>(
      `${CUSTOM}/${entity}/template-tokens`,
    );
    return data;
  },

  readValues: async (
    entity: EntityType,
    entityId: string,
  ): Promise<CustomFieldValueRead> => {
    const { data } = await apiClient.get<CustomFieldValueRead>(
      `${CUSTOM}/${entity}/values/${entityId}`,
    );
    return data;
  },
};

export const standardFieldsService = {
  list: async (entity: EntityType, activeOnly = false): Promise<StandardField[]> => {
    const { data } = await apiClient.get<StandardField[]>(`${STANDARD}/${entity}`, {
      params: { active_only: activeOnly },
    });
    return data;
  },

  upsert: async (entity: EntityType, payload: StandardFieldUpsert): Promise<StandardField> => {
    const { data } = await apiClient.post<StandardField>(`${STANDARD}/${entity}`, payload);
    return data;
  },

  update: async (
    entity: EntityType,
    id: string,
    payload: Partial<StandardFieldUpsert>,
  ): Promise<StandardField> => {
    const { data } = await apiClient.put<StandardField>(`${STANDARD}/${entity}/${id}`, payload);
    return data;
  },

  sort: async (
    entity: EntityType,
    items: { id: string; sorting: number }[],
  ): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ updated: number }>(`${STANDARD}/${entity}/sort`, {
      items,
    });
    return data;
  },

  toggleStatus: async (
    entity: EntityType,
    id: string,
    isActive: boolean,
  ): Promise<StandardField> => {
    const { data } = await apiClient.post<StandardField>(`${STANDARD}/${entity}/status`, {
      id,
      is_active: isActive,
    });
    return data;
  },

  toggleMandatory: async (
    entity: EntityType,
    id: string,
    isMandatory: boolean,
  ): Promise<StandardField> => {
    const { data } = await apiClient.post<StandardField>(`${STANDARD}/${entity}/mandatory`, {
      id,
      is_mandatory: isMandatory,
    });
    return data;
  },
};
