import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { Construct } from "constructs";

type Exports = {
  [name: string]: string
};

export function exportParameters(scope: Construct, exports: Exports) {
  for (const [name, value] of Object.entries(exports)) {
    new ssm.StringParameter(scope, `${name}-param`, {
      parameterName: `/dsql-example/${name}`,
      stringValue: value,
    });
    new cdk.CfnOutput(scope, `${name}-export`, {
      exportName: name,
      key: name.replace(/\W/g, ''),
      value,
    })
  }
}

