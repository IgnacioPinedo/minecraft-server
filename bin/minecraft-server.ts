#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MinecraftServerStack } from '../lib/minecraft-server-stack';

const app = new cdk.App();
new MinecraftServerStack(app, 'MinecraftServerStack', {
  env: {
    account: '730866911057',
    region: 'us-east-2',
  },
});
