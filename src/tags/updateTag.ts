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
        console.log('Running checks...');
        
        //check if admin
        const isAdmin = event.requestContext.authorizer?.claims['cognito:groups'] === 'admins';
        console.log('is user admin: ', isAdmin);
        if (!isAdmin) { result.statusCode = 401; throw new Error('Only admins can update tags'); }

        //check if name was sent
        console.log('Checking req.body and name...')
        const tagId = event.pathParameters?.tagId;
        if (!event.body) { result.statusCode = 400; throw new Error('No body included in the request') };
        const body = JSON.parse(event.body);
        let { name } = body;
        if (!name) { result.statusCode = 400; throw new Error('Name is required') };

        //check if tag exists
        console.log('Checking if tag exists...')
        let tag;
        const res = await dynamodb.get({TableName: process.env.TABLE_NAME!, Key: {tagId}}).promise();
        tag = res.Item;
        if (!tag) { result.statusCode = 404; throw new Error('Tag not found') };

        //check if name is unique
        console.log('Checking if name is unique');
        const checkTags = await dynamodb.query({
            TableName: process.env.TABLE_NAME!,
            IndexName: 'name',
            KeyConditionExpression: '#name = :name',
            ExpressionAttributeNames: {
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':name': name
            }
        }).promise();
        if (checkTags.Items && checkTags.Items[0]) { result.statusCode = 403; throw new Error('Tag with such name already exists') };

        //update tag
        console.log('Updating tag...');
        const now = new Date()
        const params = {
            TableName: process.env.TABLE_NAME!,
            Key: {tagId},
            UpdateExpression: 'set #name = :name, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {'#name': 'name', '#updatedAt': 'updatedAt'},
            ExpressionAttributeValues: {':name': name, ':updatedAt': now.toISOString()},
            ReturnValues: 'ALL_NEW'
        };

        let updatedTag;
        const updateResult = await dynamodb.update(params).promise();
        updatedTag = updateResult.Attributes;

        if (!updatedTag) { throw new Error('Update failed') };
        result.statusCode = 200;
        result.body = JSON.stringify(updatedTag);

        
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