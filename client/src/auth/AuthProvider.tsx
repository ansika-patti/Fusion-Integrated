import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { errorStatus, http, setCsrfToken, setUnauthorizedHandler } from "../lib/http";
import type { Session } from "./types";

export interface AuthValue {
  session: Session | null;
  /** `unavailable` is "we could not ask", which is not the same as signed out. */
  status: "loading" | "authenticated" | "anonymous" | "unavailable";
  can: (permission: string) => boolean;
  hasModule: (code: string) => boolean;
  logout: () => Promise<void>;
  enableDevPreview: () => void;
}

const DEV_FALLBACK_SESSION: Session = {
  user: {
    id: 1,
    username: "super_admin",
    display_name: "Super Admin Operator",
    kind: "operator",
    email: "admin@iiitdmj.ac.in",
  },
  active_role: "super_admin",
  roles: ["super_admin"],
  permissions: [
    "system_admin.user.view",
    "system_admin.user.create",
    "system_admin.user.update",
    "system_admin.user.deactivate",
    "system_admin.user.reactivate",
    "system_admin.user.bulk_manage",
    "system_admin.role.view",
    "system_admin.role.assign",
    "system_admin.role.reassign",
    "system_admin.role.revoke",
    "system_admin.role.extend",
    "system_admin.archive.view",
    "system_admin.archive.create",
    "system_admin.archive.restore",
    "system_admin.purge.request",
    "system_admin.purge.authorize",
    "system_admin.audit.view",
    "system_admin.audit.report",
    "system_admin.config.view",
    "system_admin.config.update",
  ],
  modules: ["system_admin", "placement_cell"],
  navigation: [
    {
      title: "Administration",
      items: [
        {
          code: "system_admin.dashboard",
          label: "Admin Dashboard",
          icon: "FaTachometerAlt",
          to: "/sysadmin/dashboard",
        },
        {
          code: "system_admin.users",
          label: "User Management",
          icon: "FaUsers",
          to: "/sysadmin/users",
        },
        {
          code: "system_admin.users.bulk",
          label: "Bulk Operations",
          icon: "FaFileUpload",
          to: "/sysadmin/users/bulk",
        },
        {
          code: "system_admin.roles",
          label: "Role Management",
          icon: "FaIdBadge",
          to: "/sysadmin/roles",
        },
        {
          code: "system_admin.archival",
          label: "Archive Control",
          icon: "FaArchive",
          to: "/sysadmin/archival",
        },
        {
          code: "system_admin.purge",
          label: "Data Purge",
          icon: "FaTrashAlt",
          to: "/sysadmin/purge",
        },
        {
          code: "system_admin.audit",
          label: "Audit Logs",
          icon: "FaHistory",
          to: "/sysadmin/audit",
        },
        {
          code: "system_admin.config",
          label: "System Parameters",
          icon: "FaCogs",
          to: "/sysadmin/config",
        },
      ],
    },
  ],
  csrf_token: "dev-preview-token",
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isDevPreview, setIsDevPreview] = useState(() => {
    return localStorage.getItem("fusion_dev_preview") === "true";
  });

  const { data, isPending, isError } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      if (isDevPreview) return DEV_FALLBACK_SESSION;
      try {
        return (await http.get<Session>("/me")).data;
      } catch (e) {
        // 401 is the answer "nobody"; anything else is a real failure.
        if (errorStatus(e) === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const enableDevPreview = useCallback(() => {
    localStorage.setItem("fusion_dev_preview", "true");
    setIsDevPreview(true);
    qc.setQueryData(["session"], DEV_FALLBACK_SESSION);
  }, [qc]);

  // Re-armed on every /me, so a refreshed tab can write again.
  useEffect(() => {
    setCsrfToken(data?.csrf_token ?? "");
  }, [data?.csrf_token]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      qc.setQueryData(["session"], null);
      if (!window.location.pathname.startsWith("/login")) navigate("/login");
    });
  }, [navigate, qc]);

  const logout = useCallback(async () => {
    try {
      await http.post("/auth/logout");
    } catch {
      /* best effort — the cookie is cleared server-side either way */
    }
    setCsrfToken("");
    qc.setQueryData(["session"], null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "session" });
    navigate("/login");
  }, [navigate, qc]);

  const value = useMemo<AuthValue>(() => {
    const session = data ?? null;
    const perms = new Set(session?.permissions ?? []);
    const mods = new Set(session?.modules ?? []);
    return {
      session,
      status: isPending ? "loading"
        : isError ? "unavailable"
        : session ? "authenticated" : "anonymous",
      // UX only: every one of these has a server-side counterpart.
      can: (p) => perms.has(p),
      hasModule: (m) => mods.has(m),
      logout,
      enableDevPreview,
    };
  }, [data, isPending, isError, logout, enableDevPreview]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
