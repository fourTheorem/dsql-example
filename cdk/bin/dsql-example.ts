#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApplicationStack } from "../stacks/application-stack";
import { DsqlExampleStack } from "../stacks/dsql-example-stack";

const app = new cdk.App();
new DsqlExampleStack(app, "DsqlExampleStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new ApplicationStack(app, "ApplicationStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
