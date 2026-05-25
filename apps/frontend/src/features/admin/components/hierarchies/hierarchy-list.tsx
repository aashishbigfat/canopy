"use client";

import { useMemo, useState } from "react";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Pencil, Trash2 } from "lucide-react";
import { useGetHierarchies } from "@/features/admin/api/use-hierarchies";
import { Hierarchy } from "@/features/admin/types/hierarchies";
import { useCreateHierarchy, useUpdateHierarchy, useDeleteHierarchy } from "@/features/admin/api/use-hierarchies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useCrudPermissions } from "@/hooks/use-crud-permissions";

type TreeNode = Hierarchy & { children: TreeNode[] };

function hierarchyApiErrorMessage(err: unknown): string {
    if (err instanceof AxiosError) {
        const data = err.response?.data as { detail?: unknown } | undefined;
        const d = data?.detail;
        if (typeof d === "string") return d;
        if (Array.isArray(d) && d.length) {
            const first = d[0] as { msg?: string };
            return first?.msg ?? err.message;
        }
    }
    if (err instanceof Error) return err.message;
    return "Could not save hierarchy";
}

function buildTree(items: Hierarchy[]): TreeNode[] {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    items.forEach((item) => {
        const id = item._id || item.id;
        if (!id) return;
        map.set(id, { ...item, children: [] });
    });

    map.forEach((node) => {
        const parentId = node.parent_id || "";
        if (parentId && map.has(parentId)) {
            map.get(parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

function flattenTree(nodes: TreeNode[], depth = 0): Array<{ node: TreeNode; depth: number }> {
    const flat: Array<{ node: TreeNode; depth: number }> = [];
    for (const node of nodes) {
        flat.push({ node, depth });
        flat.push(...flattenTree(node.children, depth + 1));
    }
    return flat;
}

function isInSubtreeOf(
    hierarchies: Hierarchy[],
    candidateId: string,
    ancestorId: string
): boolean {
    if (candidateId === ancestorId) return true;
    let current = hierarchies.find((h) => (h._id || h.id) === candidateId);
    const seen = new Set<string>();
    while (current?.parent_id) {
        const pid = String(current.parent_id);
        if (pid === ancestorId) return true;
        if (seen.has(pid)) break;
        seen.add(pid);
        current = hierarchies.find((h) => (h._id || h.id) === pid);
    }
    return false;
}

// ---------------------------------------------------------------------------
// Row component — matches the reference Roles UI
// ---------------------------------------------------------------------------

interface HierarchyRowProps {
    hierarchy: Hierarchy;
    depth: number;
    onAddChild: (parentId: string) => void;
    onAddUser: (hierarchyId: string) => void;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

function HierarchyRow({
    hierarchy,
    depth,
    onAddChild,
    onAddUser,
    canCreate,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
}: HierarchyRowProps) {
    const hierarchyId = hierarchy._id || hierarchy.id || "";
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: hierarchyId,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const userCount = hierarchy.user_count ?? 0;
    const relatedRolesCount = hierarchy.related_roles_count ?? 0;
    const parentName = hierarchy.parent_name ?? null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="crm-surface flex items-stretch transition-all hover:shadow-md mb-2"
        >
            {/* Depth indicator bars */}
            {depth > 0 && (
                <div className="flex shrink-0">
                    {Array.from({ length: depth }).map((_, i) => (
                        <div
                            key={i}
                            className="w-6 border-r border-border/50 shrink-0"
                        />
                    ))}
                    <div className="w-4 flex items-center justify-center shrink-0">
                        <div className="w-3 h-px bg-border" />
                    </div>
                </div>
            )}

            {/* Main row content */}
            <div className="flex-1 flex items-center gap-4 px-4 py-3 min-w-0">
                {/* Drag handle */}
                <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground cursor-grab shrink-0 p-1 rounded hover:bg-accent"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate block">
                        {hierarchy.name}
                    </span>
                </div>

                {/* Related Roles + User Count */}
                <div className="flex flex-col items-start gap-0.5 w-40 shrink-0">
                    <span className="text-sm font-medium text-primary">
                        Related Role {relatedRolesCount}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {userCount > 0 ? "Total User" : "No User"}
                    </span>
                    {userCount > 0 && (
                        <span className="text-sm font-bold text-primary">
                            ({userCount})
                        </span>
                    )}
                </div>

                {/* Reports To */}
                <div className="w-44 shrink-0">
                    {parentName ? (
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Reports To:</span>
                            <span className="text-sm font-semibold text-foreground">{parentName}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {canCreate && (
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onAddChild(hierarchyId)}
                        >
                            Add Role
                        </Button>
                    )}
                    {canCreate && (
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                            onClick={() => onAddUser(hierarchyId)}
                        >
                            Add User
                        </Button>
                    )}
                    {canEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-accent"
                            onClick={() => onEdit(hierarchyId)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            onClick={() => onDelete(hierarchyId)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main HierarchyList
// ---------------------------------------------------------------------------

export function HierarchyList() {
    const { canCreate, canEdit, canDelete } = useCrudPermissions("hierarchy");
    const { data, isLoading, isError } = useGetHierarchies();
    const createHierarchy = useCreateHierarchy();
    const updateHierarchy = useUpdateHierarchy();
    const deleteHierarchy = useDeleteHierarchy();
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );
    const [showRootCreate, setShowRootCreate] = useState(false);
    const [newRootName, setNewRootName] = useState("");
    const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
    const [newChildName, setNewChildName] = useState("");

    const hierarchies = data?.hierarchies || data?.data || [];
    const tree = useMemo(() => buildTree(hierarchies), [hierarchies]);
    const flat = useMemo(() => flattenTree(tree), [tree]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="ml-3 text-muted-foreground">Loading roles...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="crm-empty-state">
                <p className="text-destructive font-medium">Failed to load roles</p>
                <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page.</p>
            </div>
        );
    }

    const createRootHierarchy = async () => {
        if (!newRootName.trim()) return;
        try {
            await createHierarchy.mutateAsync({ name: newRootName.trim(), parent_id: null, level: 0 });
            setNewRootName("");
            setShowRootCreate(false);
            toast.success("Role created");
        } catch (err) {
            toast.error(hierarchyApiErrorMessage(err));
        }
    };

    const createChildHierarchy = async () => {
        if (!addingChildFor || !newChildName.trim()) return;
        const parent = hierarchies.find((h: Hierarchy) => (h._id || h.id) === addingChildFor);
        try {
            await createHierarchy.mutateAsync({
                name: newChildName.trim(),
                parent_id: addingChildFor,
                level: (parent?.level ?? 0) + 1,
            });
            setNewChildName("");
            setAddingChildFor(null);
            toast.success("Role created");
        } catch (err) {
            toast.error(hierarchyApiErrorMessage(err));
        }
    };

    const handleEdit = (id: string) => {
        window.location.href = `/admin/hierarchies/${id}`;
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this role?")) {
            try {
                await deleteHierarchy.mutateAsync(id);
                toast.success("Role deleted");
            } catch (err) {
                toast.error(hierarchyApiErrorMessage(err));
            }
        }
    };

    const handleAddUser = (hierarchyId: string) => {
        window.location.href = `/admin/users?hierarchy=${hierarchyId}`;
    };

    const parentForAdd = addingChildFor
        ? hierarchies.find((h: Hierarchy) => (h._id || h.id) === addingChildFor)
        : undefined;

    const onDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        const targetParent = hierarchies.find((h: Hierarchy) => (h._id || h.id) === overId);
        if (!targetParent) return;

        if (isInSubtreeOf(hierarchies, overId, activeId)) {
            toast.error("Cannot move a role under its own descendant.");
            return;
        }

        try {
            await updateHierarchy.mutateAsync({
                id: activeId,
                data: {
                    parent_id: overId,
                    level: (targetParent.level || 0) + 1,
                },
            });
            toast.success("Role moved");
        } catch (err) {
            toast.error(hierarchyApiErrorMessage(err));
        }
    };

    return (
        <div className="space-y-3">
            {canCreate && (
                <div className="flex items-center justify-end">
                    {!showRootCreate ? (
                        <Button onClick={() => setShowRootCreate(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Role
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Role name"
                                value={newRootName}
                                onChange={(e) => setNewRootName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void createRootHierarchy();
                                }}
                                className="w-64"
                            />
                            <Button onClick={createRootHierarchy} disabled={createHierarchy.isPending}>
                                Save
                            </Button>
                            <Button variant="outline" onClick={() => setShowRootCreate(false)}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {hierarchies.length === 0 ? (
                <div className="crm-empty-state">
                    <p className="text-muted-foreground">No roles found.</p>
                    <p className="text-sm text-muted-foreground mt-1">Click &quot;Add New Role&quot; to create one.</p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                >
                    <SortableContext
                        items={flat.map(({ node }) => node._id || node.id || "").filter(Boolean)}
                        strategy={verticalListSortingStrategy}
                    >
                        {flat.map(({ node, depth }) => {
                            const nodeId = node._id || node.id || "";
                            return (
                                <HierarchyRow
                                    key={nodeId}
                                    hierarchy={node}
                                    depth={depth}
                                    canCreate={canCreate}
                                    canEdit={canEdit}
                                    canDelete={canDelete}
                                    onAddChild={(parentId) => {
                                        setAddingChildFor(parentId);
                                        setNewChildName("");
                                    }}
                                    onAddUser={handleAddUser}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            )}

            <Dialog
                open={addingChildFor !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAddingChildFor(null);
                        setNewChildName("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Role</DialogTitle>
                        <DialogDescription>
                            {parentForAdd
                                ? `Create a new role under "${parentForAdd.name}".`
                                : "Create a new role."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Input
                            placeholder="Role name"
                            value={newChildName}
                            onChange={(e) => setNewChildName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void createChildHierarchy();
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddingChildFor(null)}>
                            Cancel
                        </Button>
                        <Button onClick={createChildHierarchy} disabled={createHierarchy.isPending}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
