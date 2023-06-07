import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import { AnyARecord } from 'dns';
import { QueryInput } from 'aws-sdk/clients/textract';



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

    console.log('found: ', response);
    return response.Items;
}



//GET ITEMS BY TAG
const getItemsByTag = async (tag: string) => {
    console.log('getting items by tag...');
    const response = await dynamodb.query({
        TableName: process.env.TABLE_NAME!,
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



//GET ITEMS BY CATEGORY AND TAG
const getItemsByCategoryAndTag = async (category: string, tag: string) => {
    console.log('getting items by category AND tag...');
    const response = await dynamodb.query({
        TableName: process.env.TABLE_NAME!,
        IndexName: 'nameSort',
        KeyConditionExpression: '#type = :type',
        FilterExpression: `contains(#tags, :tag) AND #category = :category`,
        ExpressionAttributeNames: {'#type': 'type', '#tags': 'tags', '#category': 'category'},
        ExpressionAttributeValues: {':type': '#ITEM', ':tag': tag, ':category': category},
        ScanIndexForward: true,
    }).promise();

    console.log('found: ', response);
    return response.Items;
}



//GET ITEMS ORDERED BY UPDATEDAT
const getItemsOrderedByDate = async (order: string, category: string | null, tag: string | null) => {
    console.log(`getting items ordered by updatedAt: order: ${order}, category: ${category}, tag: ${tag}`);
    let params: any = {
        TableName: process.env.TABLE_NAME!,
        IndexName: 'dateSort',
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: {'#type': 'type'},
        ExpressionAttributeValues: {':type': '#ITEM'},
        ScanIndexForward: order === "latest" ? false : true
    }

    if (category && !tag) {
        params.FilterExpression = `contains(#category, :category)`,
        params.KeyConditionExpression = '#type = :type',
        params.ExpressionAttributeNames = {'#type': 'type', '#category': 'category'},
        params.ExpressionAttributeValues = {':type': '#ITEM', ':category': category}
    } 
    else if (!category && tag) {
        params.FilterExpression = `contains(#tags, :tag)`,
        params.KeyConditionExpression = '#type = :type',
        params.ExpressionAttributeNames = {'#type': 'type', '#tags': 'tags'},
        params.ExpressionAttributeValues = {':type': '#ITEM', ':tag': tag}
    }
    else if (category && tag) {
        params.FilterExpression = `contains(#tags, :tag) AND #category = :category`,
        params.KeyConditionExpression = '#type = :type',
        params.ExpressionAttributeNames = {'#type': 'type', '#tags': 'tags', '#category': 'category'},
        params.ExpressionAttributeValues = {':type': '#ITEM', ':tag': tag, ':category': category}
    }

    console.log(`searching with params: `, params);
    const response = await dynamodb.query(params).promise();
    console.log('found: ', response);
    return response.Items;
}



//
const getItemsWhereNameIncludes = async (namesearch: string) => {
    console.log(`searching items where name includes ${namesearch}`);
    const response = await dynamodb.query({
        TableName: process.env.TABLE_NAME!,
        IndexName: 'nameSort',
        FilterExpression: `contains(#namesearch, :namesearch)`,
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: {'#type': 'type', '#namesearch': 'namesearch'},
        ExpressionAttributeValues: {':type': '#ITEM', ':namesearch': namesearch},
        ScanIndexForward: true,
    }).promise();

    console.log('found: ', response);
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

            //search by name includes (case insensitive)
            if (query.namesearch) {
                let items = await getItemsWhereNameIncludes(query.namesearch.toLowerCase());
                result.statusCode = 200; 
                result.body = JSON.stringify(items);
            }

            //order by updatedAt
            else if (query.order) {
                let items = await getItemsOrderedByDate(query.order, query.category ? query.category : null, query.tag ? query.tag : null);
                result.statusCode = 200; 
                result.body = JSON.stringify(items);
            } 
            
            //get items by category
            else if (Object.keys(query).length === 1 && query.category) { 
                let items = await getItemsByCategory(query.category);
                result.statusCode = 200; 
                result.body = JSON.stringify(items); 
            }

            //get items by tag
            else if (Object.keys(query).length === 1 && query.tag) { 
                let items = await getItemsByTag(query.tag);
                result.statusCode = 200; 
                result.body = JSON.stringify(items); 
            }

            //get items by category and tag
            else if (Object.keys(query).length === 2 && query.tag && query.category) { 
                let items = await getItemsByCategoryAndTag(query.category, query.tag);
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