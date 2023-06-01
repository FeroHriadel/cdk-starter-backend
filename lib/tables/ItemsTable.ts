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
        //so we can order items by name
        this.table.addGlobalSecondaryIndex({ //this will be a composite key (with PK and SK)
            indexName: 'nameSort',
            partitionKey: { name: 'type', type: AttributeType.STRING },
            sortKey: { name: 'name', type: AttributeType.STRING }
        }); //all items have `type: #ITEM`. When making a query, you must specify equality condition. But you want all the items! So your condition will be: `:item = '#ITEM` (which all items have) and it will return all items ordered by name (`ScanIndexForward: true` in query will do that)
        
        //so we can order by updatedAt
        this.table.addGlobalSecondaryIndex({ //this will be a composite key (with PK and SK)
            indexName: 'dateSort',
            partitionKey: { name: 'type', type: AttributeType.STRING },
            sortKey: { name: 'updatedAt', type: AttributeType.STRING }
        });

        //so we can search items by category and order by name
        this.table.addGlobalSecondaryIndex({ //this will be a composite key (with PK and SK)
            indexName: 'categorySort',
            partitionKey: { name: 'category', type: AttributeType.STRING },
            sortKey: { name: 'name', type: AttributeType.STRING }
        });
    }

}