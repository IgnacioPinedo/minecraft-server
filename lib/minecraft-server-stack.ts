import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createVpc } from './components/vpc';
import { createEC2 } from './components/ec2';
import { createEIP } from './components/eip';

export class MinecraftServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = createVpc(this);
    const instance = createEC2(this, vpc);
    createEIP(this, instance);
  }
}
