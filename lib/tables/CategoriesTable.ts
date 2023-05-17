import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";



export class CategoriesTable {

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
        this.table = new Table(this.stack, 'CategoriesTable', {
            tableName: 'CategoriesTable',
            partitionKey: { name: 'categoryId', type: AttributeType.STRING },
            removalPolicy: RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST,
          });
    }

    private addSecondaryIndexes() {
        this.table.addGlobalSecondaryIndex({ //so we can search categories by name
            indexName: 'name',
            partitionKey: { name: 'name', type: AttributeType.STRING }
        });
        this.table.addGlobalSecondaryIndex({ //this will be a composite key (with PK and SK)
            indexName: 'nameSort', //so we can order by name
            partitionKey: { name: 'type', type: AttributeType.STRING },
            sortKey: { name: 'name', type: AttributeType.STRING }
        }); //all categories have `type: #CATEGORY`. When making a query, you must specify equality condition. But you want all the categories! So your condition will be: `:category = '#CATEGORY` (which all categories have) and it will return all categories ordered by name (`ScanIndexForward: true` in query will do that)
    }

}