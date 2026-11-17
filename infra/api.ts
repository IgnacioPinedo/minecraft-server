import { instance } from "./server";

export const api = new sst.aws.ApiGatewayV2("MinecraftServerApi");

api.route("GET /start", {
  handler: "functions/start-server.handler",
  runtime: "nodejs24.x",
  timeout: "30 seconds",
  environment: { INSTANCE_ID: instance.id },
  permissions: [
    { actions: ["ec2:DescribeInstances"], resources: ["*"] },
    { actions: ["ec2:StartInstances"], resources: [instance.arn] },
  ],
});

new sst.aws.CronV2("StopServer", {
  schedule: "rate(20 minutes)",
  function: {
    handler: "functions/stop-server.handler",
    runtime: "nodejs24.x",
    timeout: "60 seconds", // up to 3 pings x 5s + retries
    environment: { INSTANCE_ID: instance.id },
    permissions: [
      { actions: ["ec2:DescribeInstances"], resources: ["*"] },
      { actions: ["ec2:StopInstances"], resources: [instance.arn] },
    ],
  },
});
