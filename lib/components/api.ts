import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export function createAPI(stack: cdk.Stack, instance: ec2.Instance) {
  const startServerHandler = new lambda.Function(stack, 'StartServerHandler', {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'start-server.handler',
    code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas')),
    environment: {
      INSTANCE_ID: instance.instanceId,
    },
    timeout: cdk.Duration.seconds(30),
  });

  startServerHandler.addToRolePolicy(new iam.PolicyStatement({
    actions: [
      'ec2:DescribeInstances',
      'ec2:StartInstances',
    ],
    resources: ['*'],
  }));

  const api = new apigateway.RestApi(stack, 'MinecraftServerApi', {
    restApiName: 'Minecraft Server API',
    description: 'This API helps manage a Minecraft server',
  });

  const start = api.root.addResource('start');

  start.addMethod('GET', new apigateway.LambdaIntegration(startServerHandler));

  return api;
}
