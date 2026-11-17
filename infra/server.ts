import { readFileSync } from "fs";

const vpc = aws.ec2.getVpcOutput({ default: true });

const securityGroup = new aws.ec2.SecurityGroup("MinecraftServerSecurityGroup", {
  description: "Minecraft server",
  vpcId: vpc.id,
  ingress: [
    { description: "Minecraft", protocol: "tcp", fromPort: 25565, toPort: 25565, cidrBlocks: ["0.0.0.0/0"] },
    { description: "SSH / EC2 Instance Connect", protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  ],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const ami = aws.ssm.getParameterOutput({
  name: "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
});

// cloud-init normally runs user data only on an instance's first boot. Wrapping the script in
// a MIME document with `scripts-user always` makes it run on every boot, so a deploy that
// changes user-data.sh (stop, update user data, start) applies it to the existing instance
// and keeps the world.
// https://repost.aws/knowledge-center/execute-user-data-ec2
const userData = [
  'Content-Type: multipart/mixed; boundary="==MINECRAFT=="',
  "MIME-Version: 1.0",
  "",
  "--==MINECRAFT==",
  'Content-Type: text/cloud-config; charset="us-ascii"',
  "",
  "#cloud-config",
  "cloud_final_modules:",
  "  - [scripts-user, always]",
  "",
  "--==MINECRAFT==",
  'Content-Type: text/x-shellscript; charset="us-ascii"',
  "",
  readFileSync("infra/user-data.sh", "utf8"),
  "--==MINECRAFT==--",
  "",
].join("\n");

export const instance = new aws.ec2.Instance(
  "MinecraftServer",
  {
    ami: ami.value,
    instanceType: "t2.medium",
    vpcSecurityGroupIds: [securityGroup.id],
    userData,
    metadataOptions: { httpTokens: "required" },
    tags: { Name: `${$app.name}-${$app.stage}` },
  },
  {
    // The AMI is resolved to the latest AL2023 image on every deploy. Ignore drift so a
    // deploy never replaces the instance (and wipes the world).
    ignoreChanges: ["ami"],
  },
);
