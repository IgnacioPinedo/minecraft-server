# Minecraft Server (on-demand, SST)

An EC2-hosted Minecraft server that starts on request and stops itself when idle, deployed with
[SST](https://sst.dev) v4.

- `GET /start` on the API starts the EC2 instance (`functions/start-server.ts`) and reports its IP.
- Every 20 minutes an EventBridge Scheduler job runs `functions/stop-server.ts`. Once the instance has
  been up for at least 20 minutes, it stops it if no players are online or the server doesn't answer
  3 pings.
- The server itself (Java, `server.jar`, `server.properties`, ops, systemd unit) is installed and kept
  up to date by `infra/user-data.sh`, which runs on **every boot** of the instance.

## Layout

| Path                  | What                                                       |
| --------------------- | ---------------------------------------------------------- |
| `sst.config.ts`       | SST app (region `us-east-2`) and outputs                   |
| `infra/server.ts`     | Security group and EC2 instance (default VPC)              |
| `infra/api.ts`        | `GET /start` API route and the stop cron job               |
| `infra/user-data.sh`  | Per-boot setup script: Java, Minecraft, config, systemd    |
| `functions/`          | Lambda handlers                                            |

## Usage

Log in to AWS first (`aws sso login --profile <profile>`, then `export AWS_PROFILE=<profile>`).

```bash
npm install
npm run build     # type-check
npm run diff      # preview changes to the production stage
npm run deploy    # deploy the production stage
```

The deploy prints `startUrl`. Open it to start the server; once it is running the response includes
its IP. The IP changes every time the instance starts (there is no Elastic IP).

The `production` stage is protected: `sst remove --stage production` refuses to run until you remove
`protect` in `sst.config.ts`.

## Updating the Minecraft version (keeps the world)

1. Find the release in Mojang's
   [version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json) and open its
   JSON. You need `downloads.server.url`, `downloads.server.sha1` and `javaVersion.majorVersion`.
2. Update `MINECRAFT_VERSION`, `SERVER_JAR_URL`, `SERVER_JAR_SHA1` (and `JAVA_PACKAGE` if the Java
   version changed) at the top of `infra/user-data.sh`.
3. `npm run deploy`.

The deploy stops the instance and updates its user data; the new version is applied on the next
boot (if the deploy leaves the instance running, the idle check stops it again later). On boot the
script:

- backs up the world to `/opt/minecraft/backups/world-<old version>-<timestamp>.tar.gz` (the last 3
  are kept), because a world can't be opened by an older server version once upgraded;
- downloads the new jar and verifies its SHA-1 (a mismatch aborts the boot script and the server
  isn't started, leaving the old jar in place);
- rewrites the config files and starts the server, which upgrades the world on first load.

Changing anything else in `infra/user-data.sh` (`server.properties`, ops) is applied the same way.
Config is rewritten on every boot, so changes made on the server (for example `/op` in game) are
overwritten by the next boot; make them in the script instead.

To roll back, SSH in (EC2 Instance Connect), stop the service, restore a backup over
`/opt/minecraft/server/world`, and deploy the previous version.

The instance is never replaced by a deploy: newer Amazon Linux AMIs are ignored
(`ignoreChanges: ["ami"]`). Deleting it (or `sst remove`) still deletes the world.

## Node.js version

The Lambdas run on `nodejs24.x` (supported by AWS Lambda until April 30, 2028). Local tooling targets
Node 24 (`.nvmrc`); Node 22+ works. To move to a newer runtime once it is generally available, change
`runtime` in `infra/api.ts`.
