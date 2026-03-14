import { Link, useLocation } from "wouter";
import { Package, LayoutDashboard, Settings2, ArrowRightLeft, Layers } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Panel General", url: "/", icon: LayoutDashboard },
  { title: "Inventario", url: "/inventory", icon: Package },
  { title: "Movimientos", url: "/movements", icon: ArrowRightLeft },
  { title: "Plantillas", url: "/templates", icon: Layers },
  { title: "Categorías", url: "/categories", icon: Settings2 },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50 py-4 px-4 h-[60px] flex items-center justify-center">
        <div className="flex items-center gap-3 w-full overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-inner">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
            AlmacénPro
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    tooltip={item.title}
                    className="transition-colors"
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
