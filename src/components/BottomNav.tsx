import { NavLink } from "react-router-dom";
import { Icon, IconName } from "./Icons";

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

const navItems: NavItem[] = [
  { label: "الرئيسية", path: "/home", icon: "home" },
  { label: "معاملاتي", path: "/transactions", icon: "list" },
  { label: "الإقرار", path: "/declaration", icon: "check-circle" },
  { label: "حسابي", path: "/profile", icon: "user" },
];

export function BottomNav() {
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-1/2 z-40 flex h-[68px] w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className="flex flex-1 flex-col items-center justify-center gap-1"
        >
          {({ isActive }) => (
            <>
              <span
                className={`h-1 w-1 rounded-full transition-opacity duration-200 ${
                  isActive ? "bg-primary opacity-100" : "opacity-0"
                }`}
              />
              <Icon
                name={item.icon}
                size={22}
                className={isActive ? "text-primary" : "text-ink-faint"}
              />
              <span
                className={`text-[11px] font-semibold transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-ink-faint"
                }`}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
