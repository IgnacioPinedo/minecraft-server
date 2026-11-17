/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "minecraft-server",
      home: "aws",
      removal: "remove",
      protect: input?.stage === "production",
      providers: {
        aws: { region: "us-east-2" },
      },
    };
  },
  async run() {
    const { instance } = await import("./infra/server");
    const { api } = await import("./infra/api");

    return {
      startUrl: $interpolate`${api.url}/start`,
      instanceId: instance.id,
    };
  },
});
