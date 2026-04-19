import { UserList } from "@/features/admin/components/users/user-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function AdminUsersPage() {
    return (
        <div className="flex-1 min-w-0 w-full space-y-4 p-4 sm:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight">User Management</h2>
                <div className="flex items-center space-x-2">
                    <Link href="/admin/users/new">
                        <Button size="sm" className="sm:h-10 sm:px-4 sm:py-2">
                            <Plus className="mr-1 sm:mr-2 h-4 w-4" /> Add User
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="flex h-full flex-1 flex-col space-y-8">
                <UserList />
            </div>
        </div>
    );
}
