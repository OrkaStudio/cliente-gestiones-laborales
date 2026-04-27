import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { VariantSwitcher } from "@/components/app/variant-switcher";
import { AgroSidebar } from "@/components/app/agro-sidebar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestiones Laborales — Agro",
};

export default function AgroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${outfit.variable} agro-shell min-h-screen`}
    >
      <VariantSwitcher />
      <div className="grid min-h-screen grid-cols-[1fr_18rem]">
        <main className="min-w-0">{children}</main>
        <AgroSidebar />
      </div>
    </div>
  );
}
