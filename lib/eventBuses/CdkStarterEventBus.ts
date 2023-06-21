import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction, SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { IQueue } from "aws-cdk-lib/aws-sqs";



interface CdkStarterEventBusProps {
    publisherFunction: IFunction,
    // targetFunction: IFunction //if u wanted to send ev. brifge event directly to lambda
    targetQueue: IQueue
}


export class CdkStarterEventBus extends Construct {
    constructor(scope: Construct, id: string, props: CdkStarterEventBusProps) {
        super(scope, id);

        const bus = new EventBus(this, 'CdkStarterEventBus', {
            eventBusName: 'CdkStarterEventBus'
        });
      
        const testingRule01 = new Rule(this, 'TestingRule01', {
            eventBus: bus,
            enabled: true,
            description: 'When eventBridgeSenderLambda was hit',
            eventPattern: {
                source: ['cdk.starter.eventbridgesender'],
                detailType: ['EventBridgeSender']
            },
            ruleName: 'TestingRule01'
        });
    
        //testingRule01.addTarget(new LambdaFunction(props.targetFunction)); //if adding lambda
        testingRule01.addTarget(new SqsQueue(props.targetQueue));
        bus.grantPutEventsTo(props.publisherFunction)
    }
}