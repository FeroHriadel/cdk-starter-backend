import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";



export class TagsTable {

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
        this.table = new Table(this.stack, 'TagsTable', {
            tableName: 'TagsTable',
            partitionKey: { name: 'tagId', type: AttributeType.STRING },
            removalPolicy: RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST,
          });
    }

    private addSecondaryIndexes() {
        this.table.addGlobalSecondaryIndex({
            indexName: 'name', //so we can search tags by name
            partitionKey: { name: 'name', type: AttributeType.STRING }
        });
        this.table.addGlobalSecondaryIndex({ //this will be a composite key (with PK and SK)
            indexName: 'nameSort', //so we can order by name
            partitionKey: { name: 'type', type: AttributeType.STRING },
            sortKey: { name: 'name', type: AttributeType.STRING }
        }); //all tags have `type: #TAG`. When making a query, you must specify equality condition. But you want all the tags! So your condition will be: `:tag = '#TAG` (which all tags have) and it will return all tags ordered by name (`ScanIndexForward: true` in query will do that)
    }

}