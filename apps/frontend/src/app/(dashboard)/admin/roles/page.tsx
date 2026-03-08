import { RoleList } from "@/features/admin/components/roles/role-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function AdminRolesPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Role Management</h2>
                <div className="flex items-center space-x-2">
                    <Link href="/admin/roles/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Role
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <RoleList />
            </div>
        </div>
    );
}
