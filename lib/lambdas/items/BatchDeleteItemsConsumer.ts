import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { join } from "path";



export class BatchDeleteItemsConsumerLambda {

    private stack: Stack;
    private bucket: Bucket;
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
        this.lambda = new NodejsFunction(this.stack, 'BatchDeleteItemsConsumerLambda', {
            entry: (join(__dirname, '..', '..', '..', 'src', 'items', 'batchDeleteItemsConsumer.ts')),
            handler: 'handler',
            functionName: 'BatchDeleteItemsConsumerLambda',
            environment: {
                TABLE_NAME: 'ItemsTable',
                BUCKET_NAME: this.bucket.bucketName
            }
        })
    }

    private createLambdaIntegration() {
        this.lambdaIntegration = new LambdaIntegration(this.lambda);
    }
}