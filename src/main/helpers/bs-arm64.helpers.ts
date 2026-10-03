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

// Unity engine version baked into the instance, e.g. "6000.0.40f1", read from the header of
// Beat Saber_Data/globalgamemanagers. Mirrors engine_version() in the bs-arm64 installer.
export async function readBsArm64Engine(versionPath: string): Promise<string | undefined> {
    const file = path.join(versionPath, "Beat Saber_Data", "globalgamemanagers");
    const data = await fs.readFile(file, "latin1").catch((): undefined => undefined);
    return data?.match(/\d{4}\.\d+\.\d+f\d+/)?.[0];
}
