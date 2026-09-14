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
      className="fixed bottom-0 left-0 right-0 flex h-[68px] border-t border-[#E5E7EB] bg-white/90 backdrop-blur-md"
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
                  isActive ? "bg-[#0B3D66] opacity-100" : "opacity-0"
                }`}
              />
              <Icon
                name={item.icon}
                size={22}
                className={isActive ? "text-[#0B3D66]" : "text-[#9CA3AF]"}
              />
              <span
                className={`text-[11px] font-semibold transition-colors duration-200 ${
                  isActive ? "text-[#0B3D66]" : "text-[#9CA3AF]"
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
