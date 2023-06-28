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

        //get fileName from body
        if (!event.body) { result.statusCode === 400; throw new Error('No request body found') };
        const body = JSON.parse(event.body);
        const { fileName } = body;
        if (!fileName) { result.statusCode === 400; throw new Error('No fileName included in request') };

        //create variables for getSignedUrl request
        console.log('checks passed, creating variables...')
        const randomString = (Math.random() * 100000).toFixed(0).toString();
        const Key = `${fileName}${randomString}.png`;
        const Bucket = process.env.BUCKET_NAME!;
        const Expires = 300; //5 minutes

        //get signed url from AWS
        console.log('getting signed url...')
        const url = await s3.getSignedUrlPromise('putObject', {
            Bucket,
            Key,
            Expires,
            ContentType: 'image/png'
            // ACL: 'public-read'
        });

        if (!url || typeof url !== 'string' || !url.includes('https://')) throw new Error('Generating signed url failed');
        
        result.statusCode = 200;
        result.body = JSON.stringify({url})

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

