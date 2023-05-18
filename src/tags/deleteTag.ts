import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

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
        if (!isAdmin) { result.statusCode = 401; throw new Error('Only admins can delete tags'); }

        //delete tag (not checking if tag exists, speeds the response up a little)
        const tagId = event.pathParameters?.tagId;
        await dynamodb.delete({ TableName: process.env.TABLE_NAME!, Key: {tagId} }).promise();
        result.statusCode = 200;
        result.body = JSON.stringify({message: 'Tag deleted', ok: true});
        
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

