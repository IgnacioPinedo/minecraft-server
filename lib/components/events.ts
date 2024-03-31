import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export function createEvents(stack: cdk.Stack, instance: ec2.Instance, eip: ec2.CfnEIP): void {
  const stopServerHandler = new lambda.Function(stack, 'StopServerHandler', {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'stop-server.handler',
    code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas')),
    environment: {
      INSTANCE_ID: instance.instanceId,
      SERVER_IP: eip.attrPublicIp,
    },
    timeout: cdk.Duration.seconds(30),
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