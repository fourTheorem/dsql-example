#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DsqlExampleStack } from '../stacks/dsql-example-stack';
import { ApplicationStack } from '../stacks/application-stack';

const app = new cdk.App();
new DsqlExampleStack(app, 'DsqlExampleStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
new ApplicationStack(app, 'ApplicationStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
