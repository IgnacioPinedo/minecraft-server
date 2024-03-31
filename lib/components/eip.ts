import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export function createEIP(stack: cdk.Stack, instance: ec2.Instance): ec2.CfnEIP {
  const eip = new ec2.CfnEIP(stack, 'MinecraftServerEIP', {
    domain: 'vpc',
  });

  new ec2.CfnEIPAssociation(stack, 'MinecraftServerEIPAssociation', {
    allocationId: eip.attrAllocationId,
    instanceId: instance.instanceId,
  });

  return eip;
}