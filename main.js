
const Aggregate         = require('./lib/Aggregate');
const config            = require('./config');

const ONE_MINUTE    = 1 * 1000 * 60;
const FIVE_MINUTES  = 5 * 1000 * 60;

// Assumes one hour integer divisible and 00 seconds aligned
const aggregate = new Aggregate({     
    url: config.BITMEX_WSS,
    topic: config.BITMEX_TOPIC,
    resolution: ONE_MINUTE 
});


aggregate.start();

// Emitted output from aggregation...

aggregate.on('connected', () => console.log('BitMEX connected.') );

aggregate.on( 'initialized', () => console.log('Partial bar completed, waiting for next full bar...') );

aggregate.on( 'bar', bar => {
    
    // Print OHLCV and open time
    console.log( bar );

});