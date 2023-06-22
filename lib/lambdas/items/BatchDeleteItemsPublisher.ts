import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";



export class BatchDeleteItemsPublisherLambda {

    private stack: Stack;
    public lambda: NodejsFunction;
    public lambdaIntegration: LambdaIntegration;

    public constructor(stack: Stack) {
        this.stack = stack;
        this.initialize();
    }

    private initialize() {
        this.createLambda();
        this.createLambdaIntegration();
    }

    private createLambda() {
        this.lambda = new NodejsFunction(this.stack, 'BatchDeleteItemsPublisherLambda', {
            entry: (join(__dirname, '..', '..', '..', 'src', 'items', 'batchDeleteItemsPublisher.ts')),
            handler: 'handler',
            functionName: 'BatchDeleteItemsPublisherLambda',
            environment: {
                TABLE_NAME: 'ItemsTable',
            }
        })
    }

    private createLambdaIntegration() {
        this.lambdaIntegration = new LambdaIntegration(this.lambda);
    }
}