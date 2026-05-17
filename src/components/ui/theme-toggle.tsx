import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-store";

export function ThemeToggle() {
  const { dark, toggle } = useTheme();

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    toggle(x, y);
  };

  return (
    <motion.button
      onClick={handleToggle}
      className="relative h-10 w-10 rounded-full border border-border bg-card shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95"
      whileHover={{ rotate: 15 }}
      whileTap={{ scale: 0.9 }}
      data-testid="theme-toggle"
      aria-label="Toggle theme"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={false}
          animate={{
            scale: dark ? 0 : 1,
            rotate: dark ? 180 : 0,
            opacity: dark ? 0 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute"
        >
          <Sun className="h-5 w-5 text-warning" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            scale: dark ? 1 : 0,
            rotate: dark ? 0 : -180,
            opacity: dark ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute"
        >
          <Moon className="h-5 w-5 text-primary-400" />
        </motion.div>
      </div>
      
      {/* Glow effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-full"
        animate={{
          boxShadow: dark
            ? "0 0 20px rgba(100, 149, 237, 0.3)"
            : "0 0 20px rgba(255, 215, 0, 0.3)",
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}
