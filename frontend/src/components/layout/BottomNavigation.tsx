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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-300/65 bg-navy-100/92 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl" aria-label="Primary navigation">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const active = isNavigationItemActive(item.path);

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center rounded-lg text-[11px] font-semibold",
                  active
                    ? "bg-primary-500/95 text-navy-950 shadow-[0_8px_20px_rgba(91,108,255,0.34)]"
                    : "text-navy-700 hover:bg-navy-200/70 hover:text-navy-900"
                )}
              >
                <IconComponent size={18} />
                <span className="mt-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
