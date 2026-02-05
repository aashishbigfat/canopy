"use client";

import { useGetEvents } from "@/features/events/api/use-events";
import { EventList } from "@/features/events/components/event-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function EventsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const { data, isLoading } = useGetEvents(page, 10, search);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Events</h1>
                    <p className="text-muted-foreground">
                        Manage your calendar, meetings, and calls.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/events/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Event
                    </Link>
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <Input
                    placeholder="Search events..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <EventList events={data?.events || []} isLoading={isLoading} />

            {data && data.pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="py-2">
                        Page {data.pagination.current_page} of {data.pagination.pages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                        disabled={page === data.pagination.pages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
