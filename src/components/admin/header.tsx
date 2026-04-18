import { getSessionOrTest, isTestMode, signOut } from "@/lib/auth";
import { MobileSidebar } from "@/components/admin/mobile-sidebar";

export async function Header() {
  const session = await getSessionOrTest();
  if (!session?.user) return null;

  const { name, role, roleColor, permissions } = session.user;
  const testMode = isTestMode();

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <header className="flex items-center border-b border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden">
      <div className="flex items-center gap-3">
        <MobileSidebar
          role={role}
          roleColor={roleColor}
          permissions={permissions}
          userName={name}
          avatar={session.user.image}
          showSignOut={!testMode}
          signOutAction={handleSignOut}
        />
        <span
          className="text-base tracking-wider text-zinc-100"
          style={{ fontFamily: '"SAIBA 45", sans-serif' }}
        >
          ARMAFIELD
        </span>
      </div>
    </header>
  );
}
