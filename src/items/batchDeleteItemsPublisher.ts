import { EventBridge } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const eventBridgeClient = new EventBridge();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran - this is only a placeholder'})
    };

    try {
        //check if admin
        console.log('Lambda started running...');
        const isAdmin = event.requestContext.authorizer?.claims['cognito:groups'] === 'admins';
        console.log('is user admin: ', isAdmin);
        if (!isAdmin) { result.statusCode = 401; throw new Error('Only admins can create tags'); }

        //get categoryId
        console.log('Getting categoryId...');
        console.log(event);
        const categoryId = event.queryStringParameters?.categoryId;
        console.log(categoryId)
        if (!categoryId) { result.statusCode = 400; throw new Error('categoryId is required') };

        //put to eventBus
        console.log('putting events...');
        const params = {
            Entries: [
                {
                    Source: 'cdk.starter.batch.delete.items',
                    DetailType: 'BatchDeleteItems',
                    Detail: JSON.stringify({categoryId}),
                    Resources: [],
                    EventBusName: 'BatchDeleteItemsEventBus'
                }
            ]
        };
        console.log('put params: ', params);
        const data = await eventBridgeClient.putEvents(params).promise();
        console.log('event put: ', data);
        if (data.FailedEntryCount && data.FailedEntryCount > 0) throw new Error('EventBus Entry failed');
        result.statusCode = 200;
        result.body = JSON.stringify({message: 'Processing...', ok: true});


    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode === 500 ? 500 : result.statusCode; 
            result.body = JSON.stringify({error: error.message});
        }
    }

    console.log(result)
    return result
}



export { handler };

