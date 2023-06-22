import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";



export class DeleteItemsQueue extends Construct {

    public readonly consumer: IFunction;
    public readonly queue: IQueue;


    constructor(scope: Construct, id: string, consumer: IFunction) {
        super(scope, id);
        this.consumer = consumer;
        this.queue = new Queue(this, 'DeleteItemsQueue', {
            queueName: 'DeleteItemsQueue',
            visibilityTimeout: Duration.seconds(30),
            removalPolicy: RemovalPolicy.DESTROY
        });

        this.consumer.addEventSource(new SqsEventSource(this.queue, {
            batchSize: 1 //lambda receives 1 thing from queue at a time
        }));
    }

}