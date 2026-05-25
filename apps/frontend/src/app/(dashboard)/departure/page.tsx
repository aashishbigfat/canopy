import { LogOut } from "lucide-react";

export default function DeparturePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="p-4 bg-amber-500/20 rounded-full">
                <LogOut className="w-12 h-12 text-amber-300" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Departures</h1>
            <p className="text-slate-400 max-w-md">
                The Departures module is currently under development. Here you will be able to track all upcoming client departures and logistics.
            </p>
        </div>
    );
}
