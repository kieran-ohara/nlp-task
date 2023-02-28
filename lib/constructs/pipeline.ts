import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as pipeline from "aws-cdk-lib/aws-codepipeline"
import * as pipelineactions from "aws-cdk-lib/aws-codepipeline-actions"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions"

import { INPUT_FILENAME } from '../lambda/train-input';

import * as path from 'path'

interface PipelineInterface {
  artifactBucket: s3.IBucket;
  trainingStateMachine: stepfunctions.IStateMachine;
}

export class Pipeline extends Construct {
  constructor(scope: Construct, id: string, props: PipelineInterface) {
    super(scope, id);
    const {region, account} = cdk.Stack.of(this)

    const { artifactBucket, trainingStateMachine } = props;

    const sourceArtifact = new pipeline.Artifact('SourceArtifact');
    const trainInputArtifact = new pipeline.Artifact('TrainInputArtifact')

    const trainInputLambda = new lambda.Function(this, 'TrainInputFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'train-input.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')),
    })

    const p = new pipeline.Pipeline(this, 'Pipeline', {
      crossAccountKeys: false,
      artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new pipelineactions.CodeStarConnectionsSourceAction({
              actionName: 'Source',
              owner: 'kieran-ohara',
              repo: 'nlp-task',
              branch: 'pipeline',
              output: sourceArtifact,
              connectionArn: `arn:aws:codestar-connections:${region}:${account}:connection/53b21b84-d465-441f-8607-1912ff2c6825`,
            })
          ]
        },
        {
          stageName: 'Train',
          actions: [
            new pipelineactions.LambdaInvokeAction({
              actionName: 'TrainInput',
              inputs: [sourceArtifact],
              outputs: [trainInputArtifact],
              lambda: trainInputLambda,
              runOrder: 1
            }),
            new pipelineactions.StepFunctionInvokeAction({
              actionName: 'Train',
              stateMachine: trainingStateMachine,
              stateMachineInput: pipelineactions.StateMachineInput.filePath(
                trainInputArtifact.atPath(INPUT_FILENAME),
              ),
              runOrder: 2
            })
          ]
        }
      ]
    });

    trainInputLambda.grantInvoke(p.role);
  }
}
