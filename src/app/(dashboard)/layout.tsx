import { getSessionOrTest, isTestMode, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { TestModeBanner } from "@/components/admin/test-mode-banner";
import { Header } from "@/components/admin/header";
import { AdminToaster } from "@/components/admin/admin-toaster";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionOrTest();
  const locale = await getLocale();
  const messages = await getMessages();
  const testMode = isTestMode();

  // Redirect unauthenticated users to login
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect users with no role to no-access
  if (!session.user.role) {
    redirect("/no-access");
  }

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-screen bg-zinc-950 text-zinc-100">
        <Sidebar
          role={session.user.role}
          roleColor={session.user.roleColor}
          permissions={session.user.permissions}
          userName={session.user.name}
          avatar={session.user.image}
          showSignOut={!testMode}
          signOutAction={handleSignOut}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <TestModeBanner />
            {children}
          </main>
        </div>
        <AdminToaster />
      </div>
    </NextIntlClientProvider>
  );
}
