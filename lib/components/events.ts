import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

// export function createEvents(stack: cdk.Stack, instance: ec2.Instance, eip: ec2.CfnEIP): void {
export function createEvents(stack: cdk.Stack, instance: ec2.Instance): void {
  const stopServerHandler = new nodejs.NodejsFunction(stack, 'StopServerHandler', {
    runtime: lambda.Runtime.NODEJS_24_X,
    entry: path.join(__dirname, '../lambdas/stop-server.ts'),
    handler: 'handler',
    environment: {
      INSTANCE_ID: instance.instanceId,
      // SERVER_IP: eip.attrPublicIp,
    },
    timeout: cdk.Duration.seconds(60), // up to 3 pings x 5s + retries
  });

  stopServerHandler.addToRolePolicy(new iam.PolicyStatement({
    actions: [
      'ec2:DescribeInstances',
      'ec2:StopInstances',
    ],
    resources: ['*'],
  }));


  const rule = new events.Rule(stack, 'StopServerRule', {
    schedule: events.Schedule.rate(cdk.Duration.minutes(20)),
  });

  rule.addTarget(new targets.LambdaFunction(stopServerHandler));
}