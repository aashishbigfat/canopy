"use client";

import { use } from "react";
import { DepartmentDetail } from "@/features/admin/components/departments/department-detail";

interface DepartmentDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
    const { id } = use(params);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <DepartmentDetail departmentId={id} />
        </div>
    );
}
