import fs from "fs-extra";
import path from "path";
import { LinuxService } from "main/services/linux.service";
import { BS_APP_ID } from "main/constants";
import { LaunchMod, LaunchMods } from "shared/models/bs-launch/launch-option.interface";
import { LaunchOption } from "shared/models/bs-launch";
import { bsmExec } from "main/helpers/os.helpers";
import { isBsArm64Installed, isBsArm64ModsDisabled } from "main/helpers/bs-arm64.helpers";
import { BSLaunchError } from "shared/models/bs-launch";

const mockFoveatedRendering = jest.fn(async () => false);

jest.mock("electron", () => ({
    app: { getPath: () => "" },
}));

jest.mock("electron-log", () => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
}));

jest.mock("main/services/installation-location.service", () => ({
    InstallationLocationService: { getInstance: jest.fn(() => ({})) },
}));
jest.mock("main/services/static-configuration.service", () => ({
    StaticConfigurationService: { getInstance: jest.fn(() => ({})) },
}));
jest.mock("main/helpers/os.helpers", () => ({
    BsmShellLog: { Command: 1 },
    bsmExec: jest.fn(),
}));
jest.mock("main/helpers/bs-arm64.helpers", () => ({
    isBsArm64Installed: jest.fn(() => false),
    isBsArm64ModsDisabled: jest.fn(() => false),
}));
jest.mock("main/services/bs-launcher/abstract-launcher.service", () => ({
    buildBsLaunchArgs: jest.fn((): string[] => []),
}));
jest.mock("main/services/steam.service", () => ({
    SteamService: { getInstance: jest.fn(() => ({ isFoveatedRenderingEnabled: mockFoveatedRendering })) },
}));
jest.mock("main/helpers/launchOptions.helper", () => ({
    parseLaunchOptions: jest.fn(() => ({ env: {}, cmdlet: "", args: "" })),
}));

jest.mock("fs-extra", () => ({
    __esModule: true,
    default: {
        accessSync: jest.fn(),
        constants: { X_OK: 1 },
        existsSync: jest.fn(() => true),
        ensureDir: jest.fn(),
        pathExistsSync: jest.fn(() => true),
        readFileSync: jest.fn(),
        statSync: jest.fn(() => ({ isFile: () => true })),
        writeFile: jest.fn(),
    },
}));

