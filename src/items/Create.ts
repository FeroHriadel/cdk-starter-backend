import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

const dynamodb = new DynamoDB.DocumentClient();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {statusCode: 500, body: 'Body not created yet'};

    try {
        //check body
        console.log('checking body...');
        if (!event.body) throw new Error('No body included');
        const createdItem = JSON.parse(event.body);
        console.log(`body is: ${createdItem}`);

        //check required fields
        console.log('checking required fields...');
        if (!createdItem.name || createdItem.name === '') { result.statusCode = 400; throw new Error('Name is required') };
        if (!createdItem.description) createdItem.description = '';
        if (!createdItem.category) { result.statusCode = 400; throw new Error('Category is required') };
        if (!createdItem.tags) createdItem.tags = [];
        if (!createdItem.price) createdItem.price = '0';
        if (!createdItem.quantity) createdItem.quantity = '0';
        let now = new Date();
        createdItem.createdAt = now.toISOString();
        createdItem.updatedAt = now.toISOString();
        createdItem.type = '#ITEM';
        createdItem.itemId = v4();
        console.log('fields checked: ', createdItem);

        //check if category valid
        console.log('checking if category exists...')
        const categoryExists = await dynamodb.get({TableName: process.env.CATEGORIES_TABLE!, Key: {categoryId: createdItem.category}}).promise();
        if (!categoryExists || !categoryExists?.Item || !categoryExists?.Item?.categoryId) { result.statusCode = 400; throw new Error('Invalid category') }
        console.log('category ok: ', categoryExists.Item);


        //check if tags valid
        console.log('checking tags...')
        if (createdItem.tags) {
            if (!Array.isArray(createdItem.tags)) { result.statusCode = 400; throw new Error('Tags must be an array of tag ids') };
            for (let i = 0; i < createdItem.tags.length; i++) {
                const tagExists = await dynamodb.get({TableName: process.env.TAGS_TABLE!, Key: {tagId: createdItem.tags[i]}}).promise();
                if (!tagExists || !tagExists?.Item || !tagExists?.Item?.tagId) { result.statusCode = 400; throw new Error(`Provided tag ${createdItem.tags[i]} not found`) };
            }
        }
        console.log('tags ok');

        //save item to db
        console.log('saving item to db....');
        await dynamodb.put({TableName: process.env.TABLE_NAME!, Item: createdItem}).promise();
        result.body = JSON.stringify(createdItem);
        
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {result.statusCode = result.statusCode !== 500 ? result.statusCode : 500; result.body = JSON.stringify({error: error.message});}
    }

    return result;
}



export { handler };

