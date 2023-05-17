import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult, Context } from 'aws-lambda';

const dynamodb = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 200, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        let tags;
        const response = await dynamodb.query({ 
            TableName: process.env.TABLE_NAME!,
            IndexName: 'nameSort',
            KeyConditionExpression: '#type = :type',
            ExpressionAttributeNames: {'#type': 'type'},
            ExpressionAttributeValues: {':type': '#TAG'}, //all tags have type = '#TAG', so it will return all tags
            ScanIndexForward: true, //this tells dynamo to order asc (by sortIndex, which is `name` in this case)
        }).promise();
        tags = response.Items;
        result.body = JSON.stringify(tags);
        
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {result.statusCode = 500; result.body = JSON.stringify({error: error.message});}
    }

    return result;
}



export { handler };