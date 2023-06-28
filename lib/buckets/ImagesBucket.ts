import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Effect, Policy, PolicyStatement, AnyPrincipal } from "aws-cdk-lib/aws-iam";
import { BucketPolicy, ObjectOwnership } from "aws-cdk-lib/aws-s3";




export class imagesBucket {

    public bucket: Bucket;
    private bucketPolicy: BucketPolicy;
    private stack: Stack;

    constructor(stack: Stack) {
        this.stack = stack;
        this.initialize();
    }

    private initialize() {
        this.createBucket();
        // this.createBucketPolicy();
    }

    private createBucket() {
        this.bucket = new Bucket(this.stack, 'cdk-starter-images-bucket', {
            bucketName: 'cdk-starter-images-bucket-fero', //bucket name cannot have upper case characters
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED, //enables ACLs (else image upload from website fails)
            //blockPublicAccess: {blockPublicAcls: false, ignorePublicAcls: false, blockPublicPolicy: false, restrictPublicBuckets: false}, //enables adding bucket policy from cdk
            cors: [{
              allowedMethods: [
                  HttpMethods.HEAD,
                  HttpMethods.GET,
                  HttpMethods.PUT,
                  HttpMethods.POST,
                  HttpMethods.DELETE,
              ],
              allowedOrigins: ['*'],
              allowedHeaders: ['*']
            }],
            removalPolicy: RemovalPolicy.DESTROY
          });
    }

    // private createBucketPolicy() {
    //     this.bucketPolicy = new BucketPolicy(this.stack, 'cdk-starter-bucket-policy', {bucket: this.bucket});
    //     this.bucketPolicy.document.addStatements(
    //         new PolicyStatement({
    //             resources: [this.bucket.bucketArn + '/*'],
    //             actions: [
    //                 's3:GetObject',
    //                 's3:PutObject',
    //                 's3:PutObjectAcl',
    //                 's3:DeleteObject'
    //             ],
    //             effect: Effect.ALLOW,
    //             principals: [new AnyPrincipal()]
    //         })
    //     )
    // }

}