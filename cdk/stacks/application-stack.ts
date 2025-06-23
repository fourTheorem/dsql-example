import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { exportParameters } from '../lib/exports';

const apiRootDir = path.resolve(__dirname, "..", "..", "packages", "api");

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "TRACE"];
type HttpMethodType = typeof HTTP_METHODS[number];


export class ApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbEndpoint = ssm.StringParameter.fromStringParameterName(this, "DbEndpointParam", "/dsql-example/endpoint").stringValue;
    const dbClusterId = ssm.StringParameter.fromStringParameterName(this, "DbClusterId", "/dsql-example/cluster-id").stringValue;

    const apiFunction = new lambdaNodejs.NodejsFunction(this, "ApiFunction", {
      entry: path.join(apiRootDir, "api-handler.ts"),
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      handler: "handleEvent",
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        DB_ENDPOINT: dbEndpoint,
      },
      bundling: {
        format: lambdaNodejs.OutputFormat.CJS,
        sourceMap: true,
      }
    });

    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dsql:DbConnectAdmin"],
      resources: [`arn:${this.partition}:dsql:${this.region}:${this.account}:cluster/${dbClusterId}`]
    }));

    const api = new apigateway.RestApi(this, "RestApi", {
      restApiName: "dsql-example-api",
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: HTTP_METHODS,
      },
      deployOptions: {
        tracingEnabled: true,
      },
    });

    const apiIntegration = new apigateway.LambdaIntegration(apiFunction, {
      allowTestInvoke: false,
    });

    const paths = ["lists", "{list_id}", "items", "{item_id}"] as const;

    const pathMethods: Record<typeof paths[number], HttpMethodType[]> = {
      lists: ["GET", "POST"],
      "{list_id}": ["GET", "PUT", "PATCH", "DELETE"],
      items: ["GET", "POST"],
      "{item_id}": ["GET", "PUT", "PATCH", "DELETE"],
    }

    let parentResource = api.root;
    parentResource.addMethod("GET", apiIntegration);

    for (const [path, methods] of Object.entries(pathMethods)) {
      const pathResource = parentResource.addResource(path, { defaultIntegration: apiIntegration })
      for (const method of methods) {
        pathResource.addMethod(method);
      }
      parentResource = pathResource;
    }

    api.root.addResource("openapi.json").addMethod("GET", apiIntegration);

    exportParameters(this, {
      restApiId: api.restApiId,
      apiEndpoint: `https://${api.restApiId}.execute-api.${this.region}.${this.urlSuffix}/${api.deploymentStage.stageName}`
    });
  }
}
