import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

const dbClient = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {statusCode: 201, body: 'Body not created yet'};

    try {
        if (!event.body) throw new Error('No body included');
        const createdItem = JSON.parse(event.body);
        createdItem.itemId = v4();
        await dbClient.put({TableName: process.env.TABLE_NAME!, Item: createdItem}).promise();
        result.body = JSON.stringify(createdItem);
        
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {result.statusCode = 500; result.body = error.message;}
    }

    return result;
}



export { handler };

