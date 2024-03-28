import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export function createVpc(stack: cdk.Stack): ec2.IVpc {
  return ec2.Vpc.fromLookup(stack, 'MinecraftServerVPC', {
    isDefault: true,
  });
}