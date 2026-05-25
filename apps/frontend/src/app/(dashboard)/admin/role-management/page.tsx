import { RoleList } from "@/features/admin/components/roles/role-list";

export default function AdminRolesPage() {
    return (
        <div className="crm-page p-4 sm:p-8 pt-4 sm:pt-6">
            <h2 className="mb-4">Profiles &amp; Permissions</h2>
            <RoleList />
        </div>
    );
}
