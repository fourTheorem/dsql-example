import * as cdk from "aws-cdk-lib";
import * as dsql from "aws-cdk-lib/aws-dsql";
import type { Construct } from "constructs";
import { exportParameters } from "../lib/exports";

export class DsqlExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cluster = new dsql.CfnCluster(this, "DsqlExampleCluster", {
      deletionProtectionEnabled: false,
      tags: [
        {
          key: "Name",
          value: "ft-dsql-example",
        },
      ],
    });

    exportParameters(this, {
      "vpc-endpoint-service-name": cluster.attrVpcEndpointServiceName,
      endpoint: `${cluster.ref}.dsql.${this.region}.on.aws`,
      "cluster-id": cluster.ref,
    });
  }
}
