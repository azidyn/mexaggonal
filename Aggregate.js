
const LATENCY_SMOOTH = 5;

class Aggregate
{
    constructor( opts )
    {
        this.resolution = opts.resolution;
        this.unique = opts.unique || false;
        this.data = [];
        this.latencies = [], this._avglatency = 0;
        this.timer = null;

        this.initialized = false;
    }


    add( time, price )
    {
        let timestamp = Date.parse( time );

        if ( this.unique && this.data.length ) {
            
            if ( price != this._last() )
                this.data.push({ timestamp, price });
            else
                this.data[ this.data.length - 1] = { timestamp, price }; // overwrite previous duplicate price (so we have a fresh timestamp on it)

        } else {

            this.data.push({ timestamp, price });
            
        }

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
        let n = Date.now(); // Assuming your system clock is correct, asshole

        // Roughly how long is it taking to receive data from BitMEX's servers 
        let averagelatency = this._average_latency( n - l.timestamp );

        // How far into the bar are we in relative ms
        let offset = l.timestamp % this.resolution;

        // What is the actual open time of this proposed new bar
        let mark = l.timestamp - offset;

        console.log( (new Date(l.timestamp)).toISOString(),  (new Date(mark)).toISOString(), l.price, `latency: ${averagelatency}ms`);

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

        let nextopentime = opentime + this.resolution;

        // Get all price changes for this bar
        let changes = this.data.filter( d => d.timestamp >= opentime && d.timestamp < nextopentime );

        // Get the first price nearest the open time
        let firstindex = this.data.findIndex( d => d.timestamp >= opentime );

        let i = firstindex;

        if ( this.data[ i ].timestamp != opentime && i > 0 )
            i--;
        else
            return;

        let prices = changes.map( c => c.price );
        let open = this.data[ i ].price;
        let high = Math.max( ...prices );
        let low = Math.min( ...prices );
        let close = changes[ changes.length - 1 ].price;

        console.log( 'OHLC', open, high, low, close );

    }

    _aggregate2( opentime ) {

        console.log('times up! this bar just closed:', (new Date(opentime)).toISOString() );

        let timestampnext = opentime + this.resolution;
        
        let bar = this.data.filter( d => d.timestamp >= opentime && d.timestamp < timestampnext );
        
        // Check the first price's timestamp is the exact correct open time
        if ( bar[0].timestamp != opentime ) {

            console.log(`unstarted bar, ignoring and prepping next bar..bar[0]==`);
            // console.log( bar[0]);

            // Now, since we're ignoring this bar, let's make sure the next bar goes through ok by setting it's open time and price

            // Check for any nextbar prices
            let nextbar = this.data.filter( d => d.timestamp >= timestampnext );

            // No data has arrived yet for the next bar, this is by far the usual case
            if ( nextbar.length == 0 ) {
                // Push an open time and price for the next bar based on previous close
                
                nextbar.push({
                    timestamp: timestampnext,
                    price: bar[ bar.length-1 ].price           // last price of the previous bar == open of next bar
                });

                // console.log('nextbar = ')
                // console.log(nextbar)

            } else {

                // If any exist, this will be 99.9% of cases
                if ( nextbar[0].timestamp > timestampnext )
                {
                    nextbar.unshift({ 
                        timestamp: timestampnext,
                        price: bar[ bar.length-1 ].price           // last price of the previous bar == open of next bar    
                    })
                
                } // else... the data is already correct.
            
            }

            
            this.data = nextbar;

            console.log( `merging current and next bar data, next = `);
            console.log( nextbar );

            return;
        };

        let prices = bar.map( b => b.price );

        // Edge case: if first timestamp in the next bar happens to be *exactly* 00.000 then this will be the current bar's close price.

        let open = prices[0];
        let high = Math.max( ...prices);
        let low = Math.min( ...prices);
        let close = prices[ prices.length - 1 ];

        // Remove previous bar
        this.data = this.data.filter( d => d.timestamp >= opentime && d.timestamp < timestampnext );

    }

    _ensure_next_open( data, opentime ) {

    }

}


module.exports = Aggregate;