export interface Event {
    id: string;
    _id: string; // Alias for id
    name: string;
    description?: string;
    location?: string;
    start_datetime: string; // ISO date string
    end_datetime: string; // ISO date string
    all_day: boolean;
    event_type: string;
    eventable_type?: 'Account' | 'Contact' | 'Lead' | 'Opportunity';
    eventable_id?: string;
    contact_id?: string;
    account_id?: string;
    assigned_user_ids: string[];
    owner_id: string;
    status: 'Planned' | 'Held' | 'Not Held' | 'Cancelled';
    reminder_minutes?: number;
    reminder_sent: boolean;
    created_at: string;
    updated_at: string;
}

export type EventCreate = Omit<Event, 'id' | '_id' | 'created_at' | 'updated_at' | 'owner_id' | 'reminder_sent'>;

export type EventUpdate = Partial<EventCreate>;

export interface EventResponse {
    events: Event[];
    pagination: {
        current_page: number;
        total: number;
        per_page: number;
        pages: number;
    };
    users: {
        id: string;
        name: string;
        email: string;
    }[];
}
