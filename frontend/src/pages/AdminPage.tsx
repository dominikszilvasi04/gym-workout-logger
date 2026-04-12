import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { adminAPI, type AdminAuditLog, type AdminUser } from "../services/api";
import { useAuthStore } from "../store/authStore";

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [deletingIdentifier, setDeletingIdentifier] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
  const logout = useAuthStore((state) => state.logout);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [userResponse, auditResponse] = await Promise.all([
        adminAPI.listUsers(),
        adminAPI.listAuditLogs(20),
      ]);
      setUsers(userResponse);
      setAuditLogs(auditResponse);
      setFeedbackMessage(null);
      setFeedbackType(null);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const metrics = useMemo(() => {
    const adminCount = users.filter((user) => user.role === "admin").length;
    const googleCount = users.filter((user) => user.auth_provider === "google").length;
    return {
      totalUsers: users.length,
      adminCount,
      googleCount,
    };
  }, [users]);

  const deleteOneUser = async (user: AdminUser) => {
    const confirmation = window.confirm(
      `Delete ${user.email}? This will hard-delete all workouts and templates for this user.`
    );
    if (!confirmation) {
      return;
    }

    setDeletingIdentifier(user._id);
    setFeedbackMessage(null);
    setFeedbackType(null);
    try {
      const result = await adminAPI.deleteUser(user._id);
      setFeedbackType("success");
      setFeedbackMessage(
        `Deleted ${user.email}. Removed ${result.deleted_workouts} workouts and ${result.deleted_templates} templates.`
      );
      await loadUsers();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Unable to delete user.");
    } finally {
      setDeletingIdentifier(null);
    }
  };

  const deleteAllUsers = async () => {
    const typedConfirmation = window.prompt(
      "Type DELETE ALL USERS to confirm hard deletion of every user and their workouts/templates."
    );
    if (typedConfirmation !== "DELETE ALL USERS") {
      setFeedbackType("error");
      setFeedbackMessage("Delete-all cancelled. Confirmation text did not match.");
      return;
    }

    setDeletingIdentifier("ALL_USERS");
    setFeedbackMessage(null);
    setFeedbackType(null);
    try {
      const result = await adminAPI.deleteAllUsers();
      setFeedbackType("success");
      setFeedbackMessage(
        `Deleted ${result.deleted_users} users, ${result.deleted_workouts} workouts, and ${result.deleted_templates} templates.`
      );
      await logout();
      window.location.assign("/login");
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Unable to delete all users.");
    } finally {
      setDeletingIdentifier(null);
    }
  };

  const exportData = async () => {
    setExporting(true);
    setFeedbackMessage(null);
    setFeedbackType(null);
    try {
      const payload = await adminAPI.exportData();
      const fileName = `gym-workout-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setFeedbackType("success");
      setFeedbackMessage(`Export complete: ${payload.counts.users} users, ${payload.counts.workouts} workouts, ${payload.counts.workout_templates} templates.`);
      setAuditLogs(await adminAPI.listAuditLogs(20));
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Unable to export data.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ApplicationShell title="Admin">
      <Card border className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Administration</p>
            <p className="mt-1 font-display text-xl font-semibold text-navy-900">User lifecycle controls</p>
            <p className="mt-1 text-sm text-navy-600">Hard-delete users and cascade-delete workouts/templates.</p>
          </div>
          <div className="rounded-2xl border border-primary-300/35 bg-primary-100/25 p-3 text-primary-700">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Users</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{metrics.totalUsers}</p>
          </div>
          <div className="rounded-xl border border-primary-300/45 bg-primary-100/30 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700">Admins</p>
            <p className="mt-1 font-display text-lg font-semibold text-primary-900">{metrics.adminCount}</p>
          </div>
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Google</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{metrics.googleCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-300/40 bg-red-200/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-200">Danger zone: deletion is permanent and cannot be undone.</p>
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-primary-300/60"
                isLoading={exporting}
                onClick={() => void exportData()}
              >
                Export data backup
              </Button>
              <Button
                variant="ghost"
                className="border border-red-300/50 text-red-100 hover:bg-red-300/20"
                icon={<Trash2 size={14} />}
                isLoading={deletingIdentifier === "ALL_USERS"}
                onClick={() => void deleteAllUsers()}
              >
                Delete all users
              </Button>
            </div>
          </div>
        </div>

        {feedbackMessage ? (
          <p
            role="status"
            aria-live="polite"
            className={feedbackType === "error" ? "text-sm text-red-200" : "text-sm text-primary-100"}
          >
            {feedbackMessage}
          </p>
        ) : null}
      </Card>

      <section className="space-y-3">
        {loading ? (
          <Card border>
            <div className="h-28 animate-pulse rounded-xl bg-navy-200" />
          </Card>
        ) : users.length === 0 ? (
          <Card border>
            <p className="text-sm text-navy-600">No users found.</p>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user._id} border className="bg-navy-100/95 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-navy-950">{user.display_name || user.email}</p>
                  <p className="mt-1 text-sm text-navy-600">{user.email}</p>
                  <p className="mt-1 text-xs text-navy-500">
                    Joined {format(new Date(user.created_at), "d MMM yyyy")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge colour={user.role === "admin" ? "primary" : "neutral"} size="small">
                      {user.role}
                    </Badge>
                    <Badge colour="neutral" size="small">
                      {user.auth_provider || "local"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={14} />}
                  onClick={() => void deleteOneUser(user)}
                  isLoading={deletingIdentifier === user._id}
                  className="border border-red-300/50 text-red-200 hover:bg-red-300/20"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>

      <Card border className="bg-navy-100/95 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold text-navy-950">Recent admin activity</p>
          <Button size="sm" variant="outline" onClick={() => void loadUsers()}>
            Refresh
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-navy-600">No audit events yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log._id} className="rounded-lg border border-navy-300/60 bg-navy-50/60 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-800">{log.action}</p>
                  <p className="text-xs text-navy-500">{format(new Date(log.timestamp), "d MMM yyyy, HH:mm")}</p>
                </div>
                <p className="mt-1 text-xs text-navy-600">Actor: {log.actor_email || "unknown"}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card border className="bg-navy-100/90">
        <div className="flex items-center gap-2 text-sm text-navy-600">
          <UserRound size={14} className="text-primary-700" />
          <p>Only elevated users can view this screen and call admin APIs.</p>
        </div>
      </Card>
    </ApplicationShell>
  );
}
