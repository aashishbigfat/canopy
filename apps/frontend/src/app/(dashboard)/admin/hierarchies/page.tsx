import { HierarchyList } from "@/features/admin/components/hierarchies/hierarchy-list";

export default function AdminHierarchiesPage() {
    return (
        <div className="crm-page p-4 sm:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
                <h2>Role Hierarchy</h2>
            </div>
            <HierarchyList />
        </div>
    );
}
