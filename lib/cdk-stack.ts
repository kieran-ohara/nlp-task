import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as s3 from "aws-cdk-lib/aws-s3"
import * as sfn from "aws-cdk-lib/aws-stepfunctions"
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks"

import { Pipeline } from "./constructs/pipeline";

import * as path from 'path'

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "bucket");

    const trainJob = new tasks.SageMakerCreateTrainingJob(this, 'Train', {
      trainingJobName: sfn.JsonPath.stringAt('$.JobName'),
      algorithmSpecification: {
        trainingImage: tasks.DockerImage.fromAsset(this, 'Image', {
          directory: path.join(__dirname, '../'),
          file: 'Dockerfile.train',
        })
      },
      inputDataConfig: [{
        channelName: 'training',
        compressionType: tasks.CompressionType.NONE,
        dataSource: {
          s3DataSource: {
            s3DataType: tasks.S3DataType.S3_PREFIX,
            s3Location: tasks.S3Location.fromJsonExpression('$.S3Bucket')
          }
        },
      }],
      outputDataConfig: {
        s3OutputLocation: tasks.S3Location.fromBucket(bucket, 'output')
      },
      resourceConfig: {
        instanceType: new cdk.aws_ec2.InstanceType('m5.large'),
        instanceCount: 1,
        volumeSize: cdk.Size.gibibytes(50)
      }
    })
    const definition = trainJob;

    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definition
    })

    bucket.grantReadWrite(stateMachine)

    new Pipeline(this, 'Pipeline', {
      artifactBucket: bucket
    })
  }
}
