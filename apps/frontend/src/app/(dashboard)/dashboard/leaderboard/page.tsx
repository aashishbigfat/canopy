"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useIndustry } from "@/lib/industry-labels";
import {
  dashboardsExtraService,
  type LeaderboardRow,
} from "@/lib/api/services/dashboards-extra.service";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Loader2, Trophy, Medal } from "lucide-react";

const RANK_COLORS: Record<number, string> = {
  1: "bg-yellow-400 text-yellow-900",
  2: "bg-slate-400 text-slate-900",
  3: "bg-amber-600 text-amber-100",
};

function RankBadge({ rank }: { rank: number }) {
  const cls = RANK_COLORS[rank] ?? "bg-indigo-600 text-white";
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
        cls
      )}
    >
      {rank}
    </span>
  );
}

function AccoladeBadge({ emoji, name }: { emoji: string; name: string }) {
  return (
    <span
      title={name}
      className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
    >
      {emoji} <span className="hidden sm:inline">{name}</span>
    </span>
  );
}

function TopPerformerCard({ row }: { row: LeaderboardRow }) {
  const industry = useIndustry();
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600/20">
        {row.avatar_url ? (
          <img src={row.avatar_url} className="h-full w-full rounded-full object-cover" alt={row.name} />
        ) : (
          <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
            {row.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-yellow-900 text-sm font-bold shadow">
          1
        </span>
      </div>

      <div>
        <p className="text-lg font-bold text-foreground">{row.name}</p>
        <p className="text-sm text-muted-foreground">
          Score: {row.score.toLocaleString("en-IN")} &nbsp;|&nbsp; CCR:{" "}
          {row.ccr.toFixed(2)}%
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xl font-bold text-blue-400">{row.close_won}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Close Won</p>
        </div>
        {industry === "travel" && (
          <div>
            <p className="text-xl font-bold text-teal-400">{row.no_of_pax.toLocaleString("en-IN")}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">No. of Pax</p>
          </div>
        )}
        <div>
          <p className="text-xl font-bold text-violet-400">
            {formatCurrency(row.revenue)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
        </div>
      </div>

      {row.accolades.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {row.accolades.map((a, i) => (
            <AccoladeBadge key={i} emoji={a.emoji} name={a.name} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const industry = useIndustry();
  const [period, setPeriod] = useState<"current_month" | "last_month">("current_month");

  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", period, session?.user?.id ?? "anon"],
    queryFn: () => dashboardsExtraService.leaderboard(period),
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.rows ?? [];
  const top = rows[0];
  const rest = rows.slice(1);

  return (
    <div className="crm-page space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leader Board</h1>
          {data?.period_label && (
            <p className="text-sm text-muted-foreground">{data.period_label}</p>
          )}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
          <button
            className={cn(
              "px-4 py-2 transition-colors",
              period === "current_month"
                ? "bg-indigo-600 text-white"
                : "bg-card text-muted-foreground hover:bg-accent"
            )}
            onClick={() => setPeriod("current_month")}
          >
            This Month
          </button>
          <button
            className={cn(
              "px-4 py-2 transition-colors",
              period === "last_month"
                ? "bg-indigo-600 text-white"
                : "bg-card text-muted-foreground hover:bg-accent"
            )}
            onClick={() => setPeriod("last_month")}
          >
            Last Month
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">
          Failed to load leaderboard data.
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
          <div className="text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No leaderboard data for this period.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Configure scoring parameters in Settings → Leaderboard.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Ranked list — takes 2/3 width */}
          <div className="lg:col-span-2 space-y-2">
            {rest.map((row) => (
              <div
                key={row.user_id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:bg-accent/40 transition-colors"
              >
                <RankBadge rank={row.rank} />

                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600/20">
                  {row.avatar_url ? (
                    <img
                      src={row.avatar_url}
                      className="h-full w-full rounded-full object-cover"
                      alt={row.name}
                    />
                  ) : (
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                      {row.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name + score */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {row.score.toLocaleString("en-IN")} &nbsp; CCR: {row.ccr.toFixed(2)}%
                  </p>
                </div>

                {/* Metrics */}
                <div className="hidden sm:flex items-center gap-6 text-right text-sm">
                  <div>
                    <p className="font-bold text-blue-400">{row.close_won}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Close Won</p>
                  </div>
                  {industry === "travel" && (
                    <div>
                      <p className="font-bold text-teal-400">{row.no_of_pax.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">No. of Pax</p>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-violet-400">{formatCurrency(row.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
                  </div>
                </div>

                {/* Accolades */}
                {row.accolades.length > 0 && (
                  <div className="hidden md:flex flex-wrap gap-1">
                    {row.accolades.slice(0, 2).map((a, i) => (
                      <span key={i} title={a.name} className="text-lg">{a.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Top performer card — 1/3 width */}
          <div>
            {top && <TopPerformerCard row={top} />}
          </div>
        </div>
      )}
    </div>
  );
}
