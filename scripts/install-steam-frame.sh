#!/bin/bash
# Install (or update) BSManager for the Steam Frame / ARM64 SteamOS.
#
#   curl -fsSL https://github.com/DaVarga/bs-manager/releases/latest/download/install.sh | bash
#   curl -fsSL .../install.sh | bash -s -- --uninstall
#
# Puts the ARM64 AppImage at ~/Applications/BSManager.AppImage (a stable name, so
# BSManager's auto-updater keeps replacing the same file), adds a menu entry with
# icon, registers BSManager for the bsmanager://, beatsaver://, bsplaylist://,
# modelsaber:// and web+bsmap:// links that BeatSaver's "OneClick" buttons use, and adds
# it to Steam as a non-Steam game so it shows up in the library and in VR.
#
# Options:
#   --uninstall       remove the AppImage, menu entry and icon (BSManager's data in
#                     ~/.local/share/BSManager and ~/.config/bs-manager stays)
#   --appimage FILE   install a local AppImage instead of downloading the latest release
#   --no-steam        don't add BSManager to the Steam library
#
# Environment: BSM_REPO (default DaVarga/bs-manager).
set -euo pipefail

REPO=${BSM_REPO:-DaVarga/bs-manager}
APP_DIR=$HOME/Applications
APPIMAGE=$APP_DIR/BSManager.AppImage
DESKTOP_DIR=${XDG_DATA_HOME:-$HOME/.local/share}/applications
ICON_DIR=${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/256x256/apps
DESKTOP_FILE=$DESKTOP_DIR/bs-manager.desktop
SCHEMES=(bsmanager beatsaver bsplaylist modelsaber web+bsmap)

log() { echo "==> $*"; }
die() { echo "error: $*" >&2; exit 1; }

uninstall() {
    rm -f "$APPIMAGE" "$DESKTOP_FILE" "$ICON_DIR/bs-manager.png"
    command -v update-desktop-database >/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    log "BSManager removed (your data in ~/.local/share/BSManager is kept)"
    if grep -aqF "$APPIMAGE" "$HOME"/.local/share/Steam/userdata/*/config/shortcuts.vdf 2>/dev/null; then
        log "remove the BSManager entry from your Steam library by hand (right click → Manage → Remove)"
    fi
}

# Newest release asset *-arm64.AppImage, and SHA256SUMS if the release has one
latest_release_urls() {
    curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | python3 -c '
import json, sys
assets = json.load(sys.stdin).get("assets", [])
app = [a for a in assets if a["name"].endswith("-arm64.AppImage")]
sums = [a for a in assets if a["name"] == "SHA256SUMS"]
if not app:
    sys.exit("no ARM64 AppImage in the latest release")
print(app[0]["name"], app[0]["browser_download_url"], sums[0]["browser_download_url"] if sums else "")
'
}

download() { # -> path of the verified AppImage in $TMP
    local name url sums_url
    read -r name url sums_url < <(latest_release_urls) || die "could not read the latest release of $REPO"
    log "downloading $name"
    curl -fL --progress-bar -o "$TMP/$name" "$url"
    if [ -n "$sums_url" ]; then
        curl -fsSL -o "$TMP/SHA256SUMS" "$sums_url"
        (cd "$TMP" && grep " \*\?$name\$" SHA256SUMS | sha256sum -c --quiet -) || die "checksum mismatch for $name"
        log "checksum OK"
    fi
    DOWNLOADED=$TMP/$name
}

install_appimage() { # <AppImage>
    mkdir -p "$APP_DIR" "$DESKTOP_DIR" "$ICON_DIR"
    # Copy next to the target first: replacing a running AppImage in place is safe that way
    cp "$1" "$APPIMAGE.new"
    chmod +x "$APPIMAGE.new"
    mv -f "$APPIMAGE.new" "$APPIMAGE"
    log "installed $APPIMAGE"

    # Menu entry and icon from the AppImage itself
    (cd "$TMP" && "$APPIMAGE" --appimage-extract bs-manager.desktop >/dev/null &&
        "$APPIMAGE" --appimage-extract "usr/share/icons/hicolor/256x256/apps/bs-manager.png" >/dev/null) ||
        die "could not read the menu entry from the AppImage (is FUSE/squashfs available?)"
    cp "$TMP/squashfs-root/usr/share/icons/hicolor/256x256/apps/bs-manager.png" "$ICON_DIR/bs-manager.png"
    sed -e "s|^Exec=AppRun|Exec=\"$APPIMAGE\"|" -e "s|^TryExec=.*||" -e "s|^Icon=.*|Icon=$ICON_DIR/bs-manager.png|" \
        "$TMP/squashfs-root/bs-manager.desktop" > "$DESKTOP_FILE"
    grep -q '^Exec="' "$DESKTOP_FILE" || die "unexpected menu entry in the AppImage"

    command -v update-desktop-database >/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    if command -v xdg-mime >/dev/null; then
        for scheme in "${SCHEMES[@]}"; do
            xdg-mime default bs-manager.desktop "x-scheme-handler/$scheme"
        done
        log "registered for ${SCHEMES[*]/%/://} links"
    fi
    [ "$ADD_TO_STEAM" = 1 ] && add_to_steam
    log "done: start BSManager from the menu, or run $APPIMAGE"
}

# Non-Steam game entry (library and VR menu), through SteamOS's own "Add to Steam" helper.
# Steam reads name, command, arguments and icon from the menu entry.
add_to_steam() {
    if ! command -v steamos-add-to-steam >/dev/null || ! pgrep -x steam >/dev/null; then
        log "not added to Steam (needs SteamOS with Steam running): run steamos-add-to-steam $DESKTOP_FILE later"
        return 0
    fi
    if grep -aqF "$APPIMAGE" "$HOME"/.local/share/Steam/userdata/*/config/shortcuts.vdf 2>/dev/null; then
        log "already in the Steam library"
        return 0
    fi
    DISPLAY=${DISPLAY:-:0} steamos-add-to-steam "$DESKTOP_FILE" >/dev/null 2>&1 &&
        log "added to the Steam library (shows up in VR too)" ||
        log "could not add to Steam: run steamos-add-to-steam $DESKTOP_FILE"
}

main() {
    local local_appimage=""
    ADD_TO_STEAM=1
    while [ $# -gt 0 ]; do
        case $1 in
            --uninstall) uninstall; exit 0 ;;
            --appimage) local_appimage=$(realpath "$2"); shift 2 ;;
            --no-steam) ADD_TO_STEAM=0; shift ;;
            -h|--help) sed -n '2,19p' "$0" 2>/dev/null || true; exit 0 ;;
            *) die "unknown option $1" ;;
        esac
    done

    if [ "$(uname -m)" != aarch64 ]; then
        die "this BSManager build is for ARM64 (Steam Frame). On x86_64, e.g. the Steam Deck, use the official BSManager: https://github.com/Zagrios/bs-manager"
    fi
    for tool in curl python3 sha256sum; do
        command -v "$tool" >/dev/null || die "$tool is required"
    done

    TMP=$(mktemp -d)
    trap 'rm -rf "$TMP"' EXIT
    if [ -n "$local_appimage" ]; then
        [ -f "$local_appimage" ] || die "$local_appimage not found"
        install_appimage "$local_appimage"
    else
        download
        install_appimage "$DOWNLOADED"
    fi
}

main "$@"
