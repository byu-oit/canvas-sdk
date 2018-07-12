# ![BYU logo](https://www.hscripts.com/freeimages/logos/university-logos/byu/byu-logo-clipart-128.gif) @byu-oit/canvas-sdk
This module provides a partial wrapper around Instructure's Canvas API primarily focused on the API's needed to sync account, term, course, section, and user data.  It is capable of managing multiple tokens at once, using all of them based on the `x-rate-limit-remaining` header.  

## Example Usage
For a more complete example, see test.js

If you are using a single token:

```
const canvas = require('./index')({
    token: <your canvas access token>,
    subdomain: <your canvas subdomain> // for example, if your canvas url is `byu.instructure.com` then the subdomain is `byu`.
});

main();

async function main() {
	const user = await canvas.users.add('Joe Smith', 'Smith, Joe', 'joe@example.com', 'joe-id', 'joetheman');
	...
}

```

If you are using multiple tokens, it is the same as above but the canvas module should be instanced as below:

```
const canvas = require('./index')({
    tokens: [
        <your first canvas access token,
        <your second canvas access token,
        ...
    ],
    subdomain: process.env.SUBDOMAIN
});
```

## Running test.js
To run the tests for this module, you will need to define the TOKEN and SUBDOMAIN environment variables.  We recommend only running the tests with a `.test` subdomain as the tests will add and delete data from your account.  It will not modify or delete any existing data.

`$ TOKEN=your-canvas-access-token SUBDOMAIN=byu.test node test.js`

If you would like to see full log output, also define `LOG_LEVEL=debug`.

