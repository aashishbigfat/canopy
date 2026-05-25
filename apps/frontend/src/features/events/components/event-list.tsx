"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Event } from "@/features/events/types";
import { EventActions } from "./event-actions";
import { Badge } from "@/components/ui/badge";

interface EventListProps {
    events: Event[];
    isLoading: boolean;
}

export function EventList({ events, isLoading }: EventListProps) {
    if (isLoading) {
        return <div className="p-4 text-center">Loading events...</div>;
    }

    if (events.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No events found.</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Planned": return "bg-blue-500/20 text-blue-300";
            case "Held": return "bg-green-500/20 text-green-300";
            case "Not Held": return "bg-yellow-500/20 text-yellow-300";
            case "Cancelled": return "bg-red-500/20 text-red-300";
            default: return "bg-slate-700 text-slate-100";
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Related To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {events.map((event) => (
                        <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.name}</TableCell>
                            <TableCell>{event.event_type}</TableCell>
                            <TableCell>
                                {format(new Date(event.start_datetime), "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell>
                                {format(new Date(event.end_datetime), "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell>
                                {event.eventable_type ? (
                                    <span className="text-sm text-muted-foreground">
                                        {event.eventable_type}
                                    </span>
                                ) : (
                                    "-"
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={getStatusColor(event.status)}>
                                    {event.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <EventActions event={event} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
