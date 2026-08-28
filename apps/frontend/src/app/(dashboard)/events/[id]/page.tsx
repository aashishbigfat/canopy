"use client";

import { useGetEvent } from "@/features/events/api/use-events";
import { EventForm } from "@/features/events/components/event-form";
import { useParams } from "next/navigation";

export default function EditEventPage() {
    const params = useParams();
    const id = params.id as string;
    const { data: event, isLoading } = useGetEvent(id);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!event) {
        return <div>Event not found</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
                <p className="text-muted-foreground">
                    Update event details.
                </p>
            </div>
            <div className="rounded-md border p-6">
                <EventForm initialData={event} />
            </div>
        </div>
    );
}
