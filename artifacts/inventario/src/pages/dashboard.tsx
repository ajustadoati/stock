import { Link } from "wouter";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, ArrowRight, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Error cargando el panel</h2>
        <p className="text-muted-foreground mt-2">No se pudo cargar la información del inventario.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel General</h1>
        <p className="text-muted-foreground mt-2">
          Resumen del estado actual del almacén de materiales.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Productos
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.totalProducts}</div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertas de Stock
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">productos bajo mínimo</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entradas Hoy
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.totalEntradasHoy}</div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salidas Hoy
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <ArrowUpFromLine className="w-4 h-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.totalSalidasHoy}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Movimientos Recientes</CardTitle>
                <CardDescription>Los últimos registros de entradas y salidas.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/movements">
                  Ver todos
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {dashboard.recentMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowRightLeft className="w-12 h-12 text-muted/50 mb-3" />
                <p className="text-muted-foreground">No hay movimientos recientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.recentMovements.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mov.type === 'entrada' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                        {mov.type === 'entrada' ? (
                          <ArrowDownToLine className={`w-5 h-5 ${mov.type === 'entrada' ? 'text-emerald-600' : 'text-amber-600'}`} />
                        ) : (
                          <ArrowUpFromLine className={`w-5 h-5 ${mov.type === 'entrada' ? 'text-emerald-600' : 'text-amber-600'}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{mov.productName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(mov.createdAt), "d MMM, yyyy HH:mm", { locale: es })}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant={mov.type === 'entrada' ? 'default' : 'secondary'} className={mov.type === 'entrada' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                        {mov.type === 'entrada' ? '+' : '-'}{mov.quantity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
