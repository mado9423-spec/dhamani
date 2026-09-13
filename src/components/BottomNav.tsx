import { NavLink } from "react-router-dom";

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "الرئيسية", path: "/home", icon: "home" },
  { label: "معاملاتي", path: "/transactions", icon: "list" },
  { label: "الإقرار", path: "/declaration", icon: "check" },
  { label: "حسابي", path: "/profile", icon: "user" },
];

const icons: Record<string, JSX.Element> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z" />
  ),
  list: (
    <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" strokeWidth="2" />
  ),
  check: (
    <path d="M4 12h16M4 6h16M4 18h7" strokeLinecap="round" strokeWidth="2" />
  ),
  user: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
  ),
};

export function BottomNav() {
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 flex h-16 border-t border-[#E5E7EB] bg-white"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
              isActive ? "text-[#0B3D66]" : "text-[#9CA3AF]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isActive ? "#0B3D66" : "#9CA3AF"}
                strokeWidth="1.8"
              >
                {icons[item.icon]}
              </svg>
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
