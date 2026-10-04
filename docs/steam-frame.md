# How to install BSManager on the Steam Frame

This fork runs on the Steam Frame (ARM64 SteamOS). Installing it takes one command:

```sh
curl -fsSL https://github.com/DaVarga/bs-manager/releases/latest/download/install.sh | bash
```

It installs BSManager to `~/Applications/BSManager.AppImage`, adds it to the app menu (a `.desktop`
entry with icon), and lets BeatSaver's **OneClick** buttons open it.

There are two ways to run the command. On the Frame itself you type with the on-screen keyboard.
From a PC over SSH you can use a real keyboard, or just paste.

## Before you start

- Beat Saber in your Steam library.
- **Proton 11.0 (ARM64)** and **Steam Linux Runtime 4.0 for arm64** installed. Steam installs both
  the first time you start a Windows game; otherwise install them from the library (**Tools**).

## Option A: on the Frame, with the on-screen keyboard

1. In VR, open the dashboard and click **+** in the bar at the bottom. A **Launch program** list
   opens. Choose **Konsole** (the terminal).

   ![Launch program list with BSManager and Konsole](images/steam-frame/vr-launch-program.webp)

2. Click the **keyboard icon** under the Konsole window to open the on-screen keyboard.
3. Type the command above exactly and press Enter. Watch out for:
   - `-fsSL`: capital `S` and `L`
   - `|`: the pipe character before `bash`
   - no spaces inside the address

   If the command is open in a browser on the Frame, copy it there and use Konsole's **Paste**
   button (top right) instead of typing it.
4. When it prints `done`, close Konsole. **BSManager** is now in the same **Launch program** list.

   ![BSManager in VR: keyboard icon under the window, + in the dashboard bar](images/steam-frame/vr-bsmanager.webp)

## Option B: from your PC over SSH

Set this up once on the Frame:

1. **Settings → System → Enable Developer Mode.**
2. In the developer settings, set a **password** for the `steamos` user. SSH is then available.

Then on your PC, open **PowerShell** (Windows 10/11 ships `ssh`) or a terminal (Linux, macOS) and
connect:

```sh
ssh steamos@frame
```

Depending on your network, the Frame is reachable as `frame`, `frame.lan` or `frame.local`. If
none of them works, use its IP address from your router, for example `ssh steamos@192.168.1.56`.

Answer `yes` to the fingerprint question the first time and enter the password. Then run the
install command:

```sh
curl -fsSL https://github.com/DaVarga/bs-manager/releases/latest/download/install.sh | bash
```

When it prints `done`, BSManager is in the Frame's **Launch program** list (see Option A, step 4).

## First start

1. BSManager asks for your **Proton folder**. Choose
   `/home/steamos/.local/share/Steam/steamapps/common/Proton 11.0 (ARM64)`.
2. Sign in with Steam and download or select a Beat Saber version the native ARM64 build supports:
   **1.40.9 through 1.44.1** (see bs-arm64's
   [Game versions](https://github.com/DaVarga/bs-arm64#game-versions)).
3. **Launch** the version once and wait until the menu appears, then quit. The first start takes a
   while. It creates BSManager's Wine prefix, which mods and the native ARM64 build need.

## Native ARM64 Beat Saber

BSManager runs the x64 version of Beat Saber through emulation. For the versions the matching
bs-arm64 release was tested with (1.40.9 through 1.44.1) it can install a native ARM64 build instead,
which needs less than half the CPU time per frame. The ARM64 tab shows that list for other versions.

1. Select the Beat Saber version in BSManager (launched once, see [First start](#first-start)). To
   keep the x64 version too, work on a copy: gear menu at the top right → **Clone**.

   ![Version menu with Clone](images/steam-frame/bsm-clone.webp)

2. Open the **ARM64** tab next to Mods and click **Install**. Keep **Mod support (BSIPA)** checked to
   use mods. It's only available with a BSIPA version the release was tested with; BeatMods has no
   mods for 1.40.9–1.40.13, so those install without mods.

   ![ARM64 tab before installing](images/steam-frame/bsm-arm64-tab.webp)

3. When the log ends with `done`, the version is native. Launch it as usual. **Reinstall** after a
   Proton update, and **Uninstall** puts the x64 files back.

If the install stops with `Wine prefix … does not exist`, Beat Saber was never launched from
BSManager. That failed install leaves the version half changed, so it won't start either. Launch
another, unchanged version once (see [First start](#first-start)), then click **Install** again on
this one; it finishes the install.

   ![ARM64 tab after installing](images/steam-frame/bsm-arm64-installed.webp)

Tip: turn off **Adaptive SFX** (Solo → song selection → **Player Settings** tab next to the song
list). On ARM64 its loudness measurement is expensive and makes frame times less steady.

Tip: turn off **Screen Distortion** in the game's graphics settings. It costs a lot of GPU time on the
Frame, and bs-arm64 v0.1.6 shows frozen ghost images with it on.

Details: [bs-arm64](https://github.com/DaVarga/bs-arm64).

## Foveated rendering

Open Beat Saber in your **Steam** library → ⚙ → **Properties** → **Performance** and turn on
**Foveated Rendering**. BSManager reads that switch and starts every version, x64 and native ARM64,
with SteamVR's eye-tracked foveated rendering, as Steam does: the area you look at is rendered at full
resolution and the edges at lower resolution, which saves GPU time and battery.

Steam's default is mild. For stronger foveation, add `FDM_DEBUG=enable,med %command%` or
`FDM_DEBUG=enable,hi %command%` as launch command in the version's **Launch** tab.

Since BSManager **v1.6.0-frame.4** no launch command is needed. If you added
`DISABLE_VULKAN_FDM_INJECTION_LAYER=1 %command%` as an earlier version of this guide said, remove it:
it keeps foveated rendering off. Older versions still need it, or the game hangs at startup.

## Update or remove

- **Update:** run the install command again. BSManager marks itself as **outdated** in its title bar
  when a new version is out, but it can't update itself yet.
- **Remove:**
  ```sh
  curl -fsSL https://github.com/DaVarga/bs-manager/releases/latest/download/install.sh | bash -s -- --uninstall
  ```
  Your versions, maps and settings in `~/.local/share/BSManager` stay.
