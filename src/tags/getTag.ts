import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult, Context } from 'aws-lambda';

const dynamodb = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        console.log('Getting tag by id...')
        const tagId  = event.pathParameters?.tagId;
        console.log('tagId is: ', tagId);

        let tag;
        const res = await dynamodb.get({TableName: process.env.TABLE_NAME!, Key: {tagId}}).promise();
        tag = res.Item;
        console.log(`DB search result is: `, tag);

        if (!tag) { result.statusCode = 404; throw new Error('Tag not found') };
        result.statusCode = 200;
        result.body = JSON.stringify(tag);

        
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.body = JSON.stringify({error: error.message});
        }
    }

    return result;
}



export { handler };