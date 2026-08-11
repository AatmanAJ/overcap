# Privacy

Effective 11 August 2026

Overcap is a local desktop app. AIWITHAJ does not operate an Overcap account service or cloud
backend, and Overcap does not include analytics, advertising, tracking pixels, or usage telemetry.

## What stays on your device

Overcap processes provider usage and limit data on your computer. It stores app settings, cached
usage history, notification state, and diagnostic logs locally. API keys entered in Customize are
stored through your operating system's credential store, not in Overcap's settings database.

Depending on the provider, Overcap may also read an existing local session, credential, or usage
file created by that provider's own tool. Overcap does not upload that local data to AIWITHAJ.

## Network connections

Overcap makes network requests only to provide app functionality:

- It contacts the services for providers you connect to refresh their existing usage and limit
  data.
- It checks GitHub for Overcap releases and downloads an update only when you approve it.
- It may download the public model-pricing catalog from models.dev and Overcap's pricing supplement
  from GitHub to keep local spend estimates current.

Those services receive the information normally required to answer the request, such as your IP
address and the provider credential used for that connection. Their own privacy policies apply.
AIWITHAJ does not receive a copy through Overcap.

## Exports, notifications, and logs

Share receipts are generated locally and leave your device only if you save or share them. System
notifications are delivered through your operating system.

Diagnostic logs stay on your device unless you choose to send a reviewed excerpt with a support
request. Remove credentials, access tokens, account identifiers, file paths, and any other private
information before sharing logs or screenshots.

## Retention and deletion

Local data remains until you clear it or remove it yourself. Uninstalling the app may leave its
settings, logs, or operating-system credential entries behind. You can remove provider API keys
from Customize before uninstalling. Contact support if you need help locating remaining local app
data on your platform.

## Changes

Material changes to this policy will be published in this repository and on
[overcap.dev](https://overcap.dev). The effective date above will be updated.

## Contact

Privacy questions: [aj@seebyond.com](mailto:aj@seebyond.com)
