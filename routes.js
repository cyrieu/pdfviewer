const fs = require('fs');
const EasyPDFMerge = require('easy-pdf-merge');

module.exports = [
  {
    // route for homepage
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
    // route to handle uploading of PDFs from the dropzone
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

          // check if 'uploads' directory exists, if not create it
          if (!fs.existsSync(`${__dirname}/uploads`)) {
            fs.mkdirSync(`${__dirname}/uploads`);
          }
          // generate path for file
          const path = `${__dirname}/uploads/${name}`;

          // create write stream for file
          const file = fs.createWriteStream(path);
          file.on('error', (err) => {
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
  },
  {
    // route to handle merging of PDFs, redirects to 'viewpdf' route
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
        uploadedFiles.sort();
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
    // route to handle AJAX call to remove uploaded PDFs
    method: 'POST',
    path: '/removepdf',
    handler(request, reply) {
      const uploadedFiles = request.yar.get('uploadedFiles');
      const path = `${__dirname}/uploads/${request.payload.fileName}`;
      const fileIndex = uploadedFiles.indexOf(path);
      if (fileIndex > -1) {
        // remove file from the uploadedFiles list
        uploadedFiles.splice(fileIndex, 1);
      }
      // update uploadedFiles session variable
      request.yar.set('uploadedFiles', uploadedFiles);
      reply(JSON.stringify({ statusCode: 200, message: `${request.payload.fileName} removed successfully` }));
    },
  },
  {
    // route to handle the viewing of PDFs using Mozilla's PDF.js
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
    // route to get PDF static content
    method: 'GET',
    path: '/pdf/{file*}',
    handler: {
      directory: {
        path: 'merged',
      },
    },
  },
  {
    // route to get static content like js and css files
    method: 'GET',
    path: '/{file*}',
    handler: {
      directory: {
        path: 'app',
      },
    },
  },
];
