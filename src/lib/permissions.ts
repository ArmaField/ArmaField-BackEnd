export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  SERVERS_VIEW: "servers.view",
  SERVERS_MANAGE: "servers.manage",
  LOADOUTS_VIEW: "loadouts.view",
  LOADOUTS_MANAGE: "loadouts.manage",
  PLAYERS_VIEW: "players.view",
  PLAYERS_MANAGE: "players.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  LOGS_VIEW: "logs.view",
  BACKUPS_VIEW: "backups.view",
  BACKUPS_MANAGE: "backups.manage",
  SYSTEM_VIEW: "system.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** All permissions list for UI display */
export const ALL_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: "dashboard.view", label: "View Dashboard", description: "Access the dashboard page" },
  { key: "servers.view", label: "View Servers", description: "See server list" },
  { key: "servers.manage", label: "Manage Servers", description: "Add, edit, delete servers" },
  { key: "loadouts.view", label: "View Loadouts", description: "See weapons, attachments, gadgets" },
  { key: "loadouts.manage", label: "Manage Loadouts", description: "Add, edit, delete loadout content" },
  { key: "players.view", label: "View Players", description: "See player list and profiles" },
  { key: "players.manage", label: "Manage Players", description: "Edit and delete player profiles" },
  { key: "users.view", label: "View Users", description: "See admin user list" },
  { key: "users.manage", label: "Manage Users", description: "Change roles, delete users" },
  { key: "roles.manage", label: "Manage Roles", description: "Create, edit, delete roles" },
  { key: "logs.view", label: "View Logs", description: "Access application logs" },
  { key: "backups.view", label: "View Backups", description: "See backup list" },
  { key: "backups.manage", label: "Manage Backups", description: "Create and restore backups" },
  { key: "system.view", label: "View System Info", description: "Access system configuration" },
];
