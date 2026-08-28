import { UserList } from "@/features/admin/components/users/user-list";

export default function AdminUsersPage() {
    return (
        <div className="crm-page p-4 sm:p-8 pt-4 sm:pt-6">
            <UserList />
        </div>
    );
}
