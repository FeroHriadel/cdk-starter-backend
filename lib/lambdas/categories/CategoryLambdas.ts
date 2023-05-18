import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { join } from "path";



interface LambdasPaths { createPath: string; readPath: string; updatePath: string; deletePath: string; };





export class CategoryLambdas {

    private stack: Stack;
    private table: Table;
    private bucket: Bucket;
    private lambdasPaths: LambdasPaths;

    public createLambda: NodejsFunction;
    public readLambda: NodejsFunction;
    public updateLambda: NodejsFunction;
    public deleteLambda: NodejsFunction;

    public createLambdaIntegration: LambdaIntegration;
    public readLambdaIntegration: LambdaIntegration;
    public updateLambdaIntegration: LambdaIntegration;
    public deleteLambdaIntegration: LambdaIntegration;



    constructor(stack: Stack, table: Table, bucket: Bucket, lambdaPaths: LambdasPaths) {
        this.stack = stack;
        this.table = table;
        this.bucket = bucket;
        this.lambdasPaths = lambdaPaths;
        this.initialize();
    }



    private initialize() {
        this.createLambdas();
        this.grantTableRights();
    }

    private createSingleLambda(handlerPath: string) {
        const lambdaId = `${handlerPath}CategoryLambda`;
        return new NodejsFunction(this.stack, lambdaId, {
            entry: (join(__dirname, '..', '..', '..', 'src', 'categories', `${handlerPath}.ts`)),
            handler: 'handler',
            functionName: lambdaId,
            environment: {
                TABLE_NAME: this.table.tableName,
                PRIMARY_KEY: 'categoryId',
                BUCKET_NAME: this.bucket.bucketName
            }
        })
    }

    private createLambdas() {
        //create category lambda
        this.createLambda = this.createSingleLambda(this.lambdasPaths.createPath);
        this.createLambdaIntegration = new LambdaIntegration(this.createLambda);
        //category read lambda
        this.readLambda = this.createSingleLambda(this.lambdasPaths.readPath);
        this.readLambdaIntegration = new LambdaIntegration(this.readLambda);
        //update category lambda
        this.updateLambda = this.createSingleLambda(this.lambdasPaths.updatePath);
        this.updateLambdaIntegration = new LambdaIntegration(this.updateLambda);
        //delete category lambda
        this.deleteLambda = this.createSingleLambda(this.lambdasPaths.deletePath);
        this.deleteLambdaIntegration = new LambdaIntegration(this.deleteLambda);
    }

    private grantTableRights() {
        this.table.grantReadWriteData(this.createLambda);
        this.table.grantReadData(this.readLambda);
        this.table.grantReadWriteData(this.updateLambda);
        this.table.grantReadWriteData(this.deleteLambda);
    }

}