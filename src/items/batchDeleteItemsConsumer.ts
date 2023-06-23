import { DynamoDB, S3 } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();



//GET ITEMS BY CATEGORY
const getItemsByCategory = async (category: string) => {
    const params = {
        TableName: process.env.TABLE_NAME!,
        IndexName: 'categorySort',
        KeyConditionExpression: '#category = :category',
        ExpressionAttributeNames: {'#category': 'category'},
        ExpressionAttributeValues: {':category': category},
        ScanIndexForward: true
    };
    console.log('getting items by category using params: ', params);
    const response = await dynamodb.query(params).promise();
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
        let categoryId = JSON.parse(event.Records[0].body).detail.categoryId;
        console.log('categoryId is: ', categoryId);

        //get items with that category
        const items = await getItemsByCategory(categoryId);
        if (!items || items.length === 0) { result.statusCode = 404; throw new Error('No items with given category found') };


        //split items into batches
          //batchWrite can only do 25 items at a time => we'll split items to batches of 20 to be on the safe side
        let batches: any = {};
        const chunkSize = 20;
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            batches[i] = [...chunk].map(item => (
                {
                    DeleteRequest: {
                        Key: {itemId: item.itemId}
                    }
                }
            ));
        };

        Object.keys(batches).forEach(async key => {
            let params = {
                RequestItems: {
                    [`${process.env.TABLE_NAME}`]: [...batches[key]]
                }
            }
            batches[key] = params;
        })
        console.log('Batches ( 1 batch = 1 request params ) are: ', JSON.stringify(batches));


        //delte items batch by batch
        const deleteBatch = async (batch: any) => {
            return new Promise(async (resolve, reject) => {
                dynamodb.batchWrite(batch, (err, data) => {
                    if (err) {
                        console.log(err);
                        return reject({error: err});
                    } else {
                        console.log(data);
                        return resolve({data});
                    }
                })

            })
        }

        let deletionResult = await Promise.all(Object.keys(batches).map(async key => { return await deleteBatch(batches[key]) }));
        console.log('deletion Result: ', JSON.stringify(deletionResult));
        result.statusCode = 200; result.body = JSON.stringify({deletionResult});

        //delete images (if any) from bucket (can delete max. 1000 items at a time, but for demo purposes it's good enough)
          //I assume all items got deleted successfully. If not there should be something in deletionResult.data.UnprocessedItems and you should handle that as well
        let images: string[] = [];
        items.forEach(item => {
            if (item.mainImage) images.push(item.mainImage.split('.com/')[1]);
            if (item.images && item.images.length > 0) {
                (item.images as string[]).forEach(img => images.push(img.split('.com/')[1]));
            }
        });
        console.log('Images to delete: ', images);
        if (images.length > 0) {
            const params = {
                Bucket: process.env.BUCKET_NAME!,
                Delete: {
                    Objects: images.map(img => ({Key: img})),
                    Quiet: false
                }
            }
            console.log('Deleting images with params: ', params);
            let deleteImagesResult = await s3.deleteObjects(params).promise();
            console.log('Delete images result: ', deleteImagesResult);
            result.statusCode = 200;
            result.body = JSON.stringify({deletionResult, deleteImagesResult});
        } else {
            console.log('No images to delete');
        }

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

