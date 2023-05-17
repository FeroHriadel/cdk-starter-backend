import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";



export class UpdateTagLambda {

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
        this.lambda = new NodejsFunction(this.stack, 'UpdateTagLambda', {
            entry: (join(__dirname, '..', '..', '..', 'src', 'tags', 'updateTag.ts')),
            handler: 'handler',
            functionName: 'UpdateTagLambda',
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