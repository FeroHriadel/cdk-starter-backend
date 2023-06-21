import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction, SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { IQueue } from "aws-cdk-lib/aws-sqs";



interface CdkStarterEventBusProps {
    publisherFunction: IFunction,
    targetFunction: IFunction
}


export class DeleteItemImagesEventBus extends Construct {
    constructor(scope: Construct, id: string, props: CdkStarterEventBusProps) {
        super(scope, id);

        const bus = new EventBus(this, 'DeleteItemImagesEventBus', {
            eventBusName: 'DeleteItemImagesEventBus'
        });
      
        const testingRule = new Rule(this, 'DeleteItemImagesEventBusTestingRule', {
            eventBus: bus,
            enabled: true,
            description: 'When item is deleted',
            eventPattern: {
                source: ['cdk.starter.delete.item.images'],
                detailType: ['DeleteItemImages']
            },
            ruleName: 'DeleteItemImagesEventBusTestingRule'
        });
    
        testingRule.addTarget(new LambdaFunction(props.targetFunction));
        bus.grantPutEventsTo(props.publisherFunction)
    }
}