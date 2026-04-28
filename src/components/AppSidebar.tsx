import { Music2, Users, BookOpen, Hash, User as UserIcon, LogOut, Inbox as InboxIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Practise", url: "/practise", icon: Music2 },
  { title: "Ensemble", url: "/ensembles", icon: Users },
  { title: "Library", url: "/library", icon: BookOpen },
  { title: "Spaces", url: "/spaces", icon: Hash },
  { title: "Inbox", url: "/inbox", icon: InboxIcon },
  { title: "Profile", url: "/profile", icon: UserIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState(0);

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [{ count: ec }, { count: rc }] = await Promise.all([
          supabase.from("ensemble_invites").select("id", { head: true, count: "exact" }).eq("status", "pending"),
          supabase.from("room_invites").select("id", { head: true, count: "exact" }).eq("status", "pending").eq("invitee_id", user.id),
        ]);
        if (!cancelled) setPending((ec ?? 0) + (rc ?? 0));
      } catch { /* noop */ }
    };
    load();
    const ch = supabase
      .channel("inbox-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "ensemble_invites" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_invites" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user, pathname]);

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
              {items.map((item) => {
                const showBadge = item.url === "/inbox" && pending > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="h-11 text-[15px]"
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <span className="relative inline-flex">
                          <item.icon className="h-[18px] w-[18px]" />
                          {showBadge && collapsed && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </span>
                        {!collapsed && (
                          <span className="flex-1 flex items-center justify-between">
                            <span>{item.title}</span>
                            {showBadge && (
                              <span className="ml-2 inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-medium">
                                {pending}
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
