import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export function createEC2(stack: cdk.Stack, vpc: ec2.IVpc): ec2.Instance {
  const instance = new ec2.Instance(stack, 'MinecraftServerInstance', {
    instanceType: new ec2.InstanceType('t2.medium'),
    machineImage: new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
    }),
    vpc,
  });

  instance.addUserData(
    'sudo yum install -y java', // Install Java
    'sudo mkdir -p /opt/minecraft/server', // Create directory for Minecraft server
    'sudo curl -o /opt/minecraft/server/server.jar https://piston-data.mojang.com/v1/objects/450698d1863ab5180c25d7c804ef0fe6369dd1ba/server.jar', // Download Minecraft server JAR
    'sudo chown ec2-user:ec2-user /opt/minecraft/server', // Change ownership of directory to ec2-user
    'sudo tee /opt/minecraft/server/eula.txt << EOF', // Create eula.txt file
    'eula=true', // Accept Minecraft EULA
    'EOF',
    'sudo tee /opt/minecraft/server/server.properties << EOF', // Create server.properties file
    'spawn-protection=16',
    'enable-jmx-monitoring=false',
    'rcon.port=25575',
    'level-seed=',
    'gamemode=survival',
    'enable-command-block=false',
    'enable-query=false',
    'generator-settings={}',
    'enforce-secure-profile=true',
    'level-name=world',
    'motd=A Minecraft Server',
    'query.port=25565',
    'pvp=true',
    'generate-structures=true',
    'max-chained-neighbor-updates=1000000',
    'difficulty=medium',
    'network-compression-threshold=256',
    'max-tick-time=60000',
    'require-resource-pack=false',
    'use-native-transport=true',
    'max-players=20',
    'online-mode=true',
    'enable-status=true',
    'allow-flight=false',
    'initial-disabled-packs=',
    'broadcast-rcon-to-ops=true',
    'view-distance=10',
    'server-ip=',
    'resource-pack-prompt=',
    'allow-nether=true',
    'server-port=25565',
    'enable-rcon=false',
    'sync-chunk-writes=true',
    'op-permission-level=4',
    'prevent-proxy-connections=false',
    'hide-online-players=false',
    'resource-pack=',
    'entity-broadcast-range-percentage=100',
    'simulation-distance=10',
    'rcon.password=',
    'player-idle-timeout=0',
    'force-gamemode=false',
    'rate-limit=0',
    'hardcore=false',
    'white-list=false',
    'broadcast-console-to-ops=true',
    'spawn-npcs=true',
    'spawn-animals=true',
    'log-ips=true',
    'function-permission-level=2',
    'initial-enabled-packs=vanilla',
    'level-type=minecraft:normal',
    'text-filtering-config=',
    'spawn-monsters=true',
    'enforce-whitelist=false',
    'spawn-protection=16',
    'resource-pack-sha1=',
    'max-world-size=29999984',
    'EOF',
    'sudo tee /opt/minecraft/server/ops.json << EOF', // Create ops.json file
    '[{"uuid":"b0954e7e-edd9-4bb6-8eba-b7b25cd43210","name":"Igyigy97","level":4,"bypassesPlayerLimit":false}]', // Ops list
    'EOF',
    'sudo tee /opt/minecraft/server/usercache.json << EOF', // Create usercache.json file
    '[{"name":"Igyigy97","uuid":"b0954e7e-edd9-4bb6-8eba-b7b25cd43210","expiresOn":"2026-12-31 23:59:59 +0000"}]', // Usercache list
    'EOF',
    'sudo chown ec2-user:ec2-user /opt/minecraft/server/eula.txt', // Change ownership of eula.txt file to ec2-user
    'sudo chown ec2-user:ec2-user /opt/minecraft/server/server.properties', // Change ownership of server.properties file to ec2-user
    'sudo chown ec2-user:ec2-user /opt/minecraft/server/ops.json', // Change ownership of ops.json file to ec2-user
    'sudo chown ec2-user:ec2-user /opt/minecraft/server/usercache.json', // Change ownership of usercache.json file to ec2-user
    'sudo chmod 644 /opt/minecraft/server/eula.txt', // Change permissions of eula.txt file
    'sudo chmod 644 /opt/minecraft/server/server.properties', // Change permissions of server.properties file
    'sudo chmod 644 /opt/minecraft/server/ops.json', // Change permissions of ops.json file
    'sudo chmod 644 /opt/minecraft/server/usercache.json', // Change permissions of usercache.json file
    'sudo tee /etc/systemd/system/minecraft.service << EOF', // Create systemd service file
    `[Unit]`,
    `Description=Minecraft Server`,
    `After=network.target`,
    ``,
    `[Service]`,
    `User=ec2-user`,
    `WorkingDirectory=/opt/minecraft/server`,
    `ExecStart=/usr/bin/java -Xmx1024M -Xms1024M -jar server.jar nogui`,
    `Restart=always`,
    `RestartSec=5`,
    ``,
    `[Install]`,
    `WantedBy=multi-user.target`,
    `EOF`,
    'sudo systemctl daemon-reload', // Reload systemd
    'sudo systemctl enable minecraft', // Enable the Minecraft service
    'sudo systemctl start minecraft', // Start the Minecraft service
  );

  instance.connections.allowFromAnyIpv4(ec2.Port.tcp(25565));
  instance.connections.allowFromAnyIpv4(ec2.Port.tcp(22));

  return instance;
}
