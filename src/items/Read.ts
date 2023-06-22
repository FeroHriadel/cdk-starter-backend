import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import { AnyARecord } from 'dns';
import { QueryInput } from 'aws-sdk/clients/textract';
import { Tag } from 'aws-cdk-lib';



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



//NAME INCLUDES SEARCH
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



//GET ITEM BY ID
const getItemById = async (itemId: string) => {
    //get item
    console.log(`getting item by id ${itemId}...`)
    let res = await dynamodb.get({TableName: process.env.TABLE_NAME!, Key: {itemId}}).promise();
    console.log(`Found: `, res);
    let item = res.Item;
    if (!item) { result.statusCode = 404; throw new Error('Item not found') };

    //populate category
    console.log('getting item category...')
    const catRes = await dynamodb.get({TableName: process.env.CATEGORIES_TABLE!, Key: {categoryId: item.category}}).promise();
    console.log(`Found: `, catRes);
    let category = catRes.Item;
    if (!category) { result.statusCode = 404; throw new Error(`Item's category not found`) }
    item.category = category;

    //populate tags
    if (item.tags && item.tags.length > 0) {
        const getTag = async (tagId: string) => {
            let tagRes = await dynamodb.get({TableName: process.env.TAGS_TABLE!, Key: {tagId: tagId}}).promise();
            let tag = tagRes.Item;
            if (!tag) { result.statusCode = 404; throw new Error(`Item's tag not found`) };
            return tag;
        }

        console.log('getting item tags...');
        let populateTags = () => Promise.all((item!.tags as string[]).map(async t => {return await getTag(t)}))
        let populatedTags = await populateTags();
        console.log(`tags: ${populatedTags}`)
        item!.tags = populatedTags;
        return item;

    } 
    
    else {
        return item;
    }

    
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

            //get item by id
            if (query.item) {
                let item = await getItemById(query.item);
                result.statusCode = 200;
                result.body = JSON.stringify(item);
            }

            //search items by name (name includes - case insensitive)
            else if (query.namesearch) {
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