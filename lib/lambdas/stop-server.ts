import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import { MinecraftServer } from 'mcping-js';

const PING_ATTEMPTS = 3;
const PING_TIMEOUT_MS = 5000;
const PING_RETRY_DELAY_MS = 2000;

function ping(serverIP: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    new MinecraftServer(serverIP).ping(PING_TIMEOUT_MS, -1, (err, res) => {
      if (err) {
        console.error(err);
        resolve(undefined);
      } else {
        console.log(res);
        resolve(res?.players?.online || 0);
      }
    });
  });
}

// Returns the number of players online, or undefined if the server never answered.
async function getPlayersOnline(serverIP: string): Promise<number | undefined> {
  if (!serverIP) {
    return undefined;
  }

  for (let attempt = 1; attempt <= PING_ATTEMPTS; attempt++) {
    const players = await ping(serverIP);
    if (players !== undefined) {
      return players;
    }
    console.log(`Ping attempt ${attempt}/${PING_ATTEMPTS} failed`);
    if (attempt < PING_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, PING_RETRY_DELAY_MS));
    }
  }

  return undefined;
}

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

  const instance = describeInstancesResponse.Reservations?.[0]?.Instances?.[0];

  if (instance?.State?.Name === 'running') {
    console.log('Server is running');

    const launchTime = instance.LaunchTime || new Date();

    const currentTime = new Date();

    const diff = currentTime.getTime() - launchTime.getTime();

    const minutes = Math.floor(diff / 60000);

    console.log(`Server has been running for ${minutes} minutes`);
    if (minutes < 20) {
      console.log('Server has been running for less than 20 minutes. Ignoring request');
      return;
    }

    const serverIP = instance.PublicIpAddress || '';

    const playersOnline = await getPlayersOnline(serverIP);

    if (playersOnline === undefined) {
      // The instance has been up long enough to finish booting, so an unreachable
      // Minecraft server means it crashed or never started. Stop the instance
      // rather than leaving it running (and billing) forever.
      console.log(`Server did not answer after ${PING_ATTEMPTS} attempts`);
    } else {
      console.log(`Players online: ${playersOnline}`);
    }

    if (!playersOnline) {
      console.log('Stopping server');
      const stopInstancesCommand = new StopInstancesCommand({
        InstanceIds: [instanceId],
      });

      await ec2Client.send(stopInstancesCommand);
      console.log('Server stopped');
    }
  }
}
