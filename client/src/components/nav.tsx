import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Nav() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home" },
    { href: "/register", label: "Register" },
    { href: "/vote", label: "Vote" },
    { href: "/results", label: "Results" },
    { href: "/admin/dashboard", label: "Admin" },
  ];

  return (
    <nav className="bg-primary/10 backdrop-blur-lg fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex space-x-4">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <a
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium",
                    location === link.href
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/60 hover:text-foreground"
                  )}
                >
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
