import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { CognitoUserPoolsAuthorizer, RestApi } from "aws-cdk-lib/aws-apigateway";
import { UserPool, UserPoolClient, CfnUserPoolGroup } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { CognitoIdentityPool } from "./CognitoIdentityPool";




export class AppAuthorizer {

    private scope: Construct;
    private api: RestApi;

    private userPool: UserPool;
    private userPoolClient: UserPoolClient;
    public authorizer: CognitoUserPoolsAuthorizer;
    private cognitoIdentityPool: CognitoIdentityPool;



    constructor(scope: Construct, api: RestApi) {
        this.scope = scope;
        this.api = api;
        this.initialize();
    }



    private initialize() {
        this.createUserPool();
        this.addUserPoolClient();
        this.createAuthorizer();
        this.initializeCognitoIdentityPool();
        this.createAdminsGroup();
    }

    private createUserPool() {
        this.userPool = new UserPool(this.scope, 'CdkStarterUserPool', {
            userPoolName: 'CdkStarterUserPool',
            selfSignUpEnabled: true,
            signInAliases: {username: true, email: true},
            removalPolicy: RemovalPolicy.DESTROY
        });
        new CfnOutput(this.scope, 'UserPoolId', { //this is like console.log('UserPoolId', 'TestUserPool39jiencie9')
            value: this.userPool.userPoolId
        });
    }

    private addUserPoolClient() {
        this.userPoolClient = this.userPool.addClient('CdkStarterUserPoolClient', {
            userPoolClientName: 'CdkStarterUserPoolClient',
            authFlows: { //nobody knows what this is, just copy-paste it
                adminUserPassword: true,
                custom: true,
                userPassword: true,
                userSrp: true
            },
            generateSecret: false
        });
        new CfnOutput(this.scope, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId
        });
    }

    private createAuthorizer() {
        this.authorizer = new CognitoUserPoolsAuthorizer(this.scope, 'CdkStarterUserAuthorizer', {
            cognitoUserPools: [this.userPool],
            authorizerName: 'CdkStarterUserAuthorizer',
            identitySource: 'method.request.header.Authorization'
        });
        this.authorizer._attachToApi(this.api);
    }

    private initializeCognitoIdentityPool() {
        this.cognitoIdentityPool = new CognitoIdentityPool(this.scope, this.userPool, this.userPoolClient);
    }

    private createAdminsGroup() {
        new CfnUserPoolGroup(this.scope, 'admins', {
            groupName: 'admins',
            userPoolId: this.userPool.userPoolId,
            roleArn: this.cognitoIdentityPool.adminRole.roleArn
        })
    }

}