"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Menu({ itens }: { itens: { href: string; rotulo: string; exato?: boolean }[] }) {
  const caminho = usePathname();
  return (
    <nav className="nav" aria-label="Principal">
      {itens.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={caminho === item.href || (!item.exato && caminho.startsWith(`${item.href}/`)) ? "page" : undefined}
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}
