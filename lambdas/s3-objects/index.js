
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const BUCKET_NAME = process.env.BUCKET_NAME


exports.handler = async function(event, context) {
  const s3Objects = await fetchObjects();

  return {
    body: JSON.stringify(s3Objects),
    statusCode: 200
  };
}

async function fetchObjects() {
  return new Promise(resolve => {
    s3.listObjectsV2({
      Bucket: BUCKET_NAME
    }, 
    (err, res) => {
      if (err) throw err;

      resolve(res.Contents);
    });
  });
}

