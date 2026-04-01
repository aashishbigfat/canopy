import { Map } from "lucide-react";

export default function ItinerariesPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="p-4 bg-indigo-50 rounded-full">
                <Map className="w-12 h-12 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Itineraries</h1>
            <p className="text-slate-500 max-w-md">
                Managing itineraries is coming soon. This module will allow you to create and manage travel plans for your clients.
            </p>
        </div>
    );
}
