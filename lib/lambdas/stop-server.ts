import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import { MinecraftServer } from 'mcping-js';

export async function handler(): Promise<any> {
  console.log('Checking server status');
  const instanceId = process.env.INSTANCE_ID || '';

  const ec2Client = new EC2Client({
    region: 'us-east-2',
  });

  const describeInstancesCommand = new DescribeInstancesCommand({
    InstanceIds: [instanceId],
  });

  const describeInstancesResponse = await ec2Client.send(describeInstancesCommand);

  const instance = describeInstancesResponse.Reservations?.[0].Instances?.[0];

  if (instance?.State?.Name === 'running') {
    console.log('Server is running');
    const serverIP = instance.PublicIpAddress || '';

    const server = new MinecraftServer(serverIP);

    const promise = new Promise<number>((resolve, reject) => {
      server.ping(10000, -1, (err, res) => {
        if (err) {
          console.error(err);
          resolve(-1);
        } else {
          console.log(res);
          resolve(res?.players?.online || 0);
        }
      });
    });

    const playersOnline = await promise;
    console.log(`Players online: ${playersOnline}`);

    if (playersOnline === 0) {
      console.log('Stopping server');
      const stopInstancesCommand = new StopInstancesCommand({
        InstanceIds: [instanceId],
      });

      await ec2Client.send(stopInstancesCommand);
      console.log('Server stopped');
    }
  }
}
