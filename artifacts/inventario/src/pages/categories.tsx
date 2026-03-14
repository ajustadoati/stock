import { useState } from "react";
import { 
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  getListCategoriesQueryKey, getGetDashboardQueryKey, getListProductsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Plus, Edit2, Trash2 } from "lucide-react";
import type { Category } from "@workspace/api-client-react/src/generated/api.schemas";

const categorySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
  color: z.string().min(4, "Selecciona un color"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Categories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useListCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
    },
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    form.reset({ name: "", description: "", color: "#3b82f6" });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      color: category.color,
    });
    setIsCreateOpen(true);
  };

  const onSubmit = (data: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            toast({ title: "Categoría actualizada" });
            setIsCreateOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            toast({ title: "Categoría creada" });
            setIsCreateOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Eliminar categoría? Esto fallará si tiene productos asignados.")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            toast({ title: "Categoría eliminada" });
          },
          onError: () => {
            toast({ 
              title: "Error", 
              description: "No se puede eliminar una categoría que está en uso.",
              variant: "destructive"
            });
          }
        }
      );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground mt-2">
            Configura las familias de productos de tu almacén.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="hover-elevate">
          <Plus className="mr-2 w-4 h-4" /> Nueva Categoría
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
          <Settings2 className="w-16 h-16 text-muted/50 mb-4" />
          <p className="text-lg font-medium">No hay categorías configuradas</p>
          <p className="text-muted-foreground mt-2">Comienza creando agrupaciones como "Aluminio", "Herrajes", etc.</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-6">Crear la primera</Button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="hover-elevate overflow-hidden group">
              <div className="h-2 w-full" style={{ backgroundColor: category.color }}></div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    {category.name}
                  </CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(category)}>
                      <Edit2 className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground min-h-[40px]">
                  {category.description || "Sin descripción"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>
              Define un nombre y un color identificativo.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Categoría</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Perfiles de Aluminio..." {...field} />
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
                      <Input placeholder="Descripción breve..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Identificativo</FormLabel>
                    <FormControl>
                      <div className="flex gap-4 items-center">
                        <Input type="color" className="w-20 p-1 h-10 cursor-pointer" {...field} />
                        <span className="text-sm text-muted-foreground uppercase">{field.value}</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
