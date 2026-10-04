/**
 * Native ARM64 build of Beat Saber for ARM64 Proton (e.g. the Steam Frame).
 * The runtime itself lives in https://github.com/DaVarga/bs-arm64; BSManager
 * downloads its release matching the selected Proton build and runs its installer.
 */

export const BS_ARM64_REPOSITORY = "DaVarga/bs-arm64";

// bs-arm64-manifest.json of a release (0.3.0 and later): what the release was tested with
export const BS_ARM64_MANIFEST_ASSET = "bs-arm64-manifest.json";

export interface BsArm64Manifest {
    version: string;
    proton: string;
    unityVersions: string[];
    bsVersions: string[];
    bsipaVersions: string[];
}

// Releases without a manifest (0.2.2 and older), or when it can't be fetched
export const BS_ARM64_FALLBACK_MANIFEST: Pick<BsArm64Manifest, "bsVersions" | "bsipaVersions"> = {
    bsVersions: ["1.44.1"],
    bsipaVersions: ["4.3.7"],
};

export enum BsArm64Unsupported {
    NOT_LINUX_ARM64 = "NOT_LINUX_ARM64",
    PROTON_NOT_ARM64 = "PROTON_NOT_ARM64",
    NO_RELEASE = "NO_RELEASE",
    VERSION_NOT_SUPPORTED = "VERSION_NOT_SUPPORTED",
}

// Why the native ARM64 build can only be installed without mod support
export enum BsArm64ModsUnavailable {
    // BSIPA isn't installed and BeatMods has none for this version
    NO_BSIPA = "NO_BSIPA",
    // The BSIPA version isn't one the release was tested with
    BSIPA_NOT_SUPPORTED = "BSIPA_NOT_SUPPORTED",
}

export interface BsArm64Status {
    // Why this instance can't be patched; undefined when it can
    unsupported?: BsArm64Unsupported;
    // Beat Saber versions the release matching the Proton build was tested with
    supportedVersions?: string[];
    // Why mod support can't be installed; undefined when it can
    modsUnavailable?: BsArm64ModsUnavailable;
    // Installed BSIPA, else the one BeatMods offers for this version
    bsipaVersion?: string;
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
