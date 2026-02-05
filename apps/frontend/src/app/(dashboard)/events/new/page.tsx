"use client";

import { EventForm } from "@/features/events/components/event-form";

export default function NewEventPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
                <p className="text-muted-foreground">
                    Schedule a new meeting, call, or task.
                </p>
            </div>
            <div className="rounded-md border p-6">
                <EventForm />
            </div>
        </div>
    );
}
