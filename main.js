
const WebSocketClient   = require('./ws/WebsocketClient');
const Aggregate         = require('./lib/Aggregate');
const config            = require('./config');

const wsc = new WebSocketClient();

// Assumes one hour integer divisible and 00 seconds aligned
const aggregate = new Aggregate({ resolution: 1 * 1000 * 60 });

wsc.open( config.BITMEX_WSS_TESTNET ); // see config.js for live bitmex const

wsc.onopen = ( e ) => { 
    console.log( "BitMEX connected. Streaming data..." );
    wsc.send( config.BITMEX_TOPIC );
}

wsc.onmessage = async ( data, flags, number ) => {

    let frame = JSON.parse( data );

    // ignore any weirdo crap
    if ( !frame || !frame.table || !frame.data || !frame.action || !frame.action=='insert' || 
         !frame.table == 'trade' || !Array.isArray( frame.data ) || !frame.data.length )
        return;

    for ( let d of frame.data )
    {
        if ( !d.price || !d.timestamp || !d.size ) continue;

        aggregate.add( d.timestamp, d.price, d.size );

    }

}

aggregate.on( 'initialized', () => console.log('Partial bar completed, waiting for next full bar...') );

aggregate.on( 'bar', bar => {
    
    // Print OHLCV and open time
    console.log( bar );

});