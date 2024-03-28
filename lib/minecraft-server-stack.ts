import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class MinecraftServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'MinecraftServerVPC', {
      isDefault: true,
    });

    const instance = new ec2.Instance(this, 'MinecraftServerInstance', {
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'MinecraftServerKeyPair', 'minecraft-server-key'),
      instanceType: new ec2.InstanceType('t2.medium'),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      vpc,
    });

    instance.addUserData(
      'sudo su',
      'yum install -y java',
      'if [ ! -d /opt/minecraft/ ]; then',
      '  mkdir /opt/minecraft/',
      'fi',
      'if [ ! -d /opt/minecraft/server/ ]; then',
      '  mkdir /opt/minecraft/server/',
      'fi',
      'cd /opt/minecraft/server/',
      'if [ ! -f server.jar ]; then',
      '  curl -o server.jar https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar',
      'fi',
      'if [ ! -f eula.txt ]; then',
      '  echo "eula=true" > eula.txt',
      'fi',
      'if [ ! -f server.properties ]; then',
      '  echo "spawn-protection=16" >> server.properties',
      '  echo "enable-jmx-monitoring=false" >> server.properties',
      '  echo "rcon.port=25575" >> server.properties',
      '  echo "level-seed=" >> server.properties',
      '  echo "gamemode=survival" >> server.properties',
      '  echo "enable-command-block=false" >> server.properties',
      '  echo "enable-query=false" >> server.properties',
      '  echo "generator-settings={}" >> server.properties',
      '  echo "enforce-secure-profile=true" >> server.properties',
      '  echo "level-name=world" >> server.properties',
      '  echo "motd=A Minecraft Server" >> server.properties',
      '  echo "query.port=25565" >> server.properties',
      '  echo "pvp=true" >> server.properties',
      '  echo "generate-structures=true" >> server.properties',
      '  echo "max-chained-neighbor-updates=1000000" >> server.properties',
      '  echo "difficulty=medium" >> server.properties',
      '  echo "network-compression-threshold=256" >> server.properties',
      '  echo "max-tick-time=60000" >> server.properties',
      '  echo "require-resource-pack=false" >> server.properties',
      '  echo "use-native-transport=true" >> server.properties',
      '  echo "max-players=20" >> server.properties',
      '  echo "online-mode=true" >> server.properties',
      '  echo "enable-status=true" >> server.properties',
      '  echo "allow-flight=false" >> server.properties',
      '  echo "initial-disabled-packs=" >> server.properties',
      '  echo "broadcast-rcon-to-ops=true" >> server.properties',
      '  echo "view-distance=10" >> server.properties',
      '  echo "server-ip=" >> server.properties',
      '  echo "resource-pack-prompt=" >> server.properties',
      '  echo "allow-nether=true" >> server.properties',
      '  echo "server-port=25565" >> server.properties',
      '  echo "enable-rcon=false" >> server.properties',
      '  echo "sync-chunk-writes=true" >> server.properties',
      '  echo "op-permission-level=4" >> server.properties',
      '  echo "prevent-proxy-connections=false" >> server.properties',
      '  echo "hide-online-players=false" >> server.properties',
      '  echo "resource-pack=" >> server.properties',
      '  echo "entity-broadcast-range-percentage=100" >> server.properties',
      '  echo "simulation-distance=10" >> server.properties',
      '  echo "rcon.password=" >> server.properties',
      '  echo "player-idle-timeout=0" >> server.properties',
      '  echo "force-gamemode=false" >> server.properties',
      '  echo "rate-limit=0" >> server.properties',
      '  echo "hardcore=false" >> server.properties',
      '  echo "white-list=false" >> server.properties',
      '  echo "broadcast-console-to-ops=true" >> server.properties',
      '  echo "spawn-npcs=true" >> server.properties',
      '  echo "spawn-animals=true" >> server.properties',
      '  echo "log-ips=true" >> server.properties',
      '  echo "function-permission-level=2" >> server.properties',
      '  echo "initial-enabled-packs=vanilla" >> server.properties',
      '  echo "level-type=minecraft:normal" >> server.properties',
      '  echo "text-filtering-config=" >> server.properties',
      '  echo "spawn-monsters=true" >> server.properties',
      '  echo "enforce-whitelist=false" >> server.properties',
      '  echo "spawn-protection=16" >> server.properties',
      '  echo "resource-pack-sha1=" >> server.properties',
      '  echo "max-world-size=29999984" >> server.properties',
      'fi',
      'java -Xmx1024M -Xms1024M -jar server.jar nogui',
    );

    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(25565));
    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(22));

    const eip = new ec2.CfnEIP(this, 'MinecraftServerEIP', {
      domain: 'vpc',
    });

    new ec2.CfnEIPAssociation(this, 'MinecraftServerEIPAssociation', {
      allocationId: eip.attrAllocationId,
      instanceId: instance.instanceId,
    });
  }
}
