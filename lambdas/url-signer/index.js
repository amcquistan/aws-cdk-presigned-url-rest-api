const AWS = require('aws-sdk');

const ssm = new AWS.SSM();

async function fetchPrvateKey() {
  return new Promise(resolve => {
    ssm.getParameter({
      Name: process.env.PRIVATE_KEY_SSM_PATH,
      WithDecryption: true
    },
    (err, res) => {
      if (err) throw err;

      resolve(res.Parameter.Value);
    })
  });
}

exports.handler = async function(event, context) {
  console.log(JSON.stringify(event));

  const reqPayload = JSON.parse(event.body);

  const privateKey = await fetchPrvateKey();

  const signer = new AWS.CloudFront.Signer(process.env.KEY_ID, privateKey);

  const delta12Hrs = 12 * 60 * 60 * 1000;
  const signedUrl = signer.getSignedUrl({
    url: `https://${process.env.DISTRIBUTION_DOMAIN_NAME}/${reqPayload.file}`,
    expires: Math.floor((Date.now() + delta12Hrs) / 1000)
  });

  return {
    body: JSON.stringify({signedUrl}),
    statusCode: 201
  };
}
