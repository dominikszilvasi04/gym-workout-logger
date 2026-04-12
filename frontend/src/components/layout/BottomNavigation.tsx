import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { BarChart3, CircleUserRound, Dumbbell, House, SquareStack } from "lucide-react";

const navigationItems = [
  { path: "/", label: "Home", icon: House },
  { path: "/log", label: "Log", icon: Dumbbell },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/templates", label: "Templates", icon: SquareStack },
  { path: "/profile", label: "Profile", icon: CircleUserRound },
];

export function BottomNavigation() {
  const location = useLocation();

  const isNavigationItemActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-300/55 bg-navy-100/94 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl" aria-label="Primary navigation">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2">
        {navigationItems.map((item) => {
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
