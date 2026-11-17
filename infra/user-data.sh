#!/bin/bash
# EC2 user data: installs, updates and starts the Minecraft server.
#
# Runs as root on EVERY boot (cloud-init `scripts-user always`, see infra/server.ts), so it
# must stay idempotent. Deploying a change to this file stops the instance, swaps the user
# data and starts it again: the world on disk is kept and the new settings are applied.
set -euxo pipefail

# --- Minecraft version -------------------------------------------------------------------
# Find releases in https://piston-meta.mojang.com/mc/game/version_manifest_v2.json.
# Each release's JSON has downloads.server.{url,sha1} and javaVersion.majorVersion.
MINECRAFT_VERSION="26.3"
SERVER_JAR_URL="https://piston-data.mojang.com/v1/objects/33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c/server.jar"
SERVER_JAR_SHA1="33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c"
JAVA_PACKAGE="java-25-amazon-corretto-headless"
# ------------------------------------------------------------------------------------------

SERVER_DIR="${SERVER_DIR:-/opt/minecraft/server}"
BACKUP_DIR="${BACKUP_DIR:-/opt/minecraft/backups}"
BACKUPS_TO_KEEP=3
SERVICE_FILE="${SERVICE_FILE:-/etc/systemd/system/minecraft.service}"

# Make sure the server isn't running while its files change.
systemctl stop minecraft 2>/dev/null || true

dnf install -y "$JAVA_PACKAGE"
JAVA_BIN="$(rpm -ql "$JAVA_PACKAGE" | grep -m1 '/bin/java$')"

mkdir -p "$SERVER_DIR" "$BACKUP_DIR"

current_sha1=""
if [ -f "$SERVER_DIR/server.jar" ]; then
  current_sha1="$(sha1sum "$SERVER_DIR/server.jar" | cut -d' ' -f1)"
fi

if [ "$current_sha1" != "$SERVER_JAR_SHA1" ]; then
  # Worlds can't be downgraded, so back up the world before a new server version touches it.
  if [ -d "$SERVER_DIR/world" ]; then
    previous_version="$(cat "$SERVER_DIR/.version" 2>/dev/null || echo unknown)"
    tar -czf "$BACKUP_DIR/world-$previous_version-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" -C "$SERVER_DIR" world
    ls -1t "$BACKUP_DIR"/world-*.tar.gz | tail -n +$((BACKUPS_TO_KEEP + 1)) | xargs -r rm -f
  fi

  curl -fsSL -o "$SERVER_DIR/server.jar.download" "$SERVER_JAR_URL"
  echo "$SERVER_JAR_SHA1  $SERVER_DIR/server.jar.download" | sha1sum -c -
  mv "$SERVER_DIR/server.jar.download" "$SERVER_DIR/server.jar"
  echo "$MINECRAFT_VERSION" > "$SERVER_DIR/.version"
fi

# Config is rewritten on every boot, so this file is the source of truth for it.
echo "eula=true" > "$SERVER_DIR/eula.txt"

cat > "$SERVER_DIR/server.properties" <<'PROPERTIES'
spawn-protection=16
enable-jmx-monitoring=false
rcon.port=25575
level-seed=
gamemode=survival
enable-command-block=false
enable-query=false
generator-settings={}
enforce-secure-profile=true
level-name=world
motd=A Minecraft Server
query.port=25565
pvp=true
generate-structures=true
max-chained-neighbor-updates=1000000
difficulty=medium
network-compression-threshold=256
max-tick-time=60000
require-resource-pack=false
use-native-transport=true
max-players=20
online-mode=true
enable-status=true
allow-flight=false
initial-disabled-packs=
broadcast-rcon-to-ops=true
view-distance=10
server-ip=
resource-pack-prompt=
allow-nether=true
server-port=25565
enable-rcon=false
sync-chunk-writes=true
op-permission-level=4
prevent-proxy-connections=false
hide-online-players=false
resource-pack=
entity-broadcast-range-percentage=100
simulation-distance=10
rcon.password=
player-idle-timeout=0
force-gamemode=false
rate-limit=0
hardcore=false
white-list=false
broadcast-console-to-ops=true
spawn-npcs=true
spawn-animals=true
log-ips=true
function-permission-level=2
initial-enabled-packs=vanilla
level-type=minecraft:normal
text-filtering-config=
spawn-monsters=true
enforce-whitelist=false
spawn-protection=16
resource-pack-sha1=
max-world-size=29999984
PROPERTIES

cat > "$SERVER_DIR/ops.json" <<'JSON'
[{"uuid":"b0954e7e-edd9-4bb6-8eba-b7b25cd43210","name":"Igyigy97","level":4,"bypassesPlayerLimit":false},{"uuid":"80207481-a762-4066-bd76-8f50c3f21f1c","name":"bonirafa","level":2,"bypassesPlayerLimit":false}]
JSON

cat > "$SERVER_DIR/usercache.json" <<'JSON'
[{"name":"Igyigy97","uuid":"b0954e7e-edd9-4bb6-8eba-b7b25cd43210","expiresOn":"2026-12-31 23:59:59 +0000"},{"name":"bonirafa","uuid":"80207481-a762-4066-bd76-8f50c3f21f1c","expiresOn":"2026-12-31 23:59:59 +0000"}]
JSON

chown -R ec2-user:ec2-user "$SERVER_DIR"
chmod 644 "$SERVER_DIR"/{eula.txt,server.properties,ops.json,usercache.json}

# The service is started by this script rather than enabled at boot, so it never runs an
# old jar while an update is still in progress.
cat > "$SERVICE_FILE" <<UNIT
[Unit]
Description=Minecraft Server
After=network.target

[Service]
User=ec2-user
WorkingDirectory=$SERVER_DIR
ExecStart=$JAVA_BIN -Xmx1024M -Xms1024M -jar server.jar nogui
Restart=always
RestartSec=5
UNIT

systemctl daemon-reload
systemctl start minecraft
