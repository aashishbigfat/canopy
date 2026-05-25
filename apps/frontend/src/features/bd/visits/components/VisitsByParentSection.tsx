"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, MapPin } from "lucide-react";
import { useBDVisitsByParent } from "../api/useBDVisits";
import { VisitFormDialog } from "./VisitFormDialog";
import type { BDVisitableType } from "../types";

interface Props {
  parentType: BDVisitableType;
  parentId: string;
  parentName?: string;
}

export function VisitsByParentSection({ parentType, parentId, parentName }: Props) {
  const { data, isLoading } = useBDVisitsByParent(parentType, parentId);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" /> BD Visits
          {data && <Badge variant="outline">{data.total}</Badge>}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Schedule
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (data?.visits.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No visits scheduled yet.</p>
        ) : (
          <ul className="divide-y">
            {data!.visits.map((v) => (
              <li key={v.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/bd/visits/${v.id}`} className="font-medium hover:underline">
                    {v.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {v.activity_type_name || "Visit"} · {new Date(v.scheduled_date).toLocaleString()} · {v.owner_name || "Unassigned"}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-xs">{v.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <VisitFormDialog
        open={open}
        onOpenChange={setOpen}
        defaults={{
          bd_visitable_type: parentType,
          bd_visitable_id: parentId,
          parent_name: parentName,
          title: parentName ? `Visit: ${parentName}` : undefined,
        }}
      />
    </Card>
  );
}
