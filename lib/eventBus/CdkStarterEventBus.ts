import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";



interface CdkStarterEventBusProps {
    publisherFunction: IFunction,
    targetFunction: IFunction
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
    
        testingRule01.addTarget(new LambdaFunction(props.targetFunction));
        bus.grantPutEventsTo(props.publisherFunction)
    }
}