import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

import * as path from 'path';


export interface PresignedUrlRestApiStackProps extends StackProps {
  readonly publicKey: string;
  readonly privateKeySsmPath: string;
}

export class AwsCdkPresignedUrlRestApiStack extends Stack {
  constructor(
      scope: Construct,id:
      string,
      props: PresignedUrlRestApiStackProps
  ) {
    super(scope, id, props);

    const s3Bkt = new s3.Bucket(this, 'RandoFilesBkt');
    const pubKey = new cloudfront.PublicKey(this, 'SignedPubKey', {
      encodedKey: props.publicKey
    });
    const cfDistribution = new cloudfront.Distribution(this, 'RandoFilesDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(s3Bkt),
        trustedKeyGroups: [
          new cloudfront.KeyGroup(this, 'SignedKeyGroup', {
            items: [pubKey]
          })
        ]
      }
    });

    const api = new apigw.RestApi(this, 'RandoFilesApi', {
      description: 'REST API for Random Files in S3',
      deployOptions: {
        stageName: 'v1'
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'X-Api-Key',
          'Content-Type',
          'Authorization',
          'X-Amz-Date'
        ],
        allowOrigins: ['*'],
        allowCredentials: true,
        allowMethods: ['OPTIONS', 'GET', 'POST']
      }
    });

    const listObjsFn = new lambda.Function(this, 'ListRandoFilesFn', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambdas', 's3-objects')),
      environment: {
        BUCKET_NAME: s3Bkt.bucketName
      }
    });
    const urlSignerFn = new lambda.Function(this, 'SignUrlFn', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambdas', 'url-signer')),
      environment: {
        DISTRIBUTION_DOMAIN_NAME: cfDistribution.distributionDomainName,
        KEY_ID: pubKey.publicKeyId,
        PRIVATE_KEY_SSM_PATH: props.privateKeySsmPath
      }
    });
    urlSignerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: ['*']
    }));
    s3Bkt.grantRead(listObjsFn);

    const s3ObjectApi = api.root.addResource('s3objects');
    s3ObjectApi.addMethod('GET', new apigw.LambdaIntegration(listObjsFn));

    const urlsApi = api.root.addResource('urls');
    urlsApi.addMethod('POST', new apigw.LambdaIntegration(urlSignerFn));

    new CfnOutput(this, 'RestApiUrl', {
      value: api.url
    });
    new CfnOutput(this, 'BucketName', {
      value: s3Bkt.bucketName
    });
  }
}
