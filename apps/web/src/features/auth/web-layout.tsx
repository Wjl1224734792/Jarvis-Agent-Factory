import { APP_NAME } from "@feijia/shared";
import { Outlet } from "react-router-dom";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { UserMenu } from "./user-menu";

export function WebLayout() {
  useBootstrapAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)]">
      <header className="border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Feijia</p>
            <h1 className="text-lg font-semibold text-slate-950">{APP_NAME}</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
