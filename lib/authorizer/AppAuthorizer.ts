import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { CognitoUserPoolsAuthorizer, RestApi } from "aws-cdk-lib/aws-apigateway";
import { UserPool, UserPoolClient, CfnUserPoolGroup } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { CognitoIdentityPool } from "./CognitoIdentityPool";




export class AppAuthorizer {

    /*
        Implementing Cognito has 2 steps:

        1) ADDING USER POOL AUTHORIZER (only basic Auth => checks if user is signed-in or not)
            Cognito UserPool is just a database of signed-up users.
            Creating a UserPool authorizer and attaching it to API. 
            This will only allow signed-up users to make api calls.
        2) ADDING IDENTITY POOL
            Enables roles.
            Adding IdentityPool to our authorizer enables different users to have different privileges
            e.g.: public, signed-in only, or admin-only api calls.

        1) ADDING USER POOL AUTHORIZER
            a) We create Cognito/UserPool => that's the database of signed-up users
            b) We create Cognito/UserPool/UserPoolClient => in AWS a UserPool must have a client. Period.
            c) We create a Cognito/Authorizer to API => the Authorizer will use the UserPool we created.

        2) ADDING IDENTITY POOL
            a) adding IdentityPool to UserPool
            b) creating groups we need (`admins` in our case) and attaching role (privileges) to it.
               The role we attach is what we created in CognitoIdentityPool.ts
    */

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
        this.createUserPool(); //creates Cognito/UserPool => the thing that stores users who sign up
        this.addUserPoolClient(); //UserPool (above) must have a UserPoolClient => this adds it to UserPool
        this.createAuthorizer(); //attaches Cognito UserPool to api
        this.initializeCognitoIdentityPool(); //adds IdentityPool to UserPool
        this.createAdminsGroup(); //creates IdentityPool Group and attaches role to it we created in CognitoIdentityPool.ts
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
            cognitoUserPools: [this.userPool], //use the pool we created above
            authorizerName: 'CdkStarterUserAuthorizer',
            identitySource: 'method.request.header.Authorization' //look for `Authorization` in req.headers
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