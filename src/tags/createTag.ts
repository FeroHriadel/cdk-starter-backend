import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

const dynamodb = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 201, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        //checks:
        console.log('Checks start...');

        //check if admin
        const isAdmin = event.requestContext.authorizer?.claims['cognito:groups'] === 'admins';
        console.log('is user admin: ', isAdmin);
        if (!isAdmin) { result.statusCode = 401; throw new Error('Only admins can create tags'); }

        //if no tag name return
        if (!event.body) throw new Error('No body included');
        const body = JSON.parse(event.body);
        if (!body.name || typeof body.name !== 'string' || !body.name.length) { result.statusCode = 400; throw new Error('Tag name (string) is required');}

        //if tag with same name exists return
        console.log('Checking if name is unique...');
        const checkTags = await dynamodb.query({
            TableName: process.env.TABLE_NAME!,
            IndexName: 'name',
            KeyConditionExpression: '#name = :name',
            ExpressionAttributeNames: {
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':name': body.name
            }
        }).promise();

        if (checkTags && checkTags.Items && checkTags.Items[0]) { result.statusCode = 403; throw new Error(`Tag with name ${body.name} already exists`) }

        //create tag
        console.log('Creating tag...')
        const tagId = v4();
        const now = new Date();
        const tag = {
            tagId: tagId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            name: body.name,
            type: '#TAG' //this will be the partition key in `nameSort` GSI => all tags have the same value so we can satisfy the `all queries must have an equality condition` and still return all tags ordered by name 
        };

        //save tag
        const savedTag = await dynamodb.put({TableName: process.env.TABLE_NAME!, Item: tag}).promise();
        if (!savedTag) throw new Error('Tag failed to save');
        result.body = JSON.stringify(tag);
        console.log('Tag created successfully');
        
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode === 201 ? 500 : result.statusCode ; 
            result.body = JSON.stringify({error: error.message});
        }
    }

    return result;
}



export { handler };

