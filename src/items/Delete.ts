import { DynamoDB, EventBridge } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const dynamodb = new DynamoDB.DocumentClient();
const eventBridgeClient = new EventBridge();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran - this is only a placeholder'})
    };

    try {
        //check user is owner or admin
        console.log('Delete item lambda started to run...');
        console.log('Checking user...')
        const userDetails = event.requestContext.authorizer;
        console.log('user details: ', userDetails);
        const username = userDetails?.claims['cognito:username'];
        const isAdmin = userDetails?.claims['cognito:groups'] === 'admins';
        
        //check item
        const itemId = event.queryStringParameters?.itemId;
        console.log('itemId from queryStringParametrs: ', itemId);
        if (!itemId) { result.statusCode = 400; throw new Error('itemId is required') };
        let item;
        let checkItem = await dynamodb.get({ TableName: process.env.TABLE_NAME!, Key: {itemId} }).promise();
        console.log('Got: ', checkItem);
        item = checkItem.Item;
        if (!item?.itemId) { result.statusCode = 404; throw new Error(`Item not found`) }

        //only owner or admin can delete
        if (isAdmin || username === item.createdBy) {
            await dynamodb.delete({ TableName: process.env.TABLE_NAME!, Key: {itemId} }).promise();

            //send item images to EventBridge to be deleted
            let images: {[key: string]: string} = {}; //cannot be an array => eventBridge doesn't accept arrays, but it does accept objects ¯\_(ツ)_/¯
            if (item.mainImage && item.mainImage !== '') images.image0 = (item.mainImage.split('.com/')[1]);
            if (item.images && item.images.length > 0) {
                (item.images as string[]).forEach((img, idx) => {
                    images[`image${idx+1}`] = img.split('.com/')[1];
                })
            }
            
            //send images to eventBus for deletion:
            if (Object.keys(images).length > 0) {
                const params = {
                    Entries: [
                        {
                            Source: 'cdk.starter.delete.item.images',
                            DetailType: 'DeleteItemImages',
                            Detail: JSON.stringify({images}), //must be a stringified object (not an array! - eventBridge doesn't accept arrays)
                            Resources: [],
                            EventBusName: 'DeleteItemImagesEventBus'
                        }
                    ]
                };
                console.log('Putting event with params: ', params);
                const data = await eventBridgeClient.putEvents(params).promise();
                console.log('Event put: ', data);
            }
            
            result.statusCode = 200;
            result.body = JSON.stringify({message: 'Item deleted', ok: true});
        }
        else { result.statusCode = 401; throw new Error('Only admin or item owner can delete the item') }

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

