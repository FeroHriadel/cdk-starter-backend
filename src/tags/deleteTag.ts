import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

const dynamodb = new DynamoDB.DocumentClient();




//GET ITEMS BY TAG
const getItemsByTag = async (tag: string) => {
    console.log('getting items by tag...');
    const response = await dynamodb.query({
        TableName: process.env.ITEMS_TABLE_NAME!,
        IndexName: 'nameSort',
        FilterExpression: `contains(#tags, :tag)`,
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: {'#type': 'type', '#tags': 'tags'},
        ExpressionAttributeValues: {':type': '#ITEM', ':tag': tag},
        ScanIndexForward: true,
    }).promise();

    console.log('found: ', response);
    return response.Items;
}




//HANDLER
async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        console.log('Running checks...');
        
        //check if admin
        const isAdmin = event.requestContext.authorizer?.claims['cognito:groups'] === 'admins';
        console.log('is user admin: ', isAdmin);
        if (!isAdmin) { result.statusCode = 401; throw new Error('Only admins can delete tags'); }

        //check if items with this tag exist
        const tagId = event.pathParameters?.tagId;
        if (!tagId) { result.statusCode = 400; throw new Error('tagId is required') };
        console.log('Checking if items with this tag exist...');
        const itemsWithTag = await getItemsByTag(tagId);
        if (itemsWithTag && itemsWithTag.length > 0) {
            result.statusCode = 403; 
            throw new Error('Items with this tag exist. Cannot delete tag') 
        }
        else {
            //delete tag (not checking if tag exists, speeds the response up a little)
            await dynamodb.delete({ TableName: process.env.TABLE_NAME!, Key: {tagId} }).promise();
            result.statusCode = 200;
            result.body = JSON.stringify({message: 'Tag deleted', ok: true});
        }

        
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

