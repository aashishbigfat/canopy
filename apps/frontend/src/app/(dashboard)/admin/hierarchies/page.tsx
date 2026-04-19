import { HierarchyList } from "@/features/admin/components/hierarchies/hierarchy-list";
import { GuardedCreateLink } from "@/components/permissions/guarded-create-link";

export default function AdminHierarchiesPage() {
    return (
        <div className="flex-1 min-w-0 w-full space-y-4 p-4 sm:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Hierarchy Management</h2>
                <div className="flex items-center space-x-2">
                    <GuardedCreateLink
                        resource="department"
                        href="/admin/hierarchies/new"
                        label="Create Hierarchy"
                    />
                </div>
            </div>
            <div className="flex h-full flex-1 flex-col space-y-8">
                <HierarchyList />
            </div>
        </div>
    );
}
