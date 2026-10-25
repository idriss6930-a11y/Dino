import Link from "next/link";
import { Compass, Home, MessageCircle, Plane, UserRound } from "lucide-react";

export function MobileNav() {
  const items = [
    { href: "/", label: "Accueil", Icon: Home },
    { href: "/vols", label: "Vols", Icon: Plane },
    { href: "/inspiration", label: "Où partir", Icon: Compass },
    { href: "/assistant", label: "Assistant", Icon: MessageCircle },
    { href: "/compte", label: "Compte", Icon: UserRound },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-5 border-t border-sage-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navigation mobile">
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-deep-800">
          <Icon size={20} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
