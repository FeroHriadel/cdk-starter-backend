import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { existsSync } from "fs";
import { join } from "path";




export class UiDeployment {

    private stack: Stack;
    private deploymentBucket: Bucket;


    constructor(stack: Stack) {
        this.stack = stack;
        this.initialize();
    }



    private initialize() {
        this.createDeploymentBucket();
        this.deployUI();
    }

    private createDeploymentBucket() {
        //create a bucket where frontend/dist will go
        this.deploymentBucket = new Bucket(this.stack, 'cdk-starter-deployment-bucket', {
            bucketName: 'cdk-starter-deployment-bucket',
            removalPolicy: RemovalPolicy.DESTROY
        })
    }

    private deployUI() {
        //find frontend/dist folder
        const uiDir = join(__dirname, '..', '..', '..', 'cdkstarterfrontend', 'build');
        if (!existsSync(uiDir)) {
            new CfnOutput(this.stack, 'UI url: ', {
                value: 'Path to frontend/build not found'
            });
            return
        }

        //put frontend/dist to the bucket 
        new BucketDeployment(this.stack, 'CdkStarterUiBucketDeployment', {
            destinationBucket: this.deploymentBucket,
            sources: [Source.asset(uiDir)]
        });

        //grant access to the bucket
        const originIdentity = new OriginAccessIdentity(this.stack, 'CdkStarterOriginAccessIdentity'); //when attached, enables access
        this.deploymentBucket.grantRead(originIdentity);

        //create distribution from the bucket
        const distribution = new Distribution(this.stack, 'CdkStarterDistribution', {
            defaultRootObject: 'index.html', //open this bucket file
            defaultBehavior: {
                origin: new S3Origin(this.deploymentBucket, {
                    originAccessIdentity: originIdentity
                })
            },
            errorResponses: [ //this is here because if u go to a category page the url will be: myapp.net/categories/:categoryId...
                { //...which will work but will stop working if you refresh the page at that url. This code redirects 404s to index.html which will handle the situation correctly
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html'
                }
            ]
        }); //by the way, frontend/.env file worked fine...

        //print the url of the deployed frontend
        new CfnOutput(this.stack, 'UI url: ', {
            value: distribution.distributionDomainName
        });

    }



    
}