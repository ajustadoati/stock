import { useState } from "react";
import { 
  useListMovements, useCreateMovement, useListProducts,
  getListMovementsQueryKey, getGetDashboardQueryKey, getListProductsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListMovementsType } from "@workspace/api-client-react/src/generated/api.schemas";

const movementSchema = z.object({
  productId: z.coerce.number().min(1, "Selecciona un producto"),
  type: z.enum(["entrada", "salida"]),
  quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

export default function Movements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<"all" | "entrada" | "salida">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const { data: movements = [], isLoading } = useListMovements(
    filterType !== "all" ? { type: filterType as ListMovementsType } : undefined
  );
  
  const { data: products = [] } = useListProducts();
  const createMutation = useCreateMovement();

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      productId: 0,
      type: "salida",
      quantity: 1,
      notes: "",
    },
  });

  const handleOpenCreate = (type: "entrada" | "salida") => {
    form.reset({
      productId: products[0]?.id || 0,
      type,
      quantity: 1,
      notes: "",
    });
    setProductPickerOpen(false);
    setIsCreateOpen(true);
  };

  const onSubmit = (data: MovementFormValues) => {
    // Basic frontend validation for stock out
    if (data.type === "salida") {
      const product = products.find(p => p.id === data.productId);
      if (product && product.currentStock < data.quantity) {
        toast({ 
          title: "Error", 
          description: `Stock insuficiente. Solo tienes ${product.currentStock} ${product.unit}`,
          variant: "destructive"
        });
        return;
      }
    }

    createMutation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMovementsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Movimiento registrado con éxito" });
          setIsCreateOpen(false);
        },
        onError: () => {
          toast({ 
            title: "Error", 
            description: "No se pudo procesar el movimiento.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Movimientos</h1>
          <p className="text-muted-foreground mt-2">
            Registro de todas las entradas y salidas del almacén.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800" onClick={() => handleOpenCreate("entrada")}>
            <ArrowDownToLine className="mr-2 w-4 h-4" /> Registrar Entrada
          </Button>
          <Button onClick={() => handleOpenCreate("salida")} className="hover-elevate">
            <ArrowUpFromLine className="mr-2 w-4 h-4" /> Registrar Salida
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Últimos registros</CardTitle>
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los movimientos</SelectItem>
                <SelectItem value="entrada">Solo Entradas</SelectItem>
                <SelectItem value="salida">Solo Salidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ArrowRightLeft className="w-16 h-16 text-muted/50 mb-4" />
              <p className="text-lg font-medium">No se encontraron movimientos</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-center">Stock Post-Mov</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {format(new Date(m.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{m.productName}</div>
                        <div className="text-xs text-muted-foreground">{m.categoryName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`
                          ${m.type === 'entrada' 
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50' 
                            : 'border-amber-200 text-amber-700 bg-amber-50'}
                        `}>
                          {m.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${m.type === 'entrada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {m.stockAfter}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {m.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.watch("type") === "entrada" ? "Registrar Entrada (Compra)" : "Registrar Salida (Producción)"}
            </DialogTitle>
            <DialogDescription>
              Modifica las cantidades en el inventario.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto</FormLabel>
                    <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={productPickerOpen}
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                          >
                            {field.value
                              ? (() => {
                                  const selected = products.find((product) => product.id === field.value);
                                  if (!selected) return "Selecciona producto...";
                                  return `${selected.code} ${selected.name} (${selected.currentStock} ${selected.unit} act.)`;
                                })()
                              : "Selecciona producto..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                      >
                        <Command>
                          <CommandInput placeholder="Buscar por código o nombre..." />
                          <CommandList className="h-64 overflow-y-auto overscroll-contain">
                            <CommandEmpty>No se encontraron productos.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.code} ${product.name} ${product.categoryName}`}
                                  onSelect={() => {
                                    field.onChange(product.id);
                                    setProductPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      product.id === field.value ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <span className="mr-2 shrink-0 font-mono text-xs text-muted-foreground">
                                    {product.code}
                                  </span>
                                  <span className="truncate">{product.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Movimiento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="salida">Salida</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas / Referencia</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Orden de compra #123, Para cliente X..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className={form.watch("type") === "entrada" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}>
                  Confirmar {form.watch("type") === "entrada" ? "Entrada" : "Salida"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
