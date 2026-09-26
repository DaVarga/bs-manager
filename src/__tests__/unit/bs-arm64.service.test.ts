import { findBsArm64ReleaseAsset, GithubRelease } from "main/services/bs-arm64.service";

jest.mock("electron", () => ({ app: { getPath: () => "", getVersion: () => "0.0.0" } }));
jest.mock("electron-log", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock("main/services/bs-local-version.service", () => ({ BSLocalVersionService: { getInstance: jest.fn() } }));
jest.mock("main/services/installation-location.service", () => ({ InstallationLocationService: { getInstance: jest.fn() } }));
jest.mock("main/services/linux.service", () => ({ LinuxService: { getInstance: jest.fn() } }));
jest.mock("main/services/request.service", () => ({ RequestService: { getInstance: jest.fn() } }));

function release(tag: string, protonTags: string[], extra: Partial<GithubRelease> = {}): GithubRelease {
    return {
        tag_name: tag,
        draft: false,
        prerelease: false,
        assets: protonTags.flatMap(p => [
            { name: `bs-arm64-${tag}-${p}.tar.gz`, browser_download_url: `https://x/${tag}/${p}.tar.gz` },
            { name: `bs-arm64-${tag}-${p}.tar.gz.sha256`, browser_download_url: `https://x/${tag}/${p}.sha256` },
        ]),
        ...extra,
    };
}

describe("findBsArm64ReleaseAsset", () => {
    const releases = [
        release("v0.2.0", ["proton-11.0-3"]),
        release("v0.1.1", ["proton-11.0-2c"]),
        release("v0.1.0", ["proton-11.0-2c"]),
    ];

    it("picks the newest release built for the Proton build", () => {
        const match = findBsArm64ReleaseAsset(releases, "proton-11.0-2c-arm64");
        expect(match?.release.tag_name).toBe("v0.1.1");
        expect(match?.asset.name).toBe("bs-arm64-v0.1.1-proton-11.0-2c.tar.gz");
    });

    it("matches the Proton tag exactly, not as a prefix of another build", () => {
        expect(findBsArm64ReleaseAsset(releases, "proton-11.0-2cd-arm64")).toBeUndefined();
        expect(findBsArm64ReleaseAsset(releases, "proton-11.0-3-arm64")?.release.tag_name).toBe("v0.2.0");
    });

    it("skips drafts and prereleases", () => {
        const withDraft = [release("v0.3.0", ["proton-11.0-2c"], { draft: true }), release("v0.2.9", ["proton-11.0-2c"], { prerelease: true }), ...releases];
        expect(findBsArm64ReleaseAsset(withDraft, "proton-11.0-2c-arm64")?.release.tag_name).toBe("v0.1.1");
    });

    it("finds nothing without a Proton build or matching release", () => {
        expect(findBsArm64ReleaseAsset(releases, undefined)).toBeUndefined();
        expect(findBsArm64ReleaseAsset(releases, "proton-10.0-arm64")).toBeUndefined();
    });
});
