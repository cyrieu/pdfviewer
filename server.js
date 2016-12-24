const Hapi = require('hapi');
const inert = require('inert');
const vision = require('vision');
const Yar = require('yar');
const routes = require('./routes');

const server = new Hapi.Server();
server.connection({ port: process.env.PORT || 3000 });

// set up Yar cookie to enable sessions
const yarOptions = {
  cookieOptions: {
    password: process.env.COOKIE_PASSWORD,
    isSecure: false, // required if using http
  },
};

// register Hapi plugins
server.register([inert, { register: Yar, options: yarOptions }, vision], (err) => {
  if (err) {
    console.error('ERR: failed loading Hapi plugins');
  }

  // set up server routing
  server.route(routes);

  // start the server
  server.start(() => {
    console.log(`Server running at ${server.info.uri}`);
  });
});
