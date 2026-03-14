import { useState } from "react";
import { 
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, 
  useListCategories, 
  getListProductsQueryKey, getGetDashboardQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PackageSearch, Plus, Search, Edit2, Trash2 } from "lucide-react";
import type { Product } from "@workspace/api-client-react/src/generated/api.schemas";

const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  categoryId: z.coerce.number().min(1, "Debes seleccionar una categoría"),
  unit: z.string().min(1, "Escribe una unidad de medida (ej. pza, ml, mts)"),
  currentStock: z.coerce.number().min(0, "El stock no puede ser negativo"),
  minimumStock: z.coerce.number().min(0, "El stock mínimo no puede ser negativo"),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useListProducts(
    selectedCategory ? { categoryId: selectedCategory } : undefined
  );
  
  const { data: categories = [] } = useListCategories();

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: 0,
      unit: "pza",
      currentStock: 0,
      minimumStock: 10,
    },
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingProduct(null);
    form.reset({
      name: "", description: "", categoryId: categories[0]?.id || 0,
      unit: "pza", currentStock: 0, minimumStock: 10,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId,
      unit: product.unit,
      currentStock: product.currentStock,
      minimumStock: product.minimumStock,
    });
    setIsCreateOpen(true);
  };

  const onSubmit = (data: ProductFormValues) => {
    if (editingProduct) {
      updateMutation.mutate(
        { id: editingProduct.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            toast({ title: "Producto actualizado" });
            setIsCreateOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            toast({ title: "Producto creado" });
            setIsCreateOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            toast({ title: "Producto eliminado" });
          },
        }
      );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los materiales, vidrios, aluminios y más.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="hover-elevate">
          <Plus className="mr-2 w-4 h-4" /> Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select 
              value={selectedCategory ? selectedCategory.toString() : "all"} 
              onValueChange={(v) => setSelectedCategory(v === "all" ? undefined : parseInt(v))}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageSearch className="w-16 h-16 text-muted/50 mb-4" />
              <p className="text-lg font-medium">No se encontraron productos</p>
              <p className="text-muted-foreground">Intenta ajustar tu búsqueda o agregar uno nuevo.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Stock Actual</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => {
                    const isCritical = p.currentStock === 0;
                    const isLow = !isCritical && p.currentStock < p.minimumStock;
                    
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.categoryColor }}></div>
                            <span className="text-sm text-muted-foreground">{p.categoryName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {p.currentStock} {p.unit}
                        </TableCell>
                        <TableCell className="text-center">
                          {isCritical ? (
                            <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 border-rose-200">Agotado</Badge>
                          ) : isLow ? (
                            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200">Bajo Stock</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200">Suficiente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(p)}>
                              <Edit2 className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              Completa la información del material para el inventario.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Perfil Aluminio Blanco..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Medidas, marca, etc..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. mts, pza..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Inicial</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Mínimo</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? "Guardar Cambios" : "Crear Producto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
