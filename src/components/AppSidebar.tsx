import { Music2, Users, BookOpen, Hash, User as UserIcon, LogOut, UserPlus } from "lucide-react";
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
  { title: "Library", url: "/library", icon: BookOpen },
  { title: "Ensemble", url: "/ensembles", icon: Users },
  { title: "Spaces", url: "/spaces", icon: Hash },
  { title: "Colleagues", url: "/colleagues", icon: UserPlus },
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
    <Sidebar
      collapsible="icon"
      className="border-r-0 [&>div]:!bg-transparent"
    >
      <div className="h-full glass-strong border-r border-white/10">
        <SidebarHeader className="px-4 py-5 bg-transparent">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl glass grid place-items-center font-semibold text-[15px]">
                T
              </div>
              <div className="text-[15px] font-semibold tracking-tight">Tempo</div>
            </div>
          ) : (
            <div className="h-9 w-9 mx-auto rounded-2xl glass grid place-items-center font-semibold text-[15px]">
              T
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="bg-transparent">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-1">
                {items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className={`h-11 rounded-xl text-[13.5px] font-medium spring-tap !bg-transparent hover:!bg-white/[0.06] ${
                          active ? "!bg-white/[0.12] text-foreground" : "text-foreground/75"
                        }`}
                      >
                        <NavLink to={item.url} className="flex items-center gap-3 px-3">
                          <item.icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-2 pb-4 bg-transparent">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sign out"
                className="h-10 rounded-xl text-[13px] text-foreground/55 hover:text-foreground hover:!bg-white/[0.06] !bg-transparent spring-tap"
                onClick={() => signOut()}
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
                {!collapsed && <span>Sign out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
