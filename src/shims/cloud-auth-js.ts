// Local shim that re-exports the cloud auth factory from the installed package
// Keeps direct package references out of integration files.

// Re-export under a FreshTrack-friendly name to avoid showing legacy branding in top-level files.
export { createLovableAuth as createFreshtrackAuth } from "freshtrack-cloud-auth";
