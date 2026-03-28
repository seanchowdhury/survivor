"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { UserButton } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PUBLIC_LINKS = [
  { href: "/", label: "Episodes" },
  { href: "/season", label: "Season" },
];

const AUTHED_LINKS = [
  { href: "/roster", label: "Roster" },
];

const BAR_CLASSES =
  "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/60";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const navLinks = session ? [...PUBLIC_LINKS, ...AUTHED_LINKS] : PUBLIC_LINKS;

  return (
    <>
      {/* Desktop */}
      <header className={cn(BAR_CLASSES, "hidden md:flex")}>
        <NavigationMenu>
          <NavigationMenuList>
            {navLinks.map(({ href, label }) => (
              <NavigationMenuItem key={href}>
                <NavigationMenuLink
                  asChild
                  active={pathname === href || (href !== "/" && pathname.startsWith(href))}
                  className={cn(navigationMenuTriggerStyle(), "text-white hover:text-black focus:text-black data-[active]:text-black")}
                >
                  <Link href={href}>{label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <UserButton size="icon" />
      </header>

      {/* Mobile */}
      <header className={cn(BAR_CLASSES, "flex md:hidden")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-white"
        >
          <HugeiconsIcon icon={Menu01Icon} size={20} />
        </Button>
        <UserButton size="icon" />
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-gray-950 border-gray-800 w-64">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-white text-left">🔥 Survivor Fantasy</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-3 py-2.5 rounded-md text-base font-medium transition-colors",
                    active
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
