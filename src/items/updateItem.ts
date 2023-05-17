import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult, Context } from 'aws-lambda';

const dbClient = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    const result: APIGatewayProxyResult = {statusCode: 200, body: 'No body yet'};

    try {
        if (!event.body) throw new Error('No body included');
        if (!event.pathParameters) throw new Error('No itemId in pathParameters included'); //get params (`/path/{id}`) like this
        const requestBody = JSON.parse(event.body);
        const itemId = event.pathParameters.itemId;
        const requestBodyKey = Object.keys(requestBody)[0]; //only updates one attr ===> the first in req.body
        const requestBodyValue = requestBody[requestBodyKey];

        const updateResult = await dbClient.update({
            TableName: process.env.TABLE_NAME!,
            Key: {[process.env.PRIMARY_KEY!]: itemId },
            UpdateExpression: 'set #new = :new',
            ExpressionAttributeValues: {':new': requestBodyValue},
            ExpressionAttributeNames: {'#new': requestBodyKey},
            ReturnValues: 'UPDATED_NEW'
        }).promise();

        result.body = JSON.stringify(updateResult);
        
    } catch (error) {
        if (error instanceof Error) {result.body = error.message; result.statusCode = 500}
    }

    return result;
}



export { handler };