import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { join } from "path";



export class DeleteItemImagesLambda {

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
        this.lambda = new NodejsFunction(this.stack, 'DeleteItemImagesLambda', {
            entry: (join(__dirname, '..', '..', '..', 'src', 'items', 'DeleteItemImages.ts')),
            handler: 'handler',
            functionName: 'DeleteItemImagesLambda',
            environment: {
                BUCKET_NAME: this.bucket.bucketName,
                EVENT_BUS_SOURCE: 'cdk.starter.delete.item.images',
                EVENT_BUS_DETAIL_TYPE: 'DeleteItemImages',
                EVENT_BUS_NAME: 'DeleteItemImagesEventBus'
            }
        })
    }

    private createLambdaIntegration() {
        this.lambdaIntegration = new LambdaIntegration(this.lambda);
    }
}