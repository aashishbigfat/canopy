"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Search,
    MoreHorizontal,
    Package,
    Pencil,
    Trash2,
    Loader2,
    Star,
    StarOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
    productsService,
    Product,
    ProductCreateData,
} from "@/lib/api/services/products.service";

export default function ProductsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductCreateData>({
        name: "",
        product_code: "",
        description: "",
        category: "",
        unit_price: 0,
        cost_price: 0,
        currency: "INR",
        unit: "unit",
        is_active: true,
        is_featured: false,
    });

    const { data, isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: () => productsService.getProducts({ limit: 100 }),
    });

    const createMutation = useMutation({
        mutationFn: productsService.createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product created successfully");
            setIsCreateOpen(false);
            resetForm();
        },
        onError: () => {
            toast.error("Failed to create product");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ProductCreateData> }) =>
            productsService.updateProduct(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product updated successfully");
            setEditingProduct(null);
            resetForm();
        },
        onError: () => {
            toast.error("Failed to update product");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: productsService.deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete product");
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            product_code: "",
            description: "",
            category: "",
            unit_price: 0,
            cost_price: 0,
            currency: "INR",
            unit: "unit",
            is_active: true,
            is_featured: false,
        });
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            product_code: product.product_code || "",
            description: product.description || "",
            category: product.category || "",
            unit_price: product.unit_price || 0,
            cost_price: product.cost_price || 0,
            currency: product.currency || "INR",
            unit: product.unit || "unit",
            is_active: product.is_active,
            is_featured: product.is_featured,
        });
    };

    const handleSubmit = () => {
        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const products = data?.products || [];
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                    <p className="text-muted-foreground">
                        Manage your product catalog.
                    </p>
                </div>
                <Dialog open={isCreateOpen || !!editingProduct} onOpenChange={(open) => {
                    if (!open) {
                        setIsCreateOpen(false);
                        setEditingProduct(null);
                        resetForm();
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? "Edit Product" : "Create Product"}</DialogTitle>
                            <DialogDescription>
                                {editingProduct ? "Update product details" : "Add a new product to your catalog"}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Product name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="product_code">Product Code</Label>
                                <Input
                                    id="product_code"
                                    value={formData.product_code}
                                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                                    placeholder="SKU or code"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Product description"
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Electronics"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unit</Label>
                                <Input
                                    id="unit"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="e.g., piece, kg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit_price">Unit Price (₹)</Label>
                                <Input
                                    id="unit_price"
                                    type="number"
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cost_price">Cost Price (₹)</Label>
                                <Input
                                    id="cost_price"
                                    type="number"
                                    value={formData.cost_price}
                                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_active">Active</Label>
                                <Checkbox
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_featured">Featured</Label>
                                <Checkbox
                                    id="is_featured"
                                    checked={formData.is_featured}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: !!checked })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                setIsCreateOpen(false);
                                setEditingProduct(null);
                                resetForm();
                            }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                            >
                                {(createMutation.isPending || updateMutation.isPending) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {editingProduct ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Products Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No products found</p>
                            <p className="text-sm">Create your first product to get started.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-muted rounded-lg">
                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <div className="font-medium flex items-center gap-2">
                                                        {product.name}
                                                        {product.is_featured && (
                                                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                        )}
                                                    </div>
                                                    {product.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                                            {product.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                                                {product.product_code || "—"}
                                            </code>
                                        </TableCell>
                                        <TableCell>{product.category || "—"}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(product.unit_price || 0)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={product.is_active ? "default" : "secondary"}>
                                                {product.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(product)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => deleteMutation.mutate(product.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
