import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

const dynamodb = new DynamoDB.DocumentClient();




//gets event.eventType.detail and saves it into tagsTable
async function handler(event: any, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        //get event.eventType.detail
        console.log('eventBridgeSubscriberLambda hit');
        console.log('Event is: ', event);
        if (!event.detail?.name) {result.statusCode = 400; throw new Error('Name is required')};

        //save payload.name to tagsTable
        console.log('Creating tag...')
        const tagId = v4();
        const now = new Date();
        const tag = {
            tagId: tagId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            name: event.detail.name,
            type: '#TAG' 
        };
        
        console.log('Saving tags with params: ', {TableName: process.env.TABLE_NAME!, Item: tag});
        const savedTag = await dynamodb.put({TableName: process.env.TABLE_NAME!, Item: tag}).promise();
        if (!savedTag) throw new Error('Tag failed to save');
        result.body = JSON.stringify(tag);
        result.statusCode = 201;
        console.log('Tag created successfully: ', result);
        
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode !== 500 ? result.statusCode : 500; 
            result.body = JSON.stringify({error: error.message});
        }
    }

    return result;
}



export { handler };

