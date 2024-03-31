import { EC2Client, DescribeInstancesCommand, StartInstancesCommand } from '@aws-sdk/client-ec2';

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

  if (!instance) {
    console.error('Instance not found');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Instance not found' }),
    };
  }

  console.log(`Instance state: ${instance.State?.Name}`);
  switch (instance.State?.Name) {
    case 'pending':
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Server is starting' }),
      };

    case 'running':
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Server already running at ' + instance.PublicIpAddress }),
      };

    case 'shutting-down':
    case 'terminated':
    case 'stopping':
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Server is shutting down' }),
      };

    case 'stopped':
      break;

    default:
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Unknown state' }),
      };
  }

  console.log('Starting server');

  const startInstancesCommand = new StartInstancesCommand({
    InstanceIds: [instanceId],
  });

  await ec2Client.send(startInstancesCommand);

  console.log('Server is starting');

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Server is starting' }),
  };
}
