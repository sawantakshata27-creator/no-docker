interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-16 w-16 text-lg",
};

export function UserAvatar({ name, avatarUrl, size = "md", className = "" }: UserAvatarProps) {
  const initials = (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClass = SIZE_MAP[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "User"}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} grid place-items-center rounded-full bg-primary-600 font-semibold text-white ${className}`}
    >
      {initials}
    </div>
  );
}
