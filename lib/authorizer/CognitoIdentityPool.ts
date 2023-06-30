import { CfnOutput } from "aws-cdk-lib";
import { UserPool, UserPoolClient, CfnIdentityPool, CfnIdentityPoolRoleAttachment } from "aws-cdk-lib/aws-cognito";
import { Effect, FederatedPrincipal, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";




export class CognitoIdentityPool {

    /*
        To implement authorizer with roles (public, signed-in, admins) you have to:
            1) create UserPool (and a Client for it)
            2) attach an authorizer to api and put UserPool (and its Client) to it
            3) define what roles you want => that is: create IdentityPool
        
        This is the IdentityPool we will add to our api authorizer once it's initialized in AppAuthorizer.ts
        It:
            a) creates IdentityPool
            b) creates roles ('authenticated' or 'unauthenticated')
            c) attaches policies (privileges) to roles (e.g.: adminRole can do bucket operations...)
            d) attaches roles to UserPool
    */

    private scope: Construct;
    private userPool: UserPool;
    private userPoolClient: UserPoolClient;
    private identityPool: CfnIdentityPool;
    private authenticatedRole: Role;
    private unAuthenticatedRole: Role;
    public adminRole: Role;



    constructor(scope: Construct, userPool: UserPool, userPoolClient: UserPoolClient) {
        this.scope = scope;
        this.userPool = userPool;
        this.userPoolClient = userPoolClient;
        this.initialize();
    }



    private initialize() {
        this.initializeIdentityPool(); //creates IdentityPool 
        this.initializeRoles(); //creates roles for IdentityPool ('authenticated' or 'unauthenticated' and can grant different roles different privileges (policies))
        this.attachRoles(); //attaches the roles above to UserPool
    }

    private initializeIdentityPool() {
        this.identityPool = new CfnIdentityPool(this.scope, 'CdkStarterIdentityPool', {
            allowUnauthenticatedIdentities: true,
            cognitoIdentityProviders: [{clientId: this.userPoolClient.userPoolClientId, providerName: this.userPool.userPoolProviderName}]
        });
        new CfnOutput(this.scope, 'IdentityPoolId', {value: this.identityPool.ref});
    }

    private initializeRoles() {
        this.authenticatedRole = new Role(this.scope, 'CognitoDefaultAuthenticatedRole', {
            assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated'
                }
            }, 'sts:AssumeRoleWithWebIdentity')
        });

        this.unAuthenticatedRole = new Role(this.scope, 'CognitoDefaultUnAuthenticatedRole', {
            assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'unauthenticated'
                }
            }, 'sts:AssumeRoleWithWebIdentity')
        });

        this.adminRole = new Role(this.scope, 'CognitoAdminRole', {
            assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated'
                }
            }, 'sts:AssumeRoleWithWebIdentity')
        });

        //here you can say what you want `admins` to be able to do (I use this one here for demonstration purposes)
        this.adminRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:ListAllMyBuckets'],
            resources: ['*']
        }))
    }

    private attachRoles() {
        new CfnIdentityPoolRoleAttachment(this.scope, 'RolesAttachment', {
            identityPoolId: this.identityPool.ref,
            roles: {
                'authenticated': this.authenticatedRole.roleArn,
                'unauthenticated': this.unAuthenticatedRole.roleArn
            },
            roleMappings: {
                adminsMapping: {
                    type: 'Token',
                    ambiguousRoleResolution: 'AuthenticatedRole',
                    identityProvider: `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`
                }
            }
        })
    }


}