import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuthorizationType, MethodOptions, RestApi, Cors } from "aws-cdk-lib/aws-apigateway";

import { imagesBucket } from './buckets/ImagesBucket';
import { TagsTable } from './tables/TagsTable';
import { CategoriesTable } from './tables/CategoriesTable';
import { AppAuthorizer } from './authorizer/AppAuthorizer';
import { CreateTagLambda } from './lambdas/tags/createTagLambda';
import { GetTagsLambda } from './lambdas/tags/getTagsLambda';
import { GetTagLambda } from './lambdas/tags/getTagLambda';
import { UpdateTagLambda } from './lambdas/tags/updateTagLambda';
import { DeleteTagLambda } from './lambdas/tags/deleteTagLambda';
import { GetSignedUrlLambda } from './lambdas/getSignedUrl';
import { CategoryLambdas } from './lambdas/categories/CategoryLambdas';
import { ItemLambdas } from './lambdas/items/ItemLambdas';
import { ItemsTable } from './tables/ItemsTable';
import { EventBridgeSenderLambda } from './lambdas/testing/EventBridgeSender';
import { EventBridgeSubscriberLambda } from './lambdas/testing/EventBridgeSubscriber';
import { CdkStarterEventBus } from './eventBuses/CdkStarterEventBus';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { CdkStarterQueue } from './queues/CdkStarterQueue';
import { DeleteItemImagesEventBus } from './eventBuses/DeleteItemImagesEventBus';
import { DeleteItemImagesLambda } from './lambdas/items/DeleteItemImagesLambda';



export class CdkStarterStack extends cdk.Stack {

  //API GATEWAY
  private api = new RestApi(this, 'CdkStarterApi', {
    defaultCorsPreflightOptions: {
      allowHeaders: [
        'Content-Type',
        'X-Amz-Date',
        'Authorization',
        'X-Api-Key',
      ],
      allowMethods: Cors.ALL_METHODS,
      allowCredentials: true,
      allowOrigins: Cors.ALL_ORIGINS
    }
  });


  //S3 BUCKET
  private imagesBucket = new imagesBucket(this);


  //TABLES
  private tagsTable = new TagsTable(this).table;
  private categoriesTable = new CategoriesTable(this).table;
  private itemsTable = new ItemsTable(this).table;


  //AUTHORIZER
  private authorizer: AppAuthorizer;


  //LAMBDAS
    // tagLambdas are in constructor done verbosely for explanation purposes
  private categoryLambdas = new CategoryLambdas(
    this,
    this.categoriesTable,
    this.itemsTable,
    this.imagesBucket.bucket,
    {createPath: 'Create', readPath: 'Read', updatePath: 'Update', deletePath: 'Delete'}
  );

