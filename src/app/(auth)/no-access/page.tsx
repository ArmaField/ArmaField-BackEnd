import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { CopyableText } from "@/components/admin/copyable-text";
import { HiOutlineNoSymbol } from "react-icons/hi2";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role) {
    redirect("/");
  }

  const t = await getTranslations("noAccess");
  const tCommon = await getTranslations("common");

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-xs space-y-6 text-center sm:max-w-sm">
        {/* Icon */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
          <HiOutlineNoSymbol className="size-7 text-zinc-500" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-xl font-semibold text-white">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {t("message")}
          </p>
        </div>

        {/* Steam ID — click to copy */}
        <CopyableText text={session.user.steamId} label={t("yourSteamId")} />

        {/* Sign out */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            {tCommon("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
