# ring-door-open-notifier

This is a project that uses the `ring-client-api` npm package to access the Ring API from Node.js.
It is built off the example project from [ring-client-example](https://github.com/dgreif/ring-client-example)
It notifies if a contact sensor is left open.

## Setup

- Clone the repository to your local environment
- Run `npm i` (assuming you already have [Node.js](https://nodejs.org/) installed)

## Authentication

- Run `npm run auth` to start the process. It should prompt you for email/password/token
- You will see a refresh token output like `"refreshToken": "eyJhbGciOi...afa1"`. You need to extract the value from the second part of this output, between the double quotes.
- Create a `.env` file in the root directory of this project and insert the following contents, replacing value with the one you got from the auth command above. _Make sure you don't include the quotes_:

```text
RING_REFRESH_TOKEN=eyJhbGciOi...afa1
```

## Setting up Location/Device Specifics

- The `.env` file can be modified to include properties for TARGET_LOCATION and TARGET_DEVICE_ZIDS.
- `TARGET_LOCATION` is the Location ID to check the status of. If it is not set or `TARGET_LOCATION=Default`, it will use the first location found.
- `TARGET_DEVICE_ZIDS` is a comma-separated list of Device ZIDs. If it is not set or `TARGET_DEVICE_ZIDS=All`, it will check the status of all contact sensors.


## Setting up Notifications

- sendNotification() can be modified to suit your needs.
- In my case it is using IFTTT by sending it an email using an app password from gmail using [nodemailer](https://www.nodemailer.com/).
- The `.env` file can be modified to include properties for EMAIL_USER and EMAIL_PASS.
- See [nodemailer](https://www.nodemailer.com/) for more details.

## Run the Monitoring

Once you have followed the Authentication steps, you can start it by running `npm start`

