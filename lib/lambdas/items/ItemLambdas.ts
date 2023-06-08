import { Stack } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { join } from "path";



interface LambdasPaths { createPath: string; readPath: string; updatePath: string; deletePath: string; };





export class ItemLambdas {

    private stack: Stack;
    private table: Table;
    private categoriesTable: Table;
    private tagsTable: Table;
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



    constructor(stack: Stack, table: Table, categoriesTable: Table, tagsTable: Table, bucket: Bucket, lambdaPaths: LambdasPaths) {
        this.stack = stack;
        this.table = table;
        this.categoriesTable = categoriesTable;
        this.tagsTable = tagsTable;
        this.bucket = bucket;
        this.lambdasPaths = lambdaPaths;
        this.initialize();
    }



    private initialize() {
        this.createLambdas();
        this.grantTableRights();
    }

    private createSingleLambda(handlerPath: string) {
        const lambdaId = `${handlerPath}ItemLambda`;
        return new NodejsFunction(this.stack, lambdaId, {
            entry: (join(__dirname, '..', '..', '..', 'src', 'items', `${handlerPath}.ts`)),
            handler: 'handler',
            functionName: lambdaId,
            environment: {
                TABLE_NAME: this.table.tableName,
                PRIMARY_KEY: 'itemId',
                BUCKET_NAME: this.bucket.bucketName,
                CATEGORIES_TABLE: this.categoriesTable.tableName,
                TAGS_TABLE: this.tagsTable.tableName
            }
        })
    }

    private createLambdas() {
        //create item lambda
        this.createLambda = this.createSingleLambda(this.lambdasPaths.createPath);
        this.createLambdaIntegration = new LambdaIntegration(this.createLambda);
        //items read lambda
        this.readLambda = this.createSingleLambda(this.lambdasPaths.readPath);
        this.readLambdaIntegration = new LambdaIntegration(this.readLambda);
        //update item lambda
        this.updateLambda = this.createSingleLambda(this.lambdasPaths.updatePath);
        this.updateLambdaIntegration = new LambdaIntegration(this.updateLambda);
        //delete item lambda
        this.deleteLambda = this.createSingleLambda(this.lambdasPaths.deletePath);
        this.deleteLambdaIntegration = new LambdaIntegration(this.deleteLambda);
    }

    private grantTableRights() {
        this.table.grantReadWriteData(this.createLambda); this.categoriesTable.grantReadData(this.createLambda); this.tagsTable.grantReadData(this.createLambda);
        this.table.grantReadData(this.readLambda); this.categoriesTable.grantReadData(this.readLambda); this.tagsTable.grantReadData(this.readLambda);
        this.table.grantReadWriteData(this.updateLambda); this.categoriesTable.grantReadData(this.updateLambda); this.tagsTable.grantReadData(this.updateLambda);
        this.table.grantReadWriteData(this.deleteLambda);
    }

}