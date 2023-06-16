import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";



export class EventBridgeSubscriberLambda {

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
        this.lambda = new NodejsFunction(this.stack, 'EventBridgeSubscriberLambda', {
            entry: (join(__dirname, '..', '..', '..', 'src', 'testing', 'eventBridgeSubscriber.ts')),
            handler: 'handler',
            functionName: 'EventBridgeSubscriberLambda',
            environment: {
                TABLE_NAME: 'TagsTable',
                PRIMARY_KEY: 'tagId'
            }
        })
    }

    private createLambdaIntegration() {
        this.lambdaIntegration = new LambdaIntegration(this.lambda);
    }
}