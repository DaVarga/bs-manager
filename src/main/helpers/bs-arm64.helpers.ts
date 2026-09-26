import path from "node:path";
import fs from "fs-extra";

// Written by the bs-arm64 installer into a patched Beat Saber instance
export const BS_ARM64_STATE_DIR = ".bs-arm64";

export function isBsArm64Installed(versionPath: string): boolean {
    return fs.existsSync(path.join(versionPath, BS_ARM64_STATE_DIR, "installed"));
}

// Installed without mod support: BSIPA's (x64) Doorstop must not be loaded
export function isBsArm64ModsDisabled(versionPath: string): boolean {
    const modsFile = path.join(versionPath, BS_ARM64_STATE_DIR, "mods");
    return fs.existsSync(modsFile) && fs.readFileSync(modsFile, "utf8").trim() === "0";
}
