import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { VariantSwitcher } from "@/components/app/variant-switcher";
import { StudioSidebar } from "@/components/app/studio-sidebar";

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
  title: "Gestiones Laborales — Estudio",
};

export default function EstudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${outfit.variable} studio-shell min-h-screen`}
    >
      <VariantSwitcher />
      <div className="grid min-h-screen grid-cols-[16rem_1fr]">
        <StudioSidebar />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
