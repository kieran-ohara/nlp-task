import * as lambda from "aws-lambda"
import * as codepipeline from "@aws-sdk/client-codepipeline"
import * as s3 from "@aws-sdk/client-s3"

import jszip = require('jszip')

const ToS3 = (artifact: lambda.Artifact) => ({
  Bucket: artifact.location.s3Location.bucketName,
  Key: artifact.location.s3Location.objectKey,
})

export const handler = async (event: lambda.CodePipelineEvent): Promise<any> => {
  try {
    const {AWS_REGION} = process.env;
    const {
      "CodePipeline.job": {
        id: jobId,
        data: {
          inputArtifacts,
          outputArtifacts,
          artifactCredentials: credentials
        }
      }
    } = event;

    const sourceArtifact = inputArtifacts[0];
    const outputArtifact = outputArtifacts[0];

    const {Bucket, Key} = ToS3(sourceArtifact)
    const zip = new jszip()
    zip.file(
      'state-machine-input.json',
      JSON.stringify({
        S3Bucket: `s3://${Bucket}/${Key}`,
        JobName: jobId
      })
    )

    const body = await zip.generateAsync<'uint8array'>({ type: 'uint8array'});

    const s3Client = new s3.S3Client({credentials, region: AWS_REGION })
    await s3Client.send(new s3.PutObjectCommand({
      Body: body,
      ...ToS3(outputArtifact),
    }))

    const codePipelineClient = new codepipeline.CodePipelineClient({ region: AWS_REGION})
    await codePipelineClient.send(new codepipeline.PutJobSuccessResultCommand({
      jobId,
    }))
  }
  catch (err) {
    throw err
  }
}
