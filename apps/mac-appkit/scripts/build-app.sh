#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
APP_ROOT="${SCRIPT_DIR:h}"
UI_ROOT="${APP_ROOT:h}/desktop-ui"
APP_DIR="$APP_ROOT/.build/app/FetchMoji AppKit.app"
CONTENTS_DIR="$APP_DIR/Contents"

pnpm --dir "$UI_ROOT" build
swift build --package-path "$APP_ROOT" -c release

rm -rf "$APP_DIR"
mkdir -p "$CONTENTS_DIR/MacOS" "$CONTENTS_DIR/Resources/desktop-ui"
cp "$APP_ROOT/.build/release/FetchMojiAppKit" "$CONTENTS_DIR/MacOS/FetchMojiAppKit"
cp "$APP_ROOT/Resources/Info.plist" "$CONTENTS_DIR/Info.plist"
cp -R "$UI_ROOT/dist/." "$CONTENTS_DIR/Resources/desktop-ui/"

codesign --force --deep --sign - "$APP_DIR"
echo "$APP_DIR"
