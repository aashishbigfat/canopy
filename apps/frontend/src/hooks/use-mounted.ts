"use client";

import { useEffect, useState } from "react";

/**
 * Returns true after the component has mounted on the client.
 *
 * Use it to gate render of layout-measuring widgets (e.g. Recharts'
 * ResponsiveContainer) so they only render once a real DOM layout pass has
 * happened. Without this, ResponsiveContainer initialises at width/height -1
 * and logs "width(-1) and height(-1)" warnings during React StrictMode's
 * dev double-render.
 */
export function useMounted(): boolean {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    return mounted;
}
