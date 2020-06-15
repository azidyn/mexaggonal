
const LATENCY_SMOOTH = 5;

class Aggregate
{
    constructor( opts )
    {
        this.resolution = opts.resolution;
        this.data = [];
        this.latencies = [], this._avglatency = 0;
        this.timer = null;

        this.initialized = false;
    }


    add( time, price, size )
    {
        let timestamp = Date.parse( time );

        this.data.push({ timestamp, price, size });
            
        this._check_boundary();

    }

    get latency() { return this._avglatency }

    // Produce smoothed average of the last N latency figures
    _average_latency( latency ) {
        
        // Ignore huge latency, bitmex pushes old timestamps on initialisation
        
        if ( latency > 1000 ) return 0;

        this.latencies.push( latency );
        this.latencies = this.latencies.slice( -LATENCY_SMOOTH );
        this._avglatency = Math.round( this.latencies.reduce((a,b) => a + b, 0) / this.latencies.length );
        return this._avglatency;
    }

    _last() {
        return this.data.length ? this.data[ this.data.length - 1 ] : null;
    }

    _check_boundary( )
    {
        if ( !this.data.length ) 
            return;

        let l = this._last();

        // Assuming your system clock is correct, asshole
        let n = Date.now();                     

        // Roughly, how long is it taking to receive data from BitMEX's servers 
        let averagelatency = this._average_latency( n - l.timestamp );

        // How far into the bar are we in relative ms
        let offset = l.timestamp % this.resolution;

        // What is the actual open time of this proposed new bar
        let mark = l.timestamp - offset;

        console.log( (new Date(l.timestamp)).toISOString(),  (new Date(mark)).toISOString(), l.price, l.size, `latency: ${averagelatency}ms`);

        // Disable the previous timer, we've got a new timestamp to offset from
        if ( this.timer )
            clearTimeout( this.timer );

        // Calculate how much time remains for this bar 
        let remaining = ( this.resolution - offset ) + averagelatency;
        
        // Set a timer, including BitMEX server latency, so we can aggregate and emit asap
        this.timer = setTimeout( (this._aggregate).bind(this), remaining, mark );
    }

    _aggregate( opentime ) {

        // Ignore first bar
        if ( !this.initialized ) {
            this.initialized = true;
            console.log('waiting for next bar');
            return;
        }

        // Exact :00.000 miliseconds start of next bar
        let nextopentime = opentime + this.resolution;

        // Get all price changes occuring within this bar's time period
        let changes = this.data.filter( d => d.timestamp >= opentime && d.timestamp < nextopentime );

        // Get the first price nearest the open time
        let firstindex = this.data.findIndex( d => d.timestamp >= opentime );

        let i = firstindex;
                                                                
        if ( this.data[ i ].timestamp != opentime && i > 0 )    // If the first price doesn't match the open time *exactly* 
            i--;                                                // (most cases!) then use the previous price if available...
        else                                                    // 
            return;                                             // ...otherwise return as we can't be 100% sure what the true open price is

        
        // Get prices, strip timestamps to use spread operator
        let prices = changes.map( c => c.price );
            
        let open = this.data[ i ].price;                        // `i` in most cases is the final price of previous bar (close)
        let high = Math.max( ...prices );
        let low = Math.min( ...prices );
        let close = changes[ changes.length - 1 ].price;        // last price received before exact start of next bar
        let volume = changes.reduce( (a,b) => a + b.size, 0 );

        console.log( 'OHLCV', open, high, low, close, volume );


    }

}


module.exports = Aggregate;