/**
 * Which side of the house this build draws, folded at build time.
 *
 * The desk's build draws the desk, the guest site's build draws the guest
 * site, and the demo draws both. Each is a literal once Vite has replaced the
 * surface flag, so a screen, a sheet or a door guarded by one is not merely
 * hidden in the other side's bundle — it is not in it: a guest's page never
 * carries the desk's code, its words or its routes.
 */
import { SURFACE_SIDE } from "../surface.ts";

export const DESK = SURFACE_SIDE !== "customer";
export const GUEST = SURFACE_SIDE !== "staff";
