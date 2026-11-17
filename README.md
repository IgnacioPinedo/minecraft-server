# Minecraft Server (on-demand, AWS CDK)

An EC2-hosted Minecraft server that starts on request and stops itself when idle.

- `GET /start` on the API Gateway endpoint starts the EC2 instance (Lambda `start-server`).
- Every 20 minutes an EventBridge rule runs Lambda `stop-server`, which pings the server and stops the
  instance if it has been up for at least 20 minutes and no players are online.
- The server itself (Java, `server.jar`, `server.properties`, ops, systemd unit) is set up by the
  instance user data in `lib/components/ec2.ts`.

## Node.js version

The Lambdas run on `nodejs24.x` (supported by AWS Lambda until April 30, 2028). Local tooling targets
Node 24 (`.nvmrc`); Node 22+ works. To move to a newer runtime once it is generally available, change
`lambda.Runtime.NODEJS_24_X` in `lib/components/api.ts` and `lib/components/events.ts`.

## Usage

```bash
npm install
npm run build        # type-check only; Lambdas are bundled with esbuild during synth
npx cdk diff
npx cdk deploy
```

## Updating the Minecraft version

1. Find the server jar URL for the release in Mojang's
   [version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json).
2. Check the release's required Java version (`javaVersion.majorVersion`) and update the
   `java-XX-amazon-corretto-headless` package if needed.
3. Update both in `lib/components/ec2.ts`.

User data only runs on an instance's first boot. Changing it does **not** upgrade an existing
instance; the new jar is only picked up when the instance is replaced (which also replaces the world).
