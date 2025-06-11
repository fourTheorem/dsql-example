import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { exportParameters } from '../lib/exports';

const apiRootDir = path.resolve(__dirname, "..", "..", "packages", "api");

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export class ApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbEndpoint = ssm.StringParameter.fromStringParameterName(this, "DbEndpointParam", "/dsql-example/endpoint").stringValue;

    const apiFunction = new lambdaNodejs.NodejsFunction(this, "ApiFunction", {
      entry: path.join(apiRootDir, "api-handler.ts"),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handleEvent",
      environment: {
        DB_ENDPOINT: dbEndpoint,
      }
    });

    const api = new apigateway.RestApi(this, "RestApi", {
      restApiName: "dsql-example-api",
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: HTTP_METHODS,
      }
    });
    const apiIntegration = new apigateway.LambdaIntegration(apiFunction);

    const itemsResource = api.root.addResource("items");
    for (const method of HTTP_METHODS) {
      api.root.addMethod(method, apiIntegration);
      itemsResource.addMethod(method, apiIntegration);
    }

    exportParameters(this, {
      restApiId: api.restApiId,
      apiEndpoint: `https://${api.restApiId}.execute-api.${this.region}.${this.urlSuffix}/${api.deploymentStage.stageName}`
    });
  }
}
