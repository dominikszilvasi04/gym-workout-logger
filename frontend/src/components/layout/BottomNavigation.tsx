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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-200 bg-white/95 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur" aria-label="Primary navigation">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const active = location.pathname === item.path;

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center rounded-lg text-[11px] font-semibold",
                  active
                    ? "bg-primary-50 text-primary-600"
                    : "text-navy-500 hover:bg-navy-100 hover:text-navy-700"
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
