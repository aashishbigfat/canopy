import { DepartmentList } from "@/features/admin/components/departments/department-list";

export default function AdminDepartmentsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
            </div>
            <div className="flex h-full flex-1 flex-col space-y-8">
                <DepartmentList />
            </div>
        </div>
    );
}
