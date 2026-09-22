interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export type IconName =
  | "file-check"
  | "calendar"
  | "cash"
  | "calendar-plus"
  | "list-check"
  | "shield-check"
  | "user"
  | "bell"
  | "home"
  | "list"
  | "check-circle"
  | "chevron-back";

const PATHS: Record<IconName, string> = {
  "file-check":
    "M14 3v4a1 1 0 0 0 1 1h4 M6 21h8a2 2 0 0 0 2-2V7l-4-4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z M9 14.5l1.5 1.5L14 12.5",
  calendar:
    "M4 5.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.5Z M4 10h16 M8 2.5v3.5 M16 2.5v3.5",
  cash:
    "M3 6.5h18v11H3z M3 9.5c1.5 0 2.5-1 2.5-2.5 M21 9.5c-1.5 0-2.5-1-2.5-2.5 M3 14.5c1.5 0 2.5 1 2.5 2.5 M21 14.5c-1.5 0-2.5 1-2.5 2.5 M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  "calendar-plus":
    "M4 5.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.5Z M4 10h16 M8 2.5v3.5 M16 2.5v3.5 M12 13v5 M9.5 15.5h5",
  "list-check":
    "M9 6h11 M9 12h11 M9 18h6 M4 6l1 1 2-2 M4 12l1 1 2-2",
  "shield-check":
    "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z M9 12l2 2 4-4",
  user: "M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z M5 20.5c1-3.7 4-5.5 7-5.5s6 1.8 7 5.5",
  bell: "M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z M10 18.5a2 2 0 0 0 4 0",
  home: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z",
  list: "M4 6h16 M4 12h16 M4 18h10",
  "check-circle":
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M8.5 12.3l2.3 2.3 4.7-4.7",
  "chevron-back": "M10 6l6 6-6 6",
};

export function Icon({ name, size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
