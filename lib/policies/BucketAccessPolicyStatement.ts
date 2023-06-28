import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";




export class BucketAccessPolicyStatement {
    public policyStatement: PolicyStatement;
    private bucket: Bucket;

    constructor(bucket: Bucket) {
        this.bucket = bucket;
        this.initialize();
    } 

    private initialize() {
        this.createPolicyStatement();
    }

    private createPolicyStatement() {
        this.policyStatement = new PolicyStatement({
            actions: ['s3:*'],
            resources: ['arn:aws:s3:::*'], //this should be `this.bucket` actually, not all buckets...
        });
    }
}