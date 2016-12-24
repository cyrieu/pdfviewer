const fs = require('fs');
const EasyPDFMerge = require('easy-pdf-merge');

module.exports = [
  {
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
  },
  {
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

          // check if 'uploads' directory exists, if not create it
          if (!fs.existsSync(`${__dirname}/uploads`)) {
            fs.mkdirSync(`${__dirname}/uploads`);
          }
          // generate path for file
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
          console.log(`uploadedFiles is ${uploadedFiles}`);
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
  },
  {
    method: 'GET',
    path: '/parsepdf',
    handler(request, reply) {
      // check if 'merged' directory exists, if not create it
      if (!fs.existsSync(`${__dirname}/merged`)) {
        fs.mkdirSync(`${__dirname}/merged`);
      }
      const uploadedFiles = request.yar.get('uploadedFiles');
      if (uploadedFiles.length === 0) {
        // no uploaded files, show the default pdf
        reply.redirect('/viewpdf');
      } else if (uploadedFiles.length === 1) {
        // uploaded 1 file, move that file to 'merged' and display that file
        const fileName = uploadedFiles[0];
        const newPath = `${__dirname}/merged/${request.yar.id}.pdf`;
        fs.rename(fileName, newPath, () => {
          reply.redirect(`/viewpdf?file=pdf/${request.yar.id}.pdf`);
        });
      } else {
        // merge pdfs
        console.log('will merge files');
        uploadedFiles.sort();
        console.log(uploadedFiles);
        const destPath = `${__dirname}/merged/${request.yar.id}.pdf`;
        EasyPDFMerge(uploadedFiles, destPath, (err) => {
          if (err) {
            throw err;
          }
          reply.redirect(`/viewpdf?file=pdf/${request.yar.id}.pdf`);
        });
      }
    },
  },
  {
    method: 'POST',
    path: '/removepdf',
    handler(request, reply) {
      const uploadedFiles = request.yar.get('uploadedFiles');
      const path = `${__dirname}/uploads/${request.payload.fileName}`;
      const fileIndex = uploadedFiles.indexOf(path);
      if (fileIndex > -1) {
        // remove file from the uploadedFiles list
        uploadedFiles.splice(fileIndex, 1);
        console.log(`removed ${path}`);
        console.log(`uploadedFiles is ${uploadedFiles}`);
      }
      // update uploadedFiles session variable
      request.yar.set('uploadedFiles', uploadedFiles);
      reply(JSON.stringify({ statusCode: 200, message: `${request.payload.fileName} removed successfully` }));
    },
  },
  {
    method: 'GET',
    path: '/viewpdf',
    handler(request, reply) {
      // clear any previous session
      request.yar.reset();
      // create new session variable to hold uploaded files for user
      request.yar.set('uploadedFiles', []);
      reply.file('app/viewpdf.html');
    },
  },
  {
    method: 'GET',
    path: '/pdf/{file*}',
    handler: {
      directory: {
        path: 'merged',
      },
    },
  },
  {
    method: 'GET',
    path: '/{file*}',
    handler: {
      directory: {
        path: 'app',
      },
    },
  },
];
