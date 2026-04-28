import { Music2, Users, BookOpen, Hash, User as UserIcon, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { title: "Practise", url: "/practise", icon: Music2 },
  { title: "Ensemble", url: "/ensembles", icon: Users },
  { title: "Library", url: "/library", icon: BookOpen },
  { title: "Spaces", url: "/spaces", icon: Hash },
  { title: "Profile", url: "/profile", icon: UserIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-4 py-5">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center font-semibold">
              T
            </div>
            <div className="text-base font-semibold tracking-tight">Tempo</div>
          </div>
        ) : (
          <div className="h-8 w-8 mx-auto rounded-xl bg-primary text-primary-foreground grid place-items-center font-semibold">
            T
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-11 text-[15px]"
                  >
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-[18px] w-[18px]" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              className="h-10 text-[14px] text-muted-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-[18px] w-[18px]" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
