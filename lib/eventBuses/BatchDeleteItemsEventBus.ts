import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction, SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { IQueue } from "aws-cdk-lib/aws-sqs";



interface BatchDeleteItemsEventBusProps {
    publisherFunction: IFunction,
    targetQueue: IQueue
}


export class BatchDeleteItemsEventBus extends Construct {
    constructor(scope: Construct, id: string, props: BatchDeleteItemsEventBusProps) {
        super(scope, id);

        const bus = new EventBus(this, 'BatchDeleteItemsEventBus', {
            eventBusName: 'BatchDeleteItemsEventBus'
        });
      
        const batchDeleteItemsEventBusRule = new Rule(this, 'BatchDeleteItemsEventBusRule', {
            eventBus: bus,
            enabled: true,
            description: 'When batchDeleteItemsPublisherLambda is hit',
            eventPattern: {
                source: ['cdk.starter.batch.delete.items'],
                detailType: ['BatchDeleteItems']
            },
            ruleName: 'BatchDeleteItemsEventBusRule'
        });
    
        batchDeleteItemsEventBusRule.addTarget(new SqsQueue(props.targetQueue));
        bus.grantPutEventsTo(props.publisherFunction)
    }
}