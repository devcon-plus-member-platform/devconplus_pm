import Sidebar from "@/components/ui/Sidebar";
import AuthProvider from "@/components/ui/AuthProvider";
import KibotChat from "@/components/kibot/KibotChat";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0">{children}</main>
      </div>
      <KibotChat />
    </AuthProvider>
  );
}
