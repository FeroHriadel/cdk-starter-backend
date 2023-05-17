import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import { v4 } from 'uuid';



const dynamodb = new DynamoDB.DocumentClient();

const result: APIGatewayProxyResult = {
    statusCode: 500,
    body: JSON.stringify({error: 'No operation ran'}),
    headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}
};



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    try {
        if (event.queryStringParameters) result.body = await findById(event.queryStringParameters);
        else result.body = await findAll();        

    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode === 500 ? 500 : result.statusCode; 
            result.body = JSON.stringify({error: error.message});
        }

    }

    return result;
}



async function findById(queryParams: APIGatewayProxyEventQueryStringParameters) {
    console.log('Getting categoryId from params...');
    const queryKey = Object.keys(queryParams)[0];
    const queryValue = queryParams[queryKey];
    let category;
    const queryResponse = await dynamodb.get({TableName: process.env.TABLE_NAME!, Key: {categoryId: queryValue}}).promise();
    console.log(`query result is: `, queryResponse);
    category = queryResponse.Item;
    if (!category) { result.statusCode = 404; throw new Error(`Category with id ${queryValue} not found`) }
    result.statusCode = 200;
    return JSON.stringify(category);
}



async function findAll() {
    console.log('Getting all categories...')
    let categories;
    const response = await dynamodb.query({
        TableName: process.env.TABLE_NAME!,
        IndexName: 'nameSort',
        ExpressionAttributeNames: {'#type': 'type'},
        ExpressionAttributeValues: {':type': '#CATEGORY'}, //all categories have type = '#CATEGORY', so it will return all categories
        ScanIndexForward: true, //this tells dynamo to order asc (by sortIndex, which is `name` in this case)
    }).promise();
    console.log(`Query result is: `, response);
    categories = response.Items;
    return JSON.stringify(categories);
}



export { handler }