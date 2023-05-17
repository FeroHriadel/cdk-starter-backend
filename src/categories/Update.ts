import { DynamoDB, S3 } from 'aws-sdk';

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';



const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();



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

        //check if category exists
        console.log('Checking if tag exists...');
        let existingCategory;
        const existingCategoryQuery = await dynamodb.get({TableName: process.env.TABLE_NAME!, Key: {categoryId: body.categoryId}}).promise();
        existingCategory = existingCategoryQuery.Item;
        if (!existingCategory) { result.statusCode = 404; throw new Error('Category not found'); }

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

        //update category
        console.log('Updating category...')
        const params = {
            TableName: process.env.TABLE_NAME!,
            Key: {categoryId: body.categoryId},
            UpdateExpression: 'set #name = :name, #image = :image',
            ExpressionAttributeNames: {'#name': 'name', '#image': 'image'},
            ExpressionAttributeValues: {':name': body.name, ':imageUrl': body.image || undefined},
            ReturnValues: 'ALL_NEW'
        };

        let updatedCategory;
        const updateResult = await dynamodb.update(params).promise();
        console.log('Update result: ', updateResult);
        updatedCategory = updateResult.Attributes;
        if (!updatedCategory) throw new Error('Update failed');

        //delete old image from bucket (unless user uploaded the same file)
        if (existingCategory.image && existingCategory.image !== '' && existingCategory.image !== body.image) {
            console.log('Deleting old image from bucket');
            await s3.deleteObject({
                Bucket: process.env.BUCKET_NAME!, 
                Key: body.image.split('.com/')[1]
            }).promise()
        }

        //return updated category
        result.statusCode = 200;
        result.body = JSON.stringify(updatedCategory);

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