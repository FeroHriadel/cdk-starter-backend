import { DynamoDB, S3 } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();



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
        if (!isAdmin) { result.statusCode = 401; throw new Error('Only admins can delete categories'); }

        //check if categoryId exists
        const categoryId = event.queryStringParameters?.categoryId;
        console.log('categoryId from queryStringParametrs: ', categoryId);
        if (!categoryId) { result.statusCode = 400; throw new Error('categoryId is required') };
        let category;
        let checkCategory = await dynamodb.get({ TableName: process.env.TABLE_NAME!, Key: {categoryId} }).promise();
        category = checkCategory.Item;
        if (!category) { result.statusCode = 404; throw new Error(`Category not found`) }


        //delete category (not checking if category exists, speeds the response up a little)
        await dynamodb.delete({ TableName: process.env.TABLE_NAME!, Key: {categoryId} }).promise();
        result.statusCode = 200;
        result.body = JSON.stringify({message: 'Category deleted', ok: true});

        //delete image from s3 if any
        if (category.image && category.image !== '') {
            console.log('Deleting image from bucket. Deleting file: ', category.image.split('.com/')[1]);
            await s3.deleteObject({
                Bucket: process.env.BUCKET_NAME!, 
                Key: category.image.split('.com/')[1]
            }).promise();
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

