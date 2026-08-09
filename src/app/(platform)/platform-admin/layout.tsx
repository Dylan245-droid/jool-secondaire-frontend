"use client";

import { PlatformSidebar } from "@/components/shared/PlatformSidebar";
import { useRequireSuperuser } from "@/lib/roles";

export default function PlatformAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = useRequireSuperuser();

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PlatformSidebar />
      <main className="flex-1 h-screen overflow-y-auto p-8">{children}</main>
    </div>
  );
}
