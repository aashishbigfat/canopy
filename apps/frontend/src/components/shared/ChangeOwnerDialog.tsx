import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetUsers } from "@/features/admin/api/use-users";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/features/admin/types";

export function ChangeOwnerDialog({
    isOpen,
    onClose,
    onConfirm,
    type = "Account",
    isLoading = false
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newOwnerId: string) => void;
    type?: string;
    isLoading?: boolean;
}) {
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const { data: usersData, isLoading: isLoadingUsers } = useGetUsers();

    const handleConfirm = () => {
        if (selectedUserId) {
            onConfirm(selectedUserId);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Change {type} Owner</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Owner</label>
                        <Select
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                            disabled={isLoadingUsers || isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a new owner"} />
                            </SelectTrigger>
                            <SelectContent>
                                {usersData?.users?.map((user: User) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                )) || usersData?.data?.map((user: User) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Close</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedUserId || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isLoading ? "Saving..." : "Change Owner"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