describe("LinuxService.buildEnvVariables", () => {
    const steamPath = "/steam";
    const bsFolderPath = "/BSInstance";
    const sharedContentPath = "/shared-content";
    const compatDataPath = path.resolve(sharedContentPath, "compatdata");

    function buildService(): LinuxService {
        const service = Reflect.construct(LinuxService, []) as LinuxService;

        (service as any).installLocationService = {
            sharedContentPath: () => sharedContentPath,
        };
        (service as any).staticConfig = {
            has: jest.fn(() => true),
            get: jest.fn(() => "/proton"),
            set: jest.fn(async () => undefined),
        };
        (service as any).nixOS = false;
        (service as any).getProtonPath = jest.fn(async () => "/proton/proton");
        (service as any).getProtonPrefix = jest.fn(async () => '"/proton/proton" run');

        return service;
    }

    function buildLaunchOption(launchMods: LaunchMod[] = []): LaunchOption {
        return {
            version: { BSVersion: "1.29.1" },
            launchMods,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.accessSync as jest.Mock).mockImplementation(() => undefined);
        (fs.pathExistsSync as jest.Mock).mockReturnValue(true);
        (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (bsmExec as jest.Mock).mockRejectedValue(new Error("not nixos"));
        (isBsArm64Installed as jest.Mock).mockReturnValue(false);
        (isBsArm64ModsDisabled as jest.Mock).mockReturnValue(false);
        mockFoveatedRendering.mockResolvedValue(false);
    });

    it("gives the game XDG_DATA_DIRS without the AppImage's dirs and duplicates", async () => {
        const saved = { XDG_DATA_DIRS: process.env.XDG_DATA_DIRS, APPDIR: process.env.APPDIR };
        process.env.APPDIR = "/tmp/.mount_BSMana1";
        process.env.XDG_DATA_DIRS = "/tmp/.mount_BSMana1/usr/share/:/usr/local/share:/usr/share:/usr/share/gnome:/usr/local/share/:/usr/share/";
        try {
            const env = await buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath);

            expect(env.XDG_DATA_DIRS).toBe("/usr/local/share:/usr/share:/usr/share/gnome");
        } finally {
            for (const [key, value] of Object.entries(saved)) {
                if (value === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = value;
                }
            }
        }
    });

    describe("SteamVR foveated rendering (Valve's fdm_injection)", () => {
        it("turns the layer off while Steam's Foveated Rendering is off", async () => {
            const env = await buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath);

            expect(mockFoveatedRendering).toHaveBeenCalledWith(BS_APP_ID, steamPath);
            expect(env.DISABLE_VULKAN_FDM_INJECTION_LAYER).toBe("1");
            expect(env).not.toHaveProperty("FDM_DEBUG");
            expect(env).not.toHaveProperty("VK_INSTANCE_LAYERS");
        });

        it("enables both halves of the layer like Steam when Foveated Rendering is on", async () => {
            mockFoveatedRendering.mockResolvedValue(true);

            const env = await buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath);

            expect(env).toEqual(expect.objectContaining({
                FDM_DEBUG: "enable",
                VK_INSTANCE_LAYERS: "VK_LAYER_VALVE_rpo:VK_LAYER_VALVE_fdm_injection",
            }));
            expect(env).not.toHaveProperty("DISABLE_VULKAN_FDM_INJECTION_LAYER");
        });

        it("turns the layer off if Steam's settings can't be read", async () => {
            mockFoveatedRendering.mockRejectedValue(new Error("no localconfig.vdf"));

            const env = await buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath);

            expect(env.DISABLE_VULKAN_FDM_INJECTION_LAYER).toBe("1");
        });
    });

    describe("native ARM64 instance (bs-arm64)", () => {
        const runtimeDir = path.join(compatDataPath, "pfx", "drive_c", "bs-arm64");

        // Proton's version file and the Proton build the prefix runtime was set up for
        function mockProtonBuilds(current: string, installedFor: string) {
            (fs.readFileSync as jest.Mock).mockImplementation((file: string) => {
                if (file === path.join("/proton", "version")) {
                    return `1758000000 ${current}\n`;
                }
                if (file === path.join(runtimeDir, "proton-version")) {
                    return `${installedFor}\n`;
                }
                throw new Error(`unexpected read ${file}`);
            });
        }

        beforeEach(() => {
            (isBsArm64Installed as jest.Mock).mockReturnValue(true);
        });

        it("adds the ARM64 runtime dir and keeps BSIPA's Doorstop with mod support", async () => {
            mockProtonBuilds("proton-11.0-2c-arm64", "proton-11.0-2c-arm64");

            const env = await buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath);

            expect(isBsArm64Installed).toHaveBeenCalledWith(bsFolderPath);
            expect(env).toEqual(expect.objectContaining({
                WINEDLLPATH: runtimeDir,
                WINEDLLOVERRIDES: "winhttp=n,b",
                DISABLE_VULKAN_FDM_INJECTION_LAYER: "1",
            }));
        });

        it("uses SteamVR's foveated rendering, not its own, when Foveated Rendering is on", async () => {
            mockProtonBuilds("proton-11.0-2c-arm64", "proton-11.0-2c-arm64");
            mockFoveatedRendering.mockResolvedValue(true);

            const env = await buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath);

            expect(env).toEqual(expect.objectContaining({
                WINEDLLPATH: runtimeDir,
                FDM_DEBUG: "enable",
                VK_INSTANCE_LAYERS: "VK_LAYER_VALVE_rpo:VK_LAYER_VALVE_fdm_injection",
            }));
            expect(env).not.toHaveProperty("DISABLE_VULKAN_FDM_INJECTION_LAYER");
            expect(env).not.toHaveProperty("BS_ARM64_FDM");
        });

        it("never loads Doorstop when installed without mod support", async () => {
            mockProtonBuilds("proton-11.0-2c-arm64", "proton-11.0-2c-arm64");
            (isBsArm64ModsDisabled as jest.Mock).mockReturnValue(true);

            const env = await buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath);

            expect(env.WINEDLLOVERRIDES).toBe("winhttp=b");
        });

        it("refuses to launch after a Proton update", async () => {
            mockProtonBuilds("proton-11.0-3-arm64", "proton-11.0-2c-arm64");

            await expect(buildService().buildEnvVariables(buildLaunchOption(), steamPath, bsFolderPath))
                .rejects.toMatchObject({ code: BSLaunchError.BS_ARM64_PROTON_MISMATCH });
        });
    });

    it("keeps parallel views out of the default Linux launch environment", async () => {
        const env = await buildService().buildEnvVariables(
            buildLaunchOption(),
            steamPath,
            bsFolderPath
        );

        expect(env).toEqual(expect.objectContaining({
            WINEDLLOVERRIDES: "winhttp=n,b",
            STEAM_COMPAT_DATA_PATH: compatDataPath,
            STEAM_COMPAT_INSTALL_PATH: bsFolderPath,
            STEAM_COMPAT_CLIENT_INSTALL_PATH: steamPath,
            STEAM_COMPAT_APP_ID: BS_APP_ID,
            SteamEnv: "1",
            OXR_NO_TEXTURE_SOURCE_ALPHA: "1",
        }));
        expect(env).not.toHaveProperty("OXR_PARALLEL_VIEWS");
    });

    it("adds parallel views and proton logging only when their launch mods are active", async () => {
        const env = await buildService().buildEnvVariables(
            buildLaunchOption([LaunchMods.PARALLEL_VIEWS, LaunchMods.PROTON_LOGS]),
            steamPath,
            bsFolderPath
        );

        expect(env).toEqual(expect.objectContaining({
            OXR_PARALLEL_VIEWS: "1",
            PROTON_LOG: "1",
            PROTON_LOG_DIR: path.join(bsFolderPath, "Logs"),
        }));
    });

    it("keeps parallel views out of generated Linux shortcuts by default", async () => {
        const shortcutData = await buildService().getSteamShortcutData(
            "Beat Saber",
            "/icon.png",
            buildLaunchOption(),
            steamPath,
            bsFolderPath
        );

        expect(shortcutData.LaunchOptions).not.toContain("OXR_PARALLEL_VIEWS");
    });

    it("adds parallel views to generated Linux shortcuts when the launch mod is active", async () => {
        const service = buildService();
        const launchOption = buildLaunchOption([LaunchMods.PARALLEL_VIEWS]);

        const shortcutData = await service.getSteamShortcutData(
            "Beat Saber",
            "/icon.png",
            launchOption,
            steamPath,
            bsFolderPath
        );
        expect(shortcutData.LaunchOptions).toContain("OXR_PARALLEL_VIEWS=\"1\"");

        await service.createDesktopShortcut(
            "/shortcut.desktop",
            "Beat Saber",
            "/icon.png",
            launchOption,
            steamPath,
            bsFolderPath
        );

        expect(fs.writeFile).toHaveBeenCalledWith(
            "/shortcut.desktop",
            expect.stringContaining("OXR_PARALLEL_VIEWS=\"1\"")
        );
    });

    it("persists a trimmed Proton folder when its binaries are valid", async () => {
        const service = buildService();

        await expect(service.setProtonFolder("  /proton-candidate  ")).resolves.toBe(true);
        expect((service as any).staticConfig.set).toHaveBeenCalledWith(
            "proton-folder",
            "/proton-candidate"
        );
    });

    it("does not persist an invalid Proton folder", async () => {
        const service = buildService();
        const verifyProtonPath = jest.spyOn(service, "verifyProtonPath").mockReturnValue(false);

        await expect(service.setProtonFolder("  /invalid-proton  ")).resolves.toBe(false);
        expect(verifyProtonPath).toHaveBeenCalledWith("/invalid-proton");
        expect((service as any).staticConfig.set).not.toHaveBeenCalled();
    });

    it("does not replace the stored Proton folder with an empty submitted path", async () => {
        const service = buildService();

        await expect(service.setProtonFolder("   ")).resolves.toBe(false);
        expect((service as any).staticConfig.set).not.toHaveBeenCalled();
    });

    it("accepts a Proton folder with executable regular Proton and Wine files", () => {
        expect(buildService().verifyProtonPath("/proton-candidate")).toBe(true);
    });

    it("accepts and uses the native Wine binary from ARM64 Proton", () => {
        const protonPath = path.join("/proton-candidate", "proton");
        const armWinePath = path.join("/proton-candidate", "files", "bin-arm64", "wine");
        (fs.pathExistsSync as jest.Mock).mockImplementation(filePath =>
            [protonPath, armWinePath].includes(filePath)
        );

        const service = buildService();
        (service as any).staticConfig.get.mockReturnValue("/proton-candidate");
        expect(service.verifyProtonPath("/proton-candidate")).toBe(true);
        expect(service.getWinePath()).toBe(armWinePath);
    });

    it("rejects a Proton folder when a required binary path is a directory", () => {
        (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => false });

        expect(buildService().verifyProtonPath("/proton-candidate")).toBe(false);
    });

    it("rejects a Proton folder when a required binary is not executable", () => {
        (fs.accessSync as jest.Mock).mockImplementation(() => {
            throw new Error("not executable");
        });

        expect(buildService().verifyProtonPath("/proton-candidate")).toBe(false);
    });

    it("rejects a Proton folder when a required binary is missing", () => {
        (fs.pathExistsSync as jest.Mock).mockReturnValue(false);

        expect(buildService().verifyProtonPath("/proton-candidate")).toBe(false);
    });
});
