import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';



const TABLE_NAME = process.env.TABLE_NAME;
const dynamodb = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    const result: APIGatewayProxyResult = {
        statusCode: 500,
        body: JSON.stringify({error: 'No operation ran'}),
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}
    }

    try {
        //checks:
        console.log('Checks start...');

        //check if admin
        const isAdmin = event.requestContext.authorizer?.claims['cognito:groups'] === 'admins';
        console.log('is user admin: ', isAdmin);
        if (!isAdmin) { result.statusCode = 401; throw new Error('Only admins can create tags'); }

        //if no category name return
        console.log('Checking body for category attributes...');
        if (!event.body) { result.statusCode = 400; throw new Error('No body included'); }
        const body = JSON.parse(event.body);
        if (!body.name || typeof body.name !== 'string' || !body.name.length) { result.statusCode = 400; throw new Error('Category name (string) is required');}

        //if category with same name exists return
        console.log('Checking if name is unique...');
        const checkCategories = await dynamodb.query({
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

        if (checkCategories && checkCategories.Items && checkCategories.Items[0]) { result.statusCode = 403; throw new Error(`Category with name ${body.name} already exists`) }

        //create category
        console.log('Creating category...')
        const categoryId = v4();
        const now = new Date();
        const category = {
            categoryId: categoryId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            name: body.name,
            description: body.description ? body.description : '',
            image: body.image ? body.image : '',
            type: '#CATEGORY' //this will be the partition key in `nameSort` GSI => all categories have the same value so we can satisfy the `all queries must have an equality condition` and still return all categories ordered by name 
        };

        //save tag
        const savedCategory = await dynamodb.put({TableName: process.env.TABLE_NAME!, Item: category}).promise();
        if (!savedCategory) throw new Error('Category failed to save');
        result.body = JSON.stringify(category); result.statusCode = 201;
        console.log('Category created successfully');

    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode === 500 ? 500 : result.statusCode; 
            result.body = JSON.stringify({error: error.message});
        }

    }


    return result

}

export { handler }