const express = require('express');
const axios = require('axios')
const path = require('path');
const uuid = require('uuid');
const bodyParser = require('body-parser');  
const NodeCache = require('node-cache');
const memoryStore = new NodeCache();
const { createProxyMiddleware } = require('http-proxy-middleware');
const PORT = process.env.PORT || 3000;
const HOST_URL = process.env.REACT_APP_ISSUER_HOST_URL || 'http://bcovrintest-agent-admin.apps.exp.lab.pocquebec.org';
const urlencodedParser = bodyParser.urlencoded({ extended: false });
console.log("Application started on port " + PORT);

module.exports = function(app) {

    app.post('/create-connectionless-proof-request', urlencodedParser, async (req, res, next) => {
        
        let sessionId = uuid.v4();

        let connectionlessProof = {};
    
        let config = { headers: { 'X-API-KEY': 'cqen-api-test' } };
     
        let createInvitationResponse = await axios.post( HOST_URL + '/connections/create-invitation', {}, config );
     
        let routingKeys = createInvitationResponse.data.invitation.routingKeys;

        let recipientKeys = createInvitationResponse.data.invitation.recipientKeys;

        let serviceEndpoint = createInvitationResponse.data.invitation.serviceEndpoint;
     
        let createRequestResponse = await axios.post(HOST_URL + '/present-proof/create-request', {
            "version": "1.0",
            "trace" : "false", 
            "comment" : "Vaccination proof validation", 
            "proof_request" : {
                "name"    : "vaccine", 
                "version" : "1.2", 
                "requested_attributes" : {
                    "description": {
                        "name": "description",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "expirationDate": {
                        "name": "expirationDate",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "countryOfVaccination": {
                        "name": "countryOfVaccination",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "credential_type": {
                        "name": "credential_type",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "recipient_birthDate": {
                        "name": "recipient_birthDate",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "recipient_fullName": {
                        "name": "recipient_fullName",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "recipient_type": {
                        "name": "recipient_type",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    }, 
                    "vaccine_dateOfVaccination": {
                        "name": "vaccine_dateOfVaccination",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    }, 
                    "vaccine_disease": {
                        "name": "vaccine_disease",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "vaccine_type": {
                        "name": "vaccine_type",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    }, 
                    "vaccine_medicinalProductName": {
                        "name": "vaccine_medicinalProductName",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    },
                    "vaccine_marketingAuthorizationHolder": {
                        "name": "vaccine_marketingAuthorizationHolder",
                        "restrictions": [
                            {"schema_name": "vaccine", "schema_version": "1.2"}
                        ]
                    }
                }, 
                "requested_predicates" : {}
                }
            }, config);
            
            connectionlessProof.recipientKeys = recipientKeys;
            connectionlessProof.routingKeys = routingKeys;
            connectionlessProof.serviceEndpoint = serviceEndpoint;
            connectionlessProof.requestPresentationsAttach = createRequestResponse.data.presentation_request_dict['request_presentations~attach'];
            connectionlessProof.qrcodeData = "http://1863b11941cf.ngrok.io/url/" + sessionId;
            connectionlessProof.presentation_exchange_id = createRequestResponse.data.presentation_exchange_id;
            connectionlessProof.thread_id = createRequestResponse.data.thread_id;

            console.log('----------------------------------------------------');
            console.log('data: '+ JSON.stringify(createRequestResponse.data));
            console.log('----------------------------------------------------');

            memoryStore.set( sessionId, connectionlessProof, 100000 );

        res.json({'qrcodeData': connectionlessProof.qrcodeData, 'presentation_exchange_id': connectionlessProof.presentation_exchange_id});
    });

app.get('/url/:sessionId', async (req, res, next) => {
    
    let sessionId = req.params.sessionId;

    let proofRequest = memoryStore.take( sessionId );
 
    let dmQueryParameter = {
        "@id": proofRequest.thread_id,
        "@type": "did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/present-proof/1.0/request-presentation",
        "request_presentations~attach": proofRequest.requestPresentationsAttach,
        "comment": null,
        "~service": {
            "recipientKeys": proofRequest.recipientKeys,
            "routingKeys": proofRequest.routingKeys,
            "serviceEndpoint": proofRequest.serviceEndpoint
        }
    };
    
    let response = 'http://1863b11941cf.ngrok.io/link/?d_m=' + Buffer.from(JSON.stringify(dmQueryParameter)).toString('base64');
    
    console.log('redirect: '+ response);

    res.redirect(response);
});

app.use(
    '/connections',
    createProxyMiddleware({
        target: HOST_URL,
        changeOrigin: true,
    })
);

app.use(
    '/issue-credential',
    createProxyMiddleware({
        target: HOST_URL,
        changeOrigin: true,
    })
);

app.use(
    '/credential-definitions',
    createProxyMiddleware({
        target: HOST_URL,
        changeOrigin: true,
    })
);

app.use(
    '/present-proof',
    createProxyMiddleware({
        target: HOST_URL,
        changeOrigin: true,
    })
);
};