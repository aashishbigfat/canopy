import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetUsers } from "@/features/admin/api/use-users";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { User } from "@/features/admin/types";

export function ChangeOwnerDialog({
    isOpen,
    onClose,
    onConfirm,
    type = "Account",
    isLoading = false,
    currentOwnerId
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newOwnerId: string, newOwnerName?: string) => void;
    type?: string;
    isLoading?: boolean;
    currentOwnerId?: string;
}) {
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const { data: usersData, isLoading: isLoadingUsers } = useGetUsers();
    const users = usersData?.users || usersData?.data || [];

    // Reset the selection to the record's CURRENT owner every time the dialog
    // opens. The component stays mounted (only the Dialog toggles), so without
    // this the dropdown keeps a stale value from a previous open — e.g. showing
    // the old owner after the owner has already been changed.
    useEffect(() => {
        if (isOpen) {
            setSelectedUserId(currentOwnerId || "");
        }
    }, [isOpen, currentOwnerId]);

    const handleConfirm = () => {
        if (selectedUserId && selectedUserId !== currentOwnerId) {
            const selectedName = users.find((u: User) => u.id === selectedUserId)?.name;
            onConfirm(selectedUserId, selectedName);
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
                        <SearchableSelect
                            options={users.map((user: User) => ({
                                label: user.name,
                                value: user.id
                            }))}
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                            disabled={isLoadingUsers || isLoading}
                            placeholder={isLoadingUsers ? "Loading users..." : "Select a new owner"}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Close</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedUserId || selectedUserId === currentOwnerId || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isLoading ? "Saving..." : "Change Owner"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
