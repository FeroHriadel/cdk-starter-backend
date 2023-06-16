import { DynamoDB, EventBridge } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

const dynamodb = new DynamoDB.DocumentClient();
const eventBridgeClient = new EventBridge();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        //check body
        console.log('eventBridgeSenderLambda hit');
        console.log('checking body...');
        if (!event.body) throw new Error('No body included');
        const body = JSON.parse(event.body);
        console.log('body is: ', body);

        //publish to event bus
          //source: 'cdk.starter.eventbridgesender'
          //detailType: 'EventBridgeSender'
          //eventBusName: 'CdkStarterEventBus'
        console.log('putting events...');
        const params = {
            Entries: [
                {
                    Source: 'cdk.starter.eventbridgesender',
                    DetailType: 'EventBridgeSender',
                    Detail: event.body,
                    Resources: [],
                    EventBusName: 'CdkStarterEventBus'
                }
            ]
        };
        const data = await eventBridgeClient.putEvents(params).promise();
        console.log('event put: ', data);
        result.statusCode = 200;
        result.body = JSON.stringify({message: 'eventBridgeSenderLambda finished', ok: true});
        
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

