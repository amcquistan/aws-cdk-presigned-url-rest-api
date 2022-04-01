#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  AwsCdkPresignedUrlRestApiStack
} from '../lib/aws-cdk-presigned-url-rest-api-stack';

const app = new cdk.App();
new AwsCdkPresignedUrlRestApiStack(app, 'AwsCdkPresignedUrlRestApiStack', {
  privateKeySsmPath: '/tci/demos/cloudfront/signedurls/privatekey',
  pubicKey: process.env.PUBLIC_KEY!
});