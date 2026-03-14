import { useState, useMemo } from "react";
import { 
  useListTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useProduceTemplate,
  useListProducts,
  getListTemplatesQueryKey, getListProductsQueryKey, getGetDashboardQueryKey, getListMovementsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Layers, Plus, Search, Edit2, Trash2, Box, Info, Wrench, AlertCircle } from "lucide-react";
import type { Template, Product } from "@workspace/api-client-react/src/generated/api.schemas";

const templateItemSchema = z.object({
  productId: z.coerce.number().min(1, "Selecciona un producto"),
  quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0"),
  notes: z.string().optional().nullable(),
});

const templateSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["puerta", "ventana", "otro"]),
  description: z.string().optional().nullable(),
  width: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  items: z.array(templateItemSchema).min(1, "Debe tener al menos un material"),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const produceSchema = z.object({
  quantity: z.coerce.number().min(1, "La cantidad a producir debe ser al menos 1"),
  notes: z.string().optional().nullable(),
});

type ProduceFormValues = z.infer<typeof produceSchema>;

export default function Templates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  const [isProduceOpen, setIsProduceOpen] = useState(false);
  const [producingTemplate, setProducingTemplate] = useState<Template | null>(null);

  // Queries
  const { data: templates = [], isLoading } = useListTemplates();
  const { data: products = [] } = useListProducts();

  // Mutations
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const produceMutation = useProduceTemplate();

  // Template Form
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      type: "puerta",
      description: "",
      width: undefined,
      height: undefined,
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Produce Form
  const produceForm = useForm<ProduceFormValues>({
    resolver: zodResolver(produceSchema),
    defaultValues: {
      quantity: 1,
      notes: "",
    },
  });

  const watchProduceQty = produceForm.watch("quantity") || 1;

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    form.reset({
      name: "", type: "puerta", description: "", width: undefined, height: undefined, items: []
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (template: Template) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      type: template.type,
      description: template.description,
      width: template.width,
      height: template.height,
      items: template.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    });
    setIsCreateOpen(true);
  };

  const handleOpenProduce = (template: Template) => {
    setProducingTemplate(template);
    produceForm.reset({ quantity: 1, notes: "" });
    setIsProduceOpen(true);
  };

  const onSubmitTemplate = (data: TemplateFormValues) => {
    const formattedData = {
      ...data,
      width: data.width || null,
      height: data.height || null,
      description: data.description || null,
      items: data.items.map(i => ({ ...i, notes: i.notes || null })),
    };

    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, data: formattedData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
            toast({ title: "Plantilla actualizada" });
            setIsCreateOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: formattedData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
            toast({ title: "Plantilla creada" });
            setIsCreateOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta plantilla?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
            toast({ title: "Plantilla eliminada" });
          },
        }
      );
    }
  };

  const onSubmitProduce = (data: ProduceFormValues) => {
    if (!producingTemplate) return;

    produceMutation.mutate(
      { id: producingTemplate.id, data: { quantity: data.quantity, notes: data.notes || null } },
      {
        onSuccess: (res) => {
          if (res.success) {
            queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListMovementsQueryKey() });
            toast({ title: "Producción registrada correctamente" });
            setIsProduceOpen(false);
          } else {
            // Error con stock insuficiente (manejado por el response de orval en success false, si así fuese la api)
            // Ya que el API retorna 200 con `success: false` y detalles de stock:
            if (res.insufficientStock && res.insufficientStock.length > 0) {
              const itemsText = res.insufficientStock.map(i => `${i.productName} (Req: ${i.required}, Disp: ${i.available})`).join(", ");
              toast({ 
                title: "Stock Insuficiente", 
                description: `Faltan materiales: ${itemsText}`,
                variant: "destructive",
                duration: 6000
              });
            } else {
              toast({ 
                title: "Error de Producción", 
                description: "No se pudo completar la producción.",
                variant: "destructive"
              });
            }
          }
        },
        onError: (error: any) => {
          // Si el servidor retorna un 400 por error de stock
          const errorData = error?.response?.data || error?.data;
          if (errorData && !errorData.success && errorData.insufficientStock) {
            const itemsText = errorData.insufficientStock.map((i: any) => `${i.productName} (Req: ${i.required}, Disp: ${i.available})`).join(", ");
            toast({ 
              title: "Stock Insuficiente", 
              description: `Faltan materiales: ${itemsText}`,
              variant: "destructive",
              duration: 6000
            });
          } else {
            toast({ 
              title: "Error", 
              description: "Ocurrió un error al registrar la producción.",
              variant: "destructive"
            });
          }
        }
      }
    );
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "puerta": return "bg-blue-500/15 text-blue-700 border-blue-200 hover:bg-blue-500/25";
      case "ventana": return "bg-cyan-500/15 text-cyan-700 border-cyan-200 hover:bg-cyan-500/25";
      default: return "bg-slate-500/15 text-slate-700 border-slate-200 hover:bg-slate-500/25";
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plantillas de Producción</h1>
          <p className="text-muted-foreground mt-2">
            Administra las recetas y genera movimientos de inventario automáticamente.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar plantilla..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleOpenCreate} className="hover-elevate">
            <Plus className="mr-2 w-4 h-4" /> Nueva Plantilla
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-xl border border-border shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Crea tu primera plantilla</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Las plantillas te permiten definir los materiales necesarios para producir puertas, ventanas y otros productos.
          </p>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 w-4 h-4" /> Comenzar
          </Button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-12 h-12 text-muted/50 mb-4" />
          <p className="text-lg font-medium">No se encontraron plantillas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={getTypeBadgeColor(template.type)}>
                    {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(template)}>
                      <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                  {(template.width || template.height) && (
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5" />
                      <span>{template.width || "?"}m × {template.height || "?"}m</span>
                    </div>
                  )}
                  {template.description && (
                    <div className="flex items-start gap-1.5 mt-1">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2 leading-tight">{template.description}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1">Materiales ({template.items.length})</p>
                  <ul className="space-y-2">
                    {template.items.slice(0, 4).map((item) => (
                      <li key={item.id} className="text-sm flex justify-between items-start gap-2">
                        <span className="text-foreground/90 truncate" title={item.productName}>
                          • {item.productName}
                        </span>
                        <span className="font-medium text-muted-foreground whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </span>
                      </li>
                    ))}
                    {template.items.length > 4 && (
                      <li className="text-xs text-muted-foreground pt-1 italic">
                        + {template.items.length - 4} materiales más...
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-5">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={() => handleOpenProduce(template)}
                >
                  <Layers className="w-4 h-4 mr-2" /> Producir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editingTemplate ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle>
            <DialogDescription>
              Define la receta de materiales para automatizar el descuento de inventario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitTemplate)} className="space-y-6 py-4" id="template-form">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Puerta Corrediza Linea 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="puerta">Puerta</SelectItem>
                            <SelectItem value="ventana">Ventana</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Características adicionales, color, acabados..." 
                          className="resize-none" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ancho (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alto (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 flex justify-between items-center border-b">
                    <h4 className="font-semibold text-sm">Materiales (Receta)</h4>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ productId: products[0]?.id || 0, quantity: 1, notes: "" })}
                      className="h-8"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Agregar
                    </Button>
                  </div>
                  
                  {fields.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Aún no hay materiales en esta plantilla.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {fields.map((field, index) => (
                        <div key={field.id} className="p-4 bg-background">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <FormField
                                control={form.control}
                                name={`items.${index}.productId`}
                                render={({ field: selectField }) => (
                                  <FormItem className="sm:col-span-6 space-y-1">
                                    <FormLabel className="text-xs">Producto</FormLabel>
                                    <Select 
                                      onValueChange={selectField.onChange} 
                                      defaultValue={selectField.value?.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Seleccionar producto" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {products.map((p) => (
                                          <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.name} ({p.unit})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field: qtyField }) => (
                                  <FormItem className="sm:col-span-2 space-y-1">
                                    <FormLabel className="text-xs">Cant.</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.01" className="h-9" {...qtyField} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.notes`}
                                render={({ field: notesField }) => (
                                  <FormItem className="sm:col-span-4 space-y-1">
                                    <FormLabel className="text-xs">Notas (Opc)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Corte, ajuste..." className="h-9" {...notesField} value={notesField.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex items-end pb-0.5">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => remove(index)}
                                className="h-9 w-9 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.formState.errors.items?.root && (
                    <p className="text-[0.8rem] font-medium text-destructive px-4 pb-3">
                      {form.formState.errors.items.root.message}
                    </p>
                  )}
                </div>

              </form>
            </Form>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="template-form" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRODUCE DIALOG */}
      <Dialog open={isProduceOpen} onOpenChange={setIsProduceOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Producción</DialogTitle>
            <DialogDescription>
              {producingTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...produceForm}>
            <form onSubmit={produceForm.handleSubmit(onSubmitProduce)} className="space-y-6 pt-2">
              
              <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <Layers className="w-8 h-8 text-primary mt-1 shrink-0" />
                <div className="space-y-3 flex-1">
                  <FormField
                    control={produceForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad a producir</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              className="w-32 text-lg font-bold" 
                              {...field} 
                            />
                          </FormControl>
                          <span className="text-muted-foreground">unidades</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {producingTemplate && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Box className="w-4 h-4" /> Materiales a consumir
                  </h4>
                  <div className="rounded-md border bg-muted/10 divide-y max-h-[250px] overflow-y-auto">
                    {producingTemplate.items.map((item) => {
                      const totalQty = (item.quantity * watchProduceQty).toFixed(2);
                      const product = products.find(p => p.id === item.productId);
                      const hasEnoughStock = product && product.currentStock >= Number(totalQty);
                      
                      return (
                        <div key={item.id} className="flex justify-between items-center p-3 text-sm">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {product && (
                              <p className={`text-xs mt-0.5 ${hasEnoughStock ? 'text-muted-foreground' : 'text-destructive font-medium flex items-center gap-1'}`}>
                                Stock: {product.currentStock} {item.unit}
                                {!hasEnoughStock && <AlertCircle className="w-3 h-3" />}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${hasEnoughStock ? '' : 'text-destructive'}`}>
                              {totalQty}
                            </span> <span className="text-muted-foreground">{item.unit}</span>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              ({item.quantity}/u)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <FormField
                control={produceForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas / Referencia</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Orden de compra #123..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setIsProduceOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={produceMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirmar Producción
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
