import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { join } from "path";



export class GetSignedUrlLambda {

    private stack: Stack;
    private bucket: Bucket
    public lambda: NodejsFunction;
    public lambdaIntegration: LambdaIntegration;

    public constructor(stack: Stack, bucket: Bucket) {
        this.stack = stack;
        this.bucket = bucket;
        this.initialize();
    }

    private initialize() {
        this.createLambda();
        this.createLambdaIntegration();
    }

    private createLambda() {
        this.lambda = new NodejsFunction(this.stack, 'GetSignedUrlLambda', {
            entry: (join(__dirname, '..', '..', 'src', 'getSignedUrl.ts')),
            handler: 'handler',
            functionName: 'GetSignedUrlLambda',
            environment: {
                BUCKET_NAME: this.bucket.bucketName
            }
        })
    }

    private createLambdaIntegration() {
        this.lambdaIntegration = new LambdaIntegration(this.lambda);
    }
}