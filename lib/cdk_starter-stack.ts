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
import { DeleteItemImagesEventBus } from './eventBuses/DeleteItemImagesEventBus';
import { DeleteItemImagesLambda } from './lambdas/items/DeleteItemImagesLambda';
import { BatchDeleteItemsConsumerLambda } from './lambdas/items/BatchDeleteItemsConsumer';
import { DeleteItemsQueue } from './queues/DeleteItemsQueue';
import { BatchDeleteItemsPublisherLambda } from './lambdas/items/BatchDeleteItemsPublisher';
import { BatchDeleteItemsEventBus } from './eventBuses/BatchDeleteItemsEventBus';
import { GetS3ObjectLambda } from './lambdas/getS3Object';
import { BucketAccessPolicyStatement } from './policies/BucketAccessPolicyStatement';
import { Policy } from 'aws-cdk-lib/aws-iam';
import { UiDeployment } from './uiDeployment/UiDeployment';



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


  //POLICY STATEMENTS
  private bucketAccessPolicyStatement = new BucketAccessPolicyStatement(this.imagesBucket.bucket).policyStatement;


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
    {createPath: 'Create', readPath: 'Read', updatePath: 'Update', deletePath: 'Delete'},
    this.bucketAccessPolicyStatement
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

    //get signed url lambda (upload signed url)
    const getSignedUrlLambdaInitialization = new GetSignedUrlLambda(this, this.imagesBucket.bucket, this.bucketAccessPolicyStatement);
    const getSignedUrlIntegration = getSignedUrlLambdaInitialization.lambdaIntegration;
    const getSignedUrlResource = this.api.root.addResource('getsignedurl');
    getSignedUrlResource.addMethod('POST', getSignedUrlIntegration, optionsWithAuthorizer);

    //get s3 object lambda (download signed url)
    const getS3ObjectLambdaInitialization = new GetS3ObjectLambda(this, this.imagesBucket.bucket, this.bucketAccessPolicyStatement);
    const getS3ObjectLambdaIntegration = getS3ObjectLambdaInitialization.lambdaIntegration;
    const getS3ObjectResource = this.api.root.addResource('gets3object');
    getS3ObjectResource.addMethod('POST', getS3ObjectLambdaIntegration);

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

    
    //EVENT BRIDGE - LAMBDA TO LAMBDA
    //user deletes item (items/deleteLambda above)
    //delete item lambda pings EventBus (sending it list of item images to delete)
    //EventBus pings deleteItemImagesLambda relaying the list of images to delete
    //deleteItemImagesLambda deletes the images from bucket
    const deleteItemImagesLambdaInitialization = new DeleteItemImagesLambda(this, this.imagesBucket.bucket); //subscriber lambda
    const deleteItemImagesEventBus = new DeleteItemImagesEventBus(this, 'DeleteItemImagesEventBusConstruct', { //event bus
      publisherFunction: this.itemLambdas.deleteLambda,
      targetFunction: deleteItemImagesLambdaInitialization.lambda
    });
    deleteItemImagesLambdaInitialization.lambda.role?.attachInlinePolicy(
      new Policy(this, 'DeleteItemImagesLambdaBucketAccess', {statements: [this.bucketAccessPolicyStatement]})
    );


    //EVENT BRIDGE - LAMBDA TO SQS
    //frontend trigers publisher lambda (sends categoryId)
    //publisher lambda triggers event bus (passes on categoryId)
    //event bus triggers queue (passes on categoryId)
    //queue triggers consumer lambda (the one that actually does something) (batch deletes all items within category and their images)

    //publiser (trigger endpoint for frontend):
    const batchDeleteItemsPublisherLambdaInitialization = new BatchDeleteItemsPublisherLambda(this);
    const batchDeleteItemsPublisherLambda = this.api.root.addResource('batchdeleteitems');
    batchDeleteItemsPublisherLambda.addMethod('GET', batchDeleteItemsPublisherLambdaInitialization.lambdaIntegration, optionsWithAuthorizer);

    //queue consumer lambda (actual doer function):
    const batchDeleteItemsConsumerLambdaInitialization = new BatchDeleteItemsConsumerLambda(this, this.imagesBucket.bucket);
    this.itemsTable.grantReadWriteData(batchDeleteItemsConsumerLambdaInitialization.lambda);
    batchDeleteItemsConsumerLambdaInitialization.lambda.role?.attachInlinePolicy(
      new Policy(this, 'BatchDeleteItemsLambdaBucketAccess', {statements: [this.bucketAccessPolicyStatement]})
    );

    //queue:
    const deleteItemsQueue = new DeleteItemsQueue(this, 'BatchDeleteItemsQueueConstruct', batchDeleteItemsConsumerLambdaInitialization.lambda);

    //event bus:
    const batchDeleteItemsEventBus = new BatchDeleteItemsEventBus(this, 'BatchDeleteItemsEventBusConstruct', {
      publisherFunction: batchDeleteItemsPublisherLambdaInitialization.lambda,
      targetQueue: deleteItemsQueue.queue
    });



    //DEPLOY UI
    /* go to ur react app, run `npm run build` then come back here and run `cdk deploy` */
    new UiDeployment(this);

  }
}
