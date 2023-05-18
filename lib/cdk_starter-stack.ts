import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuthorizationType, MethodOptions, RestApi, Cors } from "aws-cdk-lib/aws-apigateway";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";

import { imagesBucket } from './buckets/ImagesBucket';
import { TagsTable } from './tables/TagsTable';
import { CategoriesTable } from './tables/CategoriesTable';
// import { ItemsTable } from './tables/ItemsTable';
// import { CreateItemLambda } from './lambdas/items/createItemLambda';
import { AppAuthorizer } from './authorizer/AppAuthorizer';
import { CreateTagLambda } from './lambdas/tags/createTagLambda';
import { GetTagsLambda } from './lambdas/tags/getTagsLambda';
import { GetTagLambda } from './lambdas/tags/getTagLambda';
import { UpdateTagLambda } from './lambdas/tags/updateTagLambda';
import { DeleteTagLambda } from './lambdas/tags/deleteTagLambda';
import { GetSignedUrlLambda } from './lambdas/getSignedUrl';
import { CategoryLambdas } from './lambdas/categories/CategoryLambdas';



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
  //private itemsTable = new ItemsTable(this).table;

  //AUTHORIZER
  private authorizer: AppAuthorizer;

  //LAMBDAS
  // tagLambdas are in constructor done verbosely for explanation purposes
  private categoryLambdas = new CategoryLambdas(this, this.categoriesTable, this.imagesBucket.bucket, {createPath: 'Create', readPath: 'Read', updatePath: 'Update'});



  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //AUTHORIZER INITIALIZATION
    this.authorizer = new AppAuthorizer(this, this.api);
    const optionsWithAuthorizer: MethodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {authorizerId: this.authorizer.authorizer.authorizerId}
    } //attach to lambda like this: createItemLambdaResource.addMethod('POST', createItemLambdaIntegration, optionsWithAuthorizer);

    //LAMBDAS
    //tags lambdas - how I like it (but very verbose)
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
    this.tagsTable.grantReadWriteData(deleteTagLambda);
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

    

    //items lambdas:
    // const createItemLambdaInitialization = new CreateItemLambda(this); //init lambda
    // const createItemLambda = createItemLambdaInitialization.lambda, createLambdaIntegration = createItemLambdaInitialization.lambdaIntegration; //get lambda & integration from init above
    // this.itemsTable.grantReadWriteData(createItemLambda); //give lambda access rights to ItemsTable
    // const createItemLambdaResource = this.api.root.addResource('createitem'); //adds a path: `/createitem` to api gateway
    // createItemLambdaResource.addMethod('POST', createLambdaIntegration, optionsWithAuthorizer); //add 'POST' method to `/createitem` and assign createLambda to handle it

  }
}
