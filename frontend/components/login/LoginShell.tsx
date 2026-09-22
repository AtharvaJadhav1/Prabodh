import type { ReactNode } from "react";
import AuthHeader from "./AuthHeader";
import AuthFooter from "./AuthFooter";
import PortalTabs from "./PortalTabs";
import RightPanel from "./RightPanel";

export default function LoginShell({
  children,
  showPortalTabs = true,
}: {
  children: ReactNode;
  showPortalTabs?: boolean;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col bg-brand-cream lg:flex-row">
      <section className="z-10 flex min-h-screen w-full flex-col justify-between border-r border-brand-sand/70 bg-brand-cream p-8 sm:p-12 lg:w-[46%] xl:w-[42%]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <AuthHeader />
          <div className="py-6 pb-10 pt-4 sm:py-8">
            {showPortalTabs ? <PortalTabs /> : null}
            {children}
          </div>
        </div>
        <div className="mt-auto pt-6">
          <AuthFooter />
        </div>
      </section>

      <div className="hidden lg:block lg:min-h-screen lg:w-[54%] xl:w-[58%]">
        <RightPanel />
      </div>
    </main>
  );
}