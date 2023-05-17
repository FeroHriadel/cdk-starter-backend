import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';

const dbClient = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    
    const result: APIGatewayProxyResult = {statusCode: 200, body: 'No body yet'};

    try {
        if (!event.pathParameters) throw new Error('No id in pathParameters included');
        const itemId = event.pathParameters.itemId

        if (itemId) {
            const deleteResult = await dbClient.delete({
                TableName: process.env.TABLE_NAME!,
                Key: {[process.env.PRIMARY_KEY!]: itemId}
            }).promise();
            result.body = JSON.stringify(deleteResult); //wil return {} if successful
        }

    } catch (error) {
        if (error instanceof Error) {result.body = error.message; result.statusCode = 500}
    }

    return result;
}



export { handler };