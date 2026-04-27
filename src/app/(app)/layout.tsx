import { Sidebar } from "@/components/app/sidebar";
import { VariantSwitcher } from "@/components/app/variant-switcher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <VariantSwitcher />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
