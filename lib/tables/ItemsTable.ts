import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";



export class ItemsTable {

    private stack: Stack;
    public table: Table;

    public constructor(stack: Stack) {
        this.stack = stack;
        this.initialize();
    }

    private initialize() {
        this.createTable();
        this.addSecondaryIndexes();
    }

    private createTable() {
        this.table = new Table(this.stack, 'ItemsTable', {
            tableName: 'ItemsTable',
            partitionKey: { name: 'itemId', type: AttributeType.STRING },
            removalPolicy: RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST,
          });
    }

    private addSecondaryIndexes() {
        this.table.addGlobalSecondaryIndex({
            indexName: 'category',
            partitionKey: { name: 'category', type: AttributeType.STRING }
          });
        this.table.addGlobalSecondaryIndex({
            indexName: 'name',
            partitionKey: { name: 'name', type: AttributeType.STRING }
          });
    }

}