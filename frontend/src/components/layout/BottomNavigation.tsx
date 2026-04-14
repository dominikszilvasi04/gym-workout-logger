import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { BarChart3, CircleUserRound, Dumbbell, House, Shield, SquareStack } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useKeyboardVisibility } from "../../hooks/useKeyboardVisibility";

const navigationItems = [
  { path: "/", label: "Home", icon: House },
  { path: "/log", label: "Log", icon: Dumbbell },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/templates", label: "Templates", icon: SquareStack },
  { path: "/profile", label: "Profile", icon: CircleUserRound },
];

const adminNavigationItem = { path: "/admin", label: "Admin", icon: Shield };

export function BottomNavigation() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const keyboardVisible = useKeyboardVisibility();
  const isAdmin = user?.is_admin || user?.role === "admin";
  const resolvedNavigationItems = isAdmin ? [...navigationItems, adminNavigationItem] : navigationItems;

  const isNavigationItemActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-navy-300/55 bg-navy-100/94 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transition-all duration-200",
        keyboardVisible ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}
      aria-label="Primary navigation"
      aria-hidden={keyboardVisible || undefined}
    >
      <ul className="mx-auto grid max-w-3xl gap-1 px-2" style={{ gridTemplateColumns: `repeat(${resolvedNavigationItems.length}, minmax(0, 1fr))` }}>
        {resolvedNavigationItems.map((item) => {
          const IconComponent = item.icon;
          const active = isNavigationItemActive(item.path);

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={clsx(
                  "touch-target flex h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold tracking-[0.01em] transition-colors duration-150",
                  active
                    ? "bg-primary-500 text-navy-100 shadow-[0_12px_24px_rgba(184,138,59,0.24)]"
                    : "text-navy-700 hover:bg-navy-200/80 hover:text-navy-900"
                )}
              >
                <IconComponent size={18} className={clsx("transition-transform duration-150", active && "-translate-y-0.5")} />
                <span className={clsx("mt-1 transition-transform duration-150", active && "-translate-y-0.5")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
