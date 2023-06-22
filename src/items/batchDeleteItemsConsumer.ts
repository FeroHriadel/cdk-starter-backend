import { DynamoDB, EventBridge } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const dynamodb = new DynamoDB.DocumentClient();




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






//HANDLER
async function handler(event: any, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran - this is only a placeholder'})
    };

    try {
        //get payload   ( =event.Records which is an array of objects with .body.detail which is the info(s) you want )
        console.log('Lambda started running....');
        console.log('Event is: ', event);
        console.log('Record(s).body: ');
        (event.Records as any[]).forEach(r => {
            console.log(JSON.parse(r.body).detail)
        });

        //get categoryId
        let categoryId = JSON.parse(event.Records[0].body).detail;
        console.log('categoryId is: ', categoryId);

        //get items with that category
        const items = await getItemsByCategory(categoryId);
        if (!items || items.length === 0) { result.statusCode = 404; throw new Error('No items with given category found') };

        //split items into batches
          //batchWrite can only do 25 items at a time => we'll split items to batches of 20 to be on the safe side
        let batches: any = {};
        const chunkSize = 2;
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            batches[i] = [...chunk].map(item => ({itemId: item.itemId}));
        };




    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode === 500 ? 500 : result.statusCode; 
            result.body = JSON.stringify({error: error.message});
        }
    }

    console.log(result)
    return result
}



export { handler };

