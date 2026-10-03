/**
 * Native ARM64 build of Beat Saber for ARM64 Proton (e.g. the Steam Frame).
 * The runtime itself lives in https://github.com/DaVarga/bs-arm64; BSManager
 * downloads its release matching the selected Proton build and runs its installer.
 */

export const BS_ARM64_REPOSITORY = "DaVarga/bs-arm64";

// Unity engine versions the bs-arm64 runtime supports. The native runtime (player, mono, plugins)
// is engine-specific, not Beat Saber-version specific, so any game build on this engine works.
// The installer checks it again (engine_version() in bs-arm64.sh).
export const BS_ARM64_SUPPORTED_ENGINES = ["6000.0.40f1"];

export enum BsArm64Unsupported {
    NOT_LINUX_ARM64 = "NOT_LINUX_ARM64",
    PROTON_NOT_ARM64 = "PROTON_NOT_ARM64",
    ENGINE_NOT_SUPPORTED = "ENGINE_NOT_SUPPORTED",
}

export interface BsArm64Status {
    // Why this instance can't be patched; undefined when it can
    unsupported?: BsArm64Unsupported;
    installed: boolean;
    // Installed with mod support (ARM64 BSIPA fixes)
    mods: boolean;
    // Build of the selected Proton, e.g. "proton-11.0-2c-arm64"
    protonVersion?: string;
    // Proton build the installed files were set up for
    installedProtonVersion?: string;
    // bs-arm64 release the instance was patched with, e.g. "v0.1.1"
    installedRelease?: string;
}

export interface BsArm64InstallOptions {
    mods: boolean;
}

export interface BsArm64Progress {
    // Output line of the download or installer, for the log view
    log?: string;
    // Download progress, 0-100
    percent?: number;
}

export enum BsArm64Error {
    NO_MATCHING_RELEASE = "BS_ARM64_NO_MATCHING_RELEASE",
    CHECKSUM_MISMATCH = "BS_ARM64_CHECKSUM_MISMATCH",
    INSTALLER_FAILED = "BS_ARM64_INSTALLER_FAILED",
}
