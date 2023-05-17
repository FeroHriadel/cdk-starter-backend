import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult, Context } from 'aws-lambda';

const dbClient = new DynamoDB.DocumentClient();



async function queryWithPrimaryPartition(queryParams: APIGatewayProxyEventQueryStringParameters) {
    const keyValue = queryParams[process.env.PRIMARY_KEY!];
    const queryResponse = await dbClient.query({
        TableName: process.env.TABLE_NAME!,
        KeyConditionExpression: '#itemId = :itemId',
        ExpressionAttributeNames: {'#itemId': process.env.PRIMARY_KEY!},
        ExpressionAttributeValues: {':itemId': keyValue}
    }).promise();
    return JSON.stringify(queryResponse.Items);
}



async function queryWithSecondaryPartition(queryParams: APIGatewayProxyEventQueryStringParameters) {
    const queryKey = Object.keys(queryParams)[0];
    const queryValue = queryParams[queryKey];
    const queryResponse = await dbClient.query({
        TableName: process.env.TABLE_NAME!,
        IndexName: queryKey,
        KeyConditionExpression: '#key = :key',
        ExpressionAttributeNames: {'#key': queryKey},
        ExpressionAttributeValues: {':key': queryValue}
    }).promise();
    return JSON.stringify(queryResponse.Items);
}



async function scanTable() {
    const queryResponse = await dbClient.scan({
        TableName: process.env.TABLE_NAME!,
    }).promise();
    return JSON.stringify(queryResponse.Items);
}



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    const result: APIGatewayProxyResult = {statusCode: 200, body: 'No body yet'};

    try {
        //if call with query (e.g.: https://abc/getitems?itemId=1234)
        if (event.queryStringParameters) {
            if (process.env.PRIMARY_KEY! in event.queryStringParameters) result.body = await queryWithPrimaryPartition(event.queryStringParameters);
            else result.body = await queryWithSecondaryPartition(event.queryStringParameters);
        }
        //if no query in call
        else result.body = await scanTable();
        
    } catch (error) {
        if (error instanceof Error) {result.body = error.message; result.statusCode = 500}
    }

    return result;
}



export { handler };