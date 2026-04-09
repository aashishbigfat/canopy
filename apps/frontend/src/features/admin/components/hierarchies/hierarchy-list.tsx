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
import { GripVertical, Plus } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGetHierarchies } from "@/features/admin/api/use-hierarchies";
import { HierarchyActions } from "./hierarchy-actions";
import { Hierarchy } from "@/features/admin/types/hierarchies";
import { useCreateHierarchy, useUpdateHierarchy } from "@/features/admin/api/use-hierarchies";
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

/** True if candidateId is activeId or any ancestor of candidateId is activeId (cannot reparent into own subtree). */
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

interface HierarchyRowProps {
    hierarchy: Hierarchy;
    depth: number;
    onAddChild: (parentId: string) => void;
    canCreateChild: boolean;
}

function HierarchyRow({ hierarchy, depth, onAddChild, canCreateChild }: HierarchyRowProps) {
    const hierarchyId = hierarchy._id || hierarchy.id || "";
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: hierarchyId,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell className="font-medium">
                <div className="flex items-center gap-2" style={{ marginLeft: `${depth * 24}px` }}>
                    <button
                        type="button"
                        className="text-slate-400 hover:text-slate-700"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                    <span>{hierarchy.name}</span>
                </div>
            </TableCell>
            <TableCell>{hierarchy.created_by_name || "-"}</TableCell>
            <TableCell>
                {hierarchy.created_at ? new Date(hierarchy.created_at).toLocaleString() : "-"}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end items-center gap-2">
                    {canCreateChild && (
                    <Button variant="outline" size="sm" onClick={() => hierarchyId && onAddChild(hierarchyId)}>
                        <Plus className="mr-1 h-3 w-3" />
                        Add Hierarchy
                    </Button>
                    )}
                    <HierarchyActions hierarchy={hierarchy} />
                </div>
            </TableCell>
        </TableRow>
    );
}

export function HierarchyList() {
    const { canCreate } = useCrudPermissions("department");
    const { data, isLoading, isError } = useGetHierarchies();
    const createHierarchy = useCreateHierarchy();
    const updateHierarchy = useUpdateHierarchy();
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );
    const [showRootCreate, setShowRootCreate] = useState(false);
    const [newRootName, setNewRootName] = useState("");
    const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
    const [newChildName, setNewChildName] = useState("");

    // Hooks must run unconditionally — never place useMemo after early returns.
    const hierarchies = data?.hierarchies || data?.data || [];
    const tree = useMemo(() => buildTree(hierarchies), [hierarchies]);
    const flat = useMemo(() => flattenTree(tree), [tree]);

    if (isLoading) {
        return <div className="p-4 text-center">Loading hierarchies...</div>;
    }

    if (isError) {
        return <div className="p-4 text-center text-red-500">Error loading hierarchies</div>;
    }

    const createRootHierarchy = async () => {
        if (!newRootName.trim()) return;
        try {
            await createHierarchy.mutateAsync({ name: newRootName.trim(), parent_id: null, level: 0 });
            setNewRootName("");
            setShowRootCreate(false);
            toast.success("Hierarchy created");
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
            toast.success("Hierarchy created");
        } catch (err) {
            toast.error(hierarchyApiErrorMessage(err));
        }
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

        // Prevent cycles: cannot move a node under itself or under one of its descendants.
        if (isInSubtreeOf(hierarchies, overId, activeId)) return;

        await updateHierarchy.mutateAsync({
            id: activeId,
            data: {
                parent_id: overId,
                level: (targetParent.level || 0) + 1,
            },
        });
    };

    return (
        <div className="space-y-4">
            {canCreate && (
            <div className="flex items-center justify-end">
                {!showRootCreate ? (
                    <Button onClick={() => setShowRootCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Root Hierarchy
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Hierarchy name"
                            value={newRootName}
                            onChange={(e) => setNewRootName(e.target.value)}
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

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
            </Table>

            <div className="rounded-md border">
                <Table>
                    <TableBody>
                        {hierarchies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No hierarchies found.
                                </TableCell>
                            </TableRow>
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
                                                canCreateChild={canCreate}
                                                onAddChild={(parentId) => {
                                                    setAddingChildFor(parentId);
                                                    setNewChildName("");
                                                }}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                        )}
                    </TableBody>
                </Table>
            </div>

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
                        <DialogTitle>Add hierarchy</DialogTitle>
                        <DialogDescription>
                            {parentForAdd
                                ? `Create a new hierarchy under “${parentForAdd.name}”.`
                                : "Create a new hierarchy."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Input
                            placeholder="Hierarchy name"
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