  private itemLambdas = new ItemLambdas(
    this,
    this.itemsTable,
    this.categoriesTable,
    this.tagsTable,
    this.imagesBucket.bucket,
    {createPath: 'Create', readPath: 'Read', updatePath: 'Update', deletePath: 'Delete'},
  )



  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //AUTHORIZER INITIALIZATION
    this.authorizer = new AppAuthorizer(this, this.api);
    const optionsWithAuthorizer: MethodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {authorizerId: this.authorizer.authorizer.authorizerId}
    } //attach to lambda like this: createItemLambdaResource.addMethod('POST', createItemLambdaIntegration, optionsWithAuthorizer);


    //LAMBDAS
      //tags lambdas - verbous for explanation purposes
    const createTagLambdaInitialization = new CreateTagLambda(this); //init lambda
    const createTagLambda = createTagLambdaInitialization.lambda, createTagLambdaIntegration = createTagLambdaInitialization.lambdaIntegration; //get lambda & integration from init above
    this.tagsTable.grantReadWriteData(createTagLambda); //give lambda access rights to tagsTable
    const createTagLambdaResource = this.api.root.addResource('createtag'); // adds path: `/createtag` to api gateway
    createTagLambdaResource.addMethod('POST', createTagLambdaIntegration, optionsWithAuthorizer); //protect lamda with Cognito by adding optionsWithAuthorizer

    const getTagsLambdaInitialization = new GetTagsLambda(this);
    const getTagsLambda = getTagsLambdaInitialization.lambda, getTagsLambdaIntegration = getTagsLambdaInitialization.lambdaIntegration;
    this.tagsTable.grantReadData(getTagsLambda);
    const getTagsLambdaResource = this.api.root.addResource('gettags');
    getTagsLambdaResource.addMethod('GET', getTagsLambdaIntegration);

    const getTagLambdaInitialization = new GetTagLambda(this);
    const getTagLambda = getTagLambdaInitialization.lambda, getTagLambdaIntegration = getTagLambdaInitialization.lambdaIntegration;
    this.tagsTable.grantReadData(getTagLambda);
    const getTagLambdaResource = this.api.root.addResource('gettag'); //add path: `/gettag`
    const getTagResourceWithPathParams = getTagLambdaResource.addResource('{tagId}'); //add param to path: `/gettag/{tagId}`
    getTagResourceWithPathParams.addMethod('GET', getTagLambdaIntegration);

    const updateTagLambdaInitialization = new UpdateTagLambda(this);
    const updateTagLambda = updateTagLambdaInitialization.lambda, updateTagLambdaIntegration = updateTagLambdaInitialization.lambdaIntegration;
    this.tagsTable.grantReadWriteData(updateTagLambda);
    const updateTagLambdaResource = this.api.root.addResource('updatetag');
    const updateTagResourceWithParams = updateTagLambdaResource.addResource('{tagId}');
    updateTagResourceWithParams.addMethod('PUT', updateTagLambdaIntegration, optionsWithAuthorizer);

    const deleteTagLambdaInitialization = new DeleteTagLambda(this);
    const deleteTagLambda = deleteTagLambdaInitialization.lambda, deleteTagLambdaIntegration = deleteTagLambdaInitialization.lambdaIntegration;
    this.tagsTable.grantReadWriteData(deleteTagLambda); this.itemsTable.grantReadData(deleteTagLambda);
    const deleteTagLambdaResource = this.api.root.addResource('deletetag');
    const deleteTagResourceWithParams = deleteTagLambdaResource.addResource('{tagId}');
    deleteTagResourceWithParams.addMethod('DELETE', deleteTagLambdaIntegration, optionsWithAuthorizer);

    //get signed url lambda
    const getSignedUrlLambdaInitialization = new GetSignedUrlLambda(this, this.imagesBucket.bucket);
    const getSignedUrlIntegration = getSignedUrlLambdaInitialization.lambdaIntegration;
    const getSignedUrlResource = this.api.root.addResource('getsignedurl');
    getSignedUrlResource.addMethod('POST', getSignedUrlIntegration, optionsWithAuthorizer);

    //categories lambdas - how big boys do it (less flexible but concise)
    const categoriesResource = this.api.root.addResource('categories');
    categoriesResource.addMethod('POST', this.categoryLambdas.createLambdaIntegration, optionsWithAuthorizer);
    categoriesResource.addMethod('GET', this.categoryLambdas.readLambdaIntegration);
    categoriesResource.addMethod('PUT', this.categoryLambdas.updateLambdaIntegration, optionsWithAuthorizer);
    categoriesResource.addMethod('DELETE', this.categoryLambdas.deleteLambdaIntegration, optionsWithAuthorizer);

    //items lambdas
    const itemsResource = this.api.root.addResource('items');
    itemsResource.addMethod('POST', this.itemLambdas.createLambdaIntegration, optionsWithAuthorizer);
    itemsResource.addMethod('GET', this.itemLambdas.readLambdaIntegration);
    itemsResource.addMethod('PUT', this.itemLambdas.updateLambdaIntegration, optionsWithAuthorizer);
    itemsResource.addMethod('DELETE', this.itemLambdas.deleteLambdaIntegration, optionsWithAuthorizer);

    
    //EVENT BRIDGE
      //delete item images - lambda to lamba event bridge
      const deleteItemImagesLambdaInitialization = new DeleteItemImagesLambda(this, this.imagesBucket.bucket); //subscriber lambda
      const deleteItemImagesEventBus = new DeleteItemImagesEventBus(this, 'DeleteItemImagesEventBusConstruct', { //event bus
        publisherFunction: this.itemLambdas.deleteLambda,
        targetFunction: deleteItemImagesLambdaInitialization.lambda
      });

      //delete all items with the same category - lambda to queue
      //queue
      //lambda - delete many endpoint
      //lambda - delete many doer
      //event bus with lambda and queue

    

    //TESTING:
    //when eventBridgeSender is hit it sends a payload to eventBus.
    const eventBridgeSenderLambdaInitialization = new EventBridgeSenderLambda(this);
    const eventBridgeSenderLambda = eventBridgeSenderLambdaInitialization.lambda, eventBridgeSenderLambdaIntegration = eventBridgeSenderLambdaInitialization.lambdaIntegration;
    this.tagsTable.grantReadWriteData(eventBridgeSenderLambda);
    const eventBridgeSenderResource = this.api.root.addResource('eventbussender');
    eventBridgeSenderResource.addMethod('POST', eventBridgeSenderLambdaIntegration);

    //when eventBridgeSubscriber is hit it gets the payload sent by sqs and saves it to tagsTable
    const eventBridgeSubscriberLambdaInitialization = new EventBridgeSubscriberLambda(this);
    const eventBridgeSubscriberLambda = eventBridgeSubscriberLambdaInitialization.lambda, eventBridgeSubscriberLambdaIntegration = eventBridgeSubscriberLambdaInitialization.lambdaIntegration;
    this.tagsTable.grantReadWriteData(eventBridgeSubscriberLambda);
    const eventBridgeSubscriberResource = this.api.root.addResource('eventbussubscriber');
    eventBridgeSubscriberResource.addMethod('POST', eventBridgeSubscriberLambdaIntegration);

    //queue
    const myQueue = new CdkStarterQueue(this, 'Queue01', eventBridgeSubscriberLambda);
    
    //this is the eventBus utilizingeventBridgeSender & eventBridgeSubscriber lambdas above 
    const eventBus = new CdkStarterEventBus(this, 'EventBus01', {
      publisherFunction: eventBridgeSenderLambda,
      //targetFunction: eventBridgeSubscriberLambda // if you wanted to send from ev.brdge directly to lambda
      targetQueue: myQueue.queue
    })
  }
}
