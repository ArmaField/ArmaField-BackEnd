import { redirect } from "next/navigation";
import { auth, isTestMode } from "@/lib/auth";
import { SteamLoginButton } from "./steam-login-button";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // In test mode, the login page is not needed - redirect to dashboard
  if (isTestMode()) {
    redirect("/");
  }

  const searchParams = await props.searchParams;

  const session = await auth();
  if (session?.user) {
    if (!session.user.role) {
      redirect("/no-access");
    }
    redirect("/");
  }

  const errorParam = searchParams?.error;
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-xs space-y-8">
        {/* Heading */}
        <div className="text-center">
          <h1
            className="text-4xl tracking-wider text-white sm:text-5xl"
            style={{ fontFamily: '"SAIBA 45", sans-serif' }}
          >
            ARMAFIELD
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{t("adminPanel")}</p>
        </div>

        {/* Error message */}
        {errorParam && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-center text-sm text-red-400">
            {errorParam === "SteamVerificationFailed"
              ? t("steamVerificationFailed")
              : t("signInError")}
          </div>
        )}

        {/* Login buttons */}
        <div className="space-y-3">
          <SteamLoginButton />
        </div>
      </div>
    </div>
  );
}
