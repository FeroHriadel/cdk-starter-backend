import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import { AnyARecord } from 'dns';



const dynamodb = new DynamoDB.DocumentClient();

const result: APIGatewayProxyResult = {
    statusCode: 500,
    body: JSON.stringify({error: 'No operation ran'}),
    headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}
};





//GET ALL  ITEMS
const getAllItems = async () => {
    //I am not doing it in this app, but .scan() and query() return up to 1MB of data, if it's over u need 2 make a new scan with ExclusiveStartKey: LastEvaluatedKeyYouGotFromPreviousScan
    console.log('getting all items...')
    
    //get all items sorted A to Z
    const response = await dynamodb.query({
        TableName: process.env.TABLE_NAME!,
        IndexName: 'nameSort',
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: {'#type': 'type'},
        ExpressionAttributeValues: {':type': '#ITEM'}, //all items have type = '#ITEM', so it will return all items
        ScanIndexForward: true, //this tells dynamo to order asc (by sortIndex, which is `name` in this case)
    }).promise();
    let items = response.Items;

    return items; //not populating category name and tags names => would take forever in case db has many items => FE will do it
}



//GET ITEMS BY CATEGORY
const getItemsByCategory = async (category: string) => {
    console.log('getting items by category...')
    const response = await dynamodb.query({
        TableName: process.env.TABLE_NAME!,
        IndexName: 'categorySort',
        KeyConditionExpression: '#category = :category',
        ExpressionAttributeNames: {'#category': 'category'},
        ExpressionAttributeValues: {':category': category},
        ScanIndexForward: true
    }).promise();

    return response.Items;
}





//HANDLER
async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    try {
        //check url query
        console.log('checking query...');
        if (!event.queryStringParameters) {
            console.log('no query found, getting all items...')
            let items = await getAllItems(); result.statusCode = 200; result.body = JSON.stringify(items); 
        } 
        else {
            let query = event.queryStringParameters;
            console.log('query found: ', query);
            
            //get items by category
            if (Object.keys(query).length === 1 && query.category) { 
                let items = await getItemsByCategory(query.category);
                result.statusCode = 200; 
                result.body = JSON.stringify(items); 
            } 

        }

    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode === 500 ? 500 : result.statusCode; 
            result.body = JSON.stringify({error: error.message});
        }

    }

    return result;
}







export { handler }