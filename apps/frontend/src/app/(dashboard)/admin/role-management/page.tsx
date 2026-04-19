import { RoleList } from "@/features/admin/components/roles/role-list";
import { GuardedCreateLink } from "@/components/permissions/guarded-create-link";

export default function AdminRolesPage() {
    return (
        <div className="flex-1 min-w-0 w-full space-y-4 p-4 sm:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Role Management</h2>
                <div className="flex items-center space-x-2">
                    <GuardedCreateLink
                        resource="role"
                        href="/admin/role-management/new"
                        label="Create Role"
                    />
                </div>
            </div>
            <div className="flex h-full flex-1 flex-col space-y-8">
                <RoleList />
            </div>
        </div>
    );
}
