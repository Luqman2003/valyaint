import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/90 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-center px-4">
          <h1 className="text-lg font-bold tracking-tight">valyaint</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg">{children}</main>
      <BottomNav />
    </div>
  );
}
