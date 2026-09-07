// Maintenance mode — read at build time.
// Set the `MAINTENANCE_MODE` env var (or the GitHub Actions variable
// `MAINTENANCE_MODE` in the deploy workflow) to `true` to ship a maintenance
// page instead of the real site. Flip it back to `false` (or unset) to go live.

const fromImportMeta: string | undefined = import.meta.env.MAINTENANCE_MODE as string | undefined;
const fromProcess: string | undefined = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.MAINTENANCE_MODE;

export const MAINTENANCE_MODE: boolean = (fromImportMeta ?? fromProcess) === 'true';

// Rutas públicas que permanecen visibles aunque el modo mantenimiento esté
// activo (p. ej. entregables académicos como la escena interactiva).
const RUTAS_PUBLICAS = ['/narrativa', '/narrativa/'];

export function pageInMaintenance(pathname: string): boolean {
  if (!MAINTENANCE_MODE) return false;
  return !RUTAS_PUBLICAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}