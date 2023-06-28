import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Effect, Policy, PolicyStatement, AnyPrincipal } from "aws-cdk-lib/aws-iam";
import { join } from "path";



export class GetS3ObjectLambda {

    private stack: Stack;
    private bucket: Bucket;
    private bucketAccessPolicyStatement: PolicyStatement;
    public lambda: NodejsFunction;
    public lambdaIntegration: LambdaIntegration;

    public constructor(stack: Stack, bucket: Bucket, bucketAccessPolicyStatement: PolicyStatement) {
        this.stack = stack;
        this.bucket = bucket;
        this.bucketAccessPolicyStatement = bucketAccessPolicyStatement;
        this.initialize();
    }

    private initialize() {
        this.createLambda();
        this.addRole();
        this.createLambdaIntegration();
    }

    private createLambda() {
        this.lambda = new NodejsFunction(this.stack, 'GetS3ObjectLambda', {
            entry: (join(__dirname, '..', '..', 'src', 'getS3Object.ts')),
            handler: 'handler',
            functionName: 'GetS3ObjectLambda',
            environment: {
                BUCKET_NAME: this.bucket.bucketName
            },
        })
    }

    
    private addRole() {
        this.lambda.role?.attachInlinePolicy(
            new Policy(this.stack, 'GetS3ObjectBucketAccess', {
                statements: [this.bucketAccessPolicyStatement],
              }
            )
        );
    }

    

    private createLambdaIntegration() {
        this.lambdaIntegration = new LambdaIntegration(this.lambda);
    }
}