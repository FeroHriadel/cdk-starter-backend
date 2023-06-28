import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { S3 } from "aws-sdk";

const s3 = new S3();



async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 500, 
        headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true}, 
        body: JSON.stringify({error: 'No operation ran'})
    };

    try {
        //checks:
        console.log('Checks start...');

        //get image from body
        if (!event.body) { result.statusCode === 400; throw new Error('No request body found') };
        const body = JSON.parse(event.body);
        const { image } = body;
        if (!image) { result.statusCode === 400; throw new Error('No image included in request') };

        //get ObjectKey from image
        const objectKey = image.split('.com/')[1];
        console.log('Object Key: ', objectKey);

        //get the object:
        const params = {
            Bucket: process.env.BUCKET_NAME!,
            Key: objectKey,
            Expires: 60
        };
        console.log('Getting object using params: ', params);

        const url = await s3.getSignedUrlPromise('getObject', params);
        console.log(url)

        result.statusCode = 200; result.body = JSON.stringify(url);




        // const data = await s3.getObject(params).promise();
        // console.log('Got: ', data); // data = {Body: {type: "Buffer", data: [255, 216, 255, 224, 0...]}}

        // result.statusCode = 200;
        // result.body = (data.Body as Buffer).toString('base64');
        // result.headers = {...result.headers, 'Content-Type': 'image/png'}

    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            result.statusCode = result.statusCode === 500 ? 500 : result.statusCode ; 
            result.body = JSON.stringify({error: error.message});
        }
    }

    return result;
}



export { handler };

