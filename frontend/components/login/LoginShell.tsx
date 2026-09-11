import type { ReactNode } from "react";
import AuthHeader from "./AuthHeader";
import AuthFooter from "./AuthFooter";
import PortalTabs from "./PortalTabs";
import RightPanel from "./RightPanel";

export default function LoginShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full flex-col bg-brand-cream lg:flex-row">
      <section className="z-10 flex w-full flex-col justify-between border-r border-brand-sand/70 bg-brand-cream px-6 py-8 sm:px-10 lg:w-[46%] lg:px-12 xl:w-[42%]">
        <div>
          <AuthHeader />
          <div className="mx-auto w-full max-w-lg py-6 sm:py-8">
            <PortalTabs />
            {children}
          </div>
        </div>
        <AuthFooter />
      </section>

      <div className="hidden lg:block lg:min-h-screen lg:w-[54%] xl:w-[58%]">
        <RightPanel />
      </div>
    </main>
  );
}