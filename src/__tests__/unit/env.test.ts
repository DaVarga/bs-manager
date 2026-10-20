import { cleanSearchPath, parseEnvString } from "main/helpers/env.helpers";

describe("Test parseEnvString", () => {

    it("Empty", () => {
        const { env, command } = parseEnvString("");
        expect(env).toEqual({});
        expect(command).toEqual("");
    });

    it("Single test; no quotes", () => {
        const envString = "HELLO=World!";
        const { env, command } = parseEnvString(envString);
        expect(env).toEqual({
            HELLO: "World!",
        });
        expect(command).toEqual("");
    });

    it("Single test; single quotes", () => {
        const envString = "SINGLE_QOUTE='Single quote with spaces'";
        const { env, command } = parseEnvString(envString);
        expect(env).toEqual({
            SINGLE_QOUTE: "Single quote with spaces",
        });
        expect(command).toEqual("");
    });

    it("Single test; double quotes", () => {
        const envString = 'DOUBLE_QOUTE="Some random quote."';
        const { env, command } = parseEnvString(envString);
        expect(env).toEqual({
            DOUBLE_QOUTE: "Some random quote.",
        });
        expect(command).toEqual("");
    });

    it("Single test; empty value", () => {
        const envString = "EMPTY=";
        const { env, command } = parseEnvString(envString);
        expect(env).toEqual({
            EMPTY: "",
        });
        expect(command).toEqual("");
    });

    it("Multiple test; combined", () => {
        const envString = `HELLO=World! DOUBLE_QUOTE="Two Words" SINGLE_QUOTE='' EMPTY=`
        const { env, command } = parseEnvString(envString);
        expect(env).toEqual(expect.objectContaining({
            HELLO: "World!",
            DOUBLE_QUOTE: "Two Words",
            SINGLE_QUOTE: "",
            EMPTY: ""
        }));
        expect(command).toEqual("");
    });

    it("Key with numbers and lower case", () => {
        const envString = "H3ll0=world";
        const { env, command } = parseEnvString(envString);
        expect(env).toEqual({
            H3ll0: "world",
        });
        expect(command).toEqual("");
    });

    it("Simple command", () => {
        const { env, command } = parseEnvString("some-command");
        expect(env).toEqual({});
        expect(command).toBe("some-command");
    });

    it("Env with command", () => {
        const { env, command } = parseEnvString("SAMPLE=value some-command");
        expect(env).toEqual(expect.objectContaining({
            SAMPLE: "value"
        }));
        expect(command).toBe("some-command");
    });

    it("Complex with %command%", () => {
        const envString = "KEY=value  gamescope -h 720 -H 1440 -S integer -- %command% ";
        const { env, command } = parseEnvString(envString);
        expect(env).toEqual(expect.objectContaining({
            KEY: "value"
        }));
        expect(command).toBe("gamescope -h 720 -H 1440 -S integer -- %command%");
    })

});

describe("cleanSearchPath", () => {

    it("keeps each directory once, with or without a trailing slash", () => {
        expect(cleanSearchPath("/usr/local/share:/usr/share:/usr/share/gnome:/usr/local/share/:/usr/share/"))
            .toBe("/usr/local/share:/usr/share:/usr/share/gnome");
    });

    it("drops the AppImage's own directories and empty entries", () => {
        expect(cleanSearchPath("/tmp/.mount_BSMana1/usr/share/::/home/u/.local/share/flatpak/exports/share:/usr/share", "/tmp/.mount_BSMana1"))
            .toBe("/home/u/.local/share/flatpak/exports/share:/usr/share");
    });

    it("leaves an unset path unset", () => {
        expect(cleanSearchPath(undefined, "/tmp/.mount_x")).toBeUndefined();
    });

});
