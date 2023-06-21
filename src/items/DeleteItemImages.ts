import { S3 } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";

const s3 = new S3();





async function deleteImages(imagesObj: {[key: string]: string}) {
    const params = {
        Bucket: process.env.BUCKET_NAME!,
        Delete: {
            Objects: Object.keys(imagesObj).map(key => ({Key: imagesObj[key]})),
            Quiet: false
        }
    }
    console.log('Deleting images with params: ', params);
    return await s3.deleteObjects(params).promise();
}






async function handler(event: any, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        //get images from event.eventType.detail
        console.log('DeleteItemImages lambda started running');
        console.log('Event is: ', event);
        if (!event.detail?.images) {result.statusCode = 400; throw new Error('No images to delete found')};
        console.log('Images to delete: ', event.detail.images);

        //delete images
        let deletionResult = await deleteImages(event.detail.images);
        result.statusCode = 200;
        result.body = JSON.stringify({deletionResult});

    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode !== 500 ? result.statusCode : 500; 
            result.body = JSON.stringify({error: error.message});
        }
    }

    console.log('Result: ', result);
    return result;
}



export { handler };

