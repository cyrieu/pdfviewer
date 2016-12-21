const Hapi = require('hapi');
const fs = require('fs');
const Yar = require('yar');
const EasyPDFMerge = require('easy-pdf-merge');

const server = new Hapi.Server();
server.connection({ port: 3000 });

console.log(process.env.COOKIE_PASSWORD);

const yarOptions = {
  cookieOptions: {
    password: process.env.COOKIE_PASSWORD,
    isSecure: false, // required if using http
  },
};

// register Hapi Inert plugin to serve static files
server.register(require('inert'), (err) => {
  if (err) {
    throw err;
  }
});

// register Hapi Yar plugin to use sessions and cookies
server.register({
  register: Yar,
  options: yarOptions,
}, (err) => {
  if (err) {
    throw err;
  }
});

// main entry route
server.route({
  method: 'GET',
  path: '/',
  handler(request, reply) {
    // clear any previous session
    request.yar.reset();
    // create new session variable to hold uploaded files for user
    request.yar.set('uploadedFiles', []);
    // send pdf upload page to client
    reply.file('app/index.html');
  },
});

// route for css files
server.route({
  method: 'GET',
  path: '/css/{file*}',
  handler: {
    directory: {
      path: 'app/css',
    },
  },
});

// route for js files
server.route({
  method: 'GET',
  path: '/js/{file*}',
  handler: {
    directory: {
      path: 'app/js',
    },
  },
});

// route for dropzone upload POST request
server.route({
  method: 'POST',
  path: '/pdfupload',
  config: {
    payload: {
      output: 'stream',
      parse: true,
      allow: 'multipart/form-data',
      // raise file upload size
      maxBytes: 5242880,
    },
    handler(request, reply) {
      // get uploaded data
      const data = request.payload;
      if (data.file) {
        // get the name of the file
        const name = data.file.hapi.filename;
        console.log(`received request to upload ${name}`);
        // generate path for file
        // TODO same name for file
        const path = `${__dirname}/uploads/${name}`;

        // create write stream for file
        const file = fs.createWriteStream(path);
        file.on('error', (err) => {
          console.log(err);
          reply(JSON.stringify({ statusCode: 500, error: err, message: 'An internal server error occurred' }));
        });

        // write uploaded data to file
        data.file.pipe(file);

        // add new file to uploadedFiles session variable
        const uploadedFiles = request.yar.get('uploadedFiles');
        uploadedFiles.push(path);
        request.yar.set('uploadedFiles', uploadedFiles);

        // success
        data.file.on('end', () => {
          // send success response
          reply(JSON.stringify({ statusCode: 200, message: `${name} received successfully` }));
        });
      } else {
        reply(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'upload request failed' }));
      }
    },
  },
});

// route to view complete pdf
server.route({
  method: 'GET',
  path: '/viewpdf',
  handler(request, reply) {
    // TODO display pdf
    const uploadedFiles = request.yar.get('uploadedFiles');
    console.log(uploadedFiles);
    if (uploadedFiles.length === 0) {
      // no uploaded files, send error page
      reply.file('app/index.html');
    }
    if (uploadedFiles.length > 1) {
      // merge pdfs
      console.log('will merge files');
      uploadedFiles.sort();
      console.log(uploadedFiles);
      const destPath = `${__dirname}/merged/merged.pdf`;
      EasyPDFMerge(uploadedFiles, destPath, (err) => {
        console.log('merging...');
        if (err) {
          throw err;
        }
        console.log('merged!');
        // send merged pdf
        reply.file('app/viewpdf.html');
      });
    } else {
      // send single pdf or no pdf
      reply.file('app/viewpdf.html');
    }
  },
});

// start the server
server.start((err) => {
  if (err) {
    throw err;
  }
  console.log(`Server running at ${server.info.uri}`);
});
