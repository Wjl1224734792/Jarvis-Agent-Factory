import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import { NavLink, Outlet } from "react-router-dom";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { UserMenu } from "./user-menu";

export function WebLayout() {
  useBootstrapAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)]">
      <header className="border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Feijia</p>
              <h1 className="text-lg font-semibold text-slate-950">{APP_NAME}</h1>
            </div>
            <nav className="flex items-center gap-2">
              {[
                { to: APP_ROUTES.feedHome, label: "首页" },
                { to: APP_ROUTES.models, label: "机型库" }
              ].map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-white hover:text-slate-950"
                    }`
                  }
                  key={item.to}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
