import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import Amplify from "aws-amplify";
import { customConfig } from "./custom-config";

Amplify.configure({
  Auth: {
    identityPoolId: customConfig.IdentityPoolId,
    userPoolId: customConfig.UserPoolId,
    userPoolWebClientId: customConfig.UserPoolWebClientId,
    region: "us-east-1"
  },
  API: {
    endpoints: [
      {
        name: "SsmPatchPortalAPI",
        endpoint: customConfig.ApiEndpoint,
        region: customConfig.Region
      }
    ]
  }
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
