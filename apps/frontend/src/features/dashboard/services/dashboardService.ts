import { apiClient } from "@/lib/api/client";
import { AxiosError } from "axios";

export interface DashboardStats {
    total_revenue: number;
    revenue_change: number;
    active_opportunities: number;
    opportunities_change: number;
    active_leads: number;
    leads_change: number;
    sales_activity: number;
    activity_change: number;

    // Real-time fields
    total_opportunities: number;
    today_opportunities: number;
    open_opportunities: number;
    b2c_open_opportunities: number;
    b2b_open_opportunities: number;
    b2b_direct_open_opportunities: number;
    today_checkout: number;
    tomorrow_departures: number;
    today_revenue: number;
}

export interface RecentSale {
    id: string;
    customer_name: string;
    email: string;
    amount: number;
    date: string;
}

export interface DashboardData {
    stats: DashboardStats;
    recent_sales: RecentSale[];
    revenue_chart: any[];
    opportunities_by_stage: any[];
}

/** Leader board KPIs (Tutterfly reference: Dashboard Leader Board Incentive) */
export interface LeaderBoardKPIs {
    total_opportunities: number;
    today_opportunities: number;
    open_opportunities: number;
    b2c_open_opportunities: number;
    b2b_open_opportunities: number;
    b2b_direct_open_opportunities: number;
    today_checkout: number;
    tomorrow_departures: number;
    today_revenue: number;
}

/** Single data point for Target / Sales chart */
export interface SalesChartPoint {
    day: number;
    sale_last_month?: number;
    sale_this_month?: number;
    target?: number;
}

/** User activity entry for timeline */
export interface UserActivity {
    id: string;
    type: "task" | "personal_account" | "opportunity" | "lead" | "contact" | "account";
    title: string;
    description: string;
    user_name: string;
    created_at: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    description: string;
    created_at: string;
}

const BASE_URL = "/dashboards";

const emptyDashboardData: DashboardData = {
    stats: {
        total_revenue: 0,
        revenue_change: 0,
        active_opportunities: 0,
        opportunities_change: 0,
        active_leads: 0,
        leads_change: 0,
        sales_activity: 0,
        activity_change: 0,
        total_opportunities: 0,
        today_opportunities: 0,
        open_opportunities: 0,
        b2c_open_opportunities: 0,
        b2b_open_opportunities: 0,
        b2b_direct_open_opportunities: 0,
        today_checkout: 0,
        tomorrow_departures: 0,
        today_revenue: 0,
    },
    recent_sales: [],
    revenue_chart: [],
    opportunities_by_stage: [],
};

/** Build leader board KPIs from API stats (or defaults). */
export function getLeaderBoardKPIs(data: DashboardData): LeaderBoardKPIs {
    const s = data?.stats;
    return {
        total_opportunities: s?.total_opportunities ?? s?.active_opportunities ?? 0,
        today_opportunities: s?.today_opportunities ?? 0,
        open_opportunities: s?.open_opportunities ?? s?.active_opportunities ?? 0,
        b2c_open_opportunities: s?.b2c_open_opportunities ?? 0,
        b2b_open_opportunities: s?.b2b_open_opportunities ?? 0,
        b2b_direct_open_opportunities: s?.b2b_direct_open_opportunities ?? 0,
        today_checkout: s?.today_checkout ?? 0,
        tomorrow_departures: s?.tomorrow_departures ?? 0,
        today_revenue: s?.today_revenue ?? s?.total_revenue ?? 0,
    };
}

/** Build chart data from backend. If no data yet, return empty and let UI show an empty state. */
export function getSalesChartData(data: DashboardData): SalesChartPoint[] {
    const chart = data?.revenue_chart;
    if (Array.isArray(chart) && chart.length > 0) {
        return chart.map((p: any, i: number) => ({
            day: i + 1,
            sale_last_month: p.sale_last_month ?? p.last_month,
            sale_this_month: p.sale_this_month ?? p.this_month,
            target: p.target ?? 100000000,
        }));
    }
    // No chart data from backend yet – return empty so graph is not faked
    return [];
}

export function getUserActivities(data: DashboardData): UserActivity[] {
    // This is now handled by getActivityLogs, but keeping for compatibility if needed
    return [];
}

export const dashboardService = {
    getDashboardData: async (dashboardId?: string): Promise<DashboardData> => {
        const url = dashboardId ? `${BASE_URL}/${dashboardId}` : `${BASE_URL}/default`;
        try {
            const { data } = await apiClient.get<DashboardData>(url);
            return data;
        } catch (err) {
            const axiosErr = err as AxiosError<unknown>;
            // Backend may not implement /dashboards/default (404); return empty data so UI still renders
            if (axiosErr.response?.status === 404) {
                return emptyDashboardData;
            }
            throw err;
        }
    },

    getStats: async (): Promise<DashboardStats> => {
        const { data } = await apiClient.get<any>(`${BASE_URL}/stats`);

        // Map backend AnalyticsSummary to frontend DashboardStats
        return {
            total_revenue: data.revenue_this_month || 0,
            revenue_change: 0,
            active_opportunities: data.opportunities_total || 0,
            opportunities_change: 0,
            active_leads: data.leads_total || 0,
            leads_change: 0,
            sales_activity: 0,
            activity_change: 0,

            // Map real-time fields
            total_opportunities: data.total_opportunities || 0,
            today_opportunities: data.today_opportunities || 0,
            open_opportunities: data.open_opportunities || 0,
            b2c_open_opportunities: data.b2c_open_opportunities || 0,
            b2b_open_opportunities: data.b2b_open_opportunities || 0,
            b2b_direct_open_opportunities: data.b2b_direct_open_opportunities || 0,
            today_checkout: data.today_checkout || 0,
            tomorrow_departures: data.tomorrow_departures || 0,
            today_revenue: data.today_revenue || 0,
        };
    },

    getRecentSales: async (limit: number = 10) => {
        const { data } = await apiClient.get<RecentSale[]>(`${BASE_URL}/recent-sales`, {
            params: { limit }
        });
        return data;
    },

    getRevenueChart: async (period: 'week' | 'month' | 'year' = 'month') => {
        const { data } = await apiClient.get<any[]>(`${BASE_URL}/revenue-chart`, {
            params: { period }
        });
        return data;
    },

    getOpportunitiesByStage: async () => {
        const { data } = await apiClient.get<any[]>(`${BASE_URL}/opportunities-by-stage`);
        return data;
    },

    getMyDashboards: async () => {
        const { data } = await apiClient.get<any[]>(BASE_URL);
        return data;
    },

    createDashboard: async (dashboardData: any) => {
        const { data } = await apiClient.post<any>(BASE_URL, dashboardData);
        return data;
    },

    updateDashboard: async (id: string, dashboardData: any) => {
        const { data } = await apiClient.put<any>(`${BASE_URL}/${id}`, dashboardData);
        return data;
    },

    deleteDashboard: async (id: string) => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    getActivityLogs: async (limit: number = 50): Promise<ActivityLog[]> => {
        try {
            const { data } = await apiClient.get<{ logs: ActivityLog[]; total: number }>("/timeline/events/", {
                params: { limit }
            });
            return data.logs;
        } catch (err) {
            console.warn("Failed to fetch activity logs (possibly blocked by browser):", err);
            return [];
        }
    },

    getKeyDeals: async (limit: number = 5) => {
        const { data } = await apiClient.get<any[]>(`${BASE_URL}/analytics/key-deals`, {
            params: { limit }
        });
        return data;
    },

    getTaskSummary: async () => {
        const { data } = await apiClient.get<any>(`${BASE_URL}/analytics/tasks-summary`);
        return data;
    },
};
