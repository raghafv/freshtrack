// Local shim that re-exports the cloud auth factory from the installed package
// Keeps direct package references out of integration files for branding reasons.

export { createLovableAuth } from "freshtrack-cloud-auth";
