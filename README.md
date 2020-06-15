# mexaggonal

### Realtime ws price aggregation 

Simple service that emits an object containing candlesticks/bar data ( OHLCV ) in a timeframe of your choosing. Typically 1min, 5min, 15min etc.
Using the BitMEX Websocket service's `trade` subscription, auto-reconnecting.

```
git clone https://github.com/azidyn/mexaggonal.git
cd mexaggonal
npm install
node main
```

### Why?

There is considerable latency (19 seconds!) on BitMEX's `tradeBin1m` etc. endpoints.

### Example output
```js
BitMEX connected. Streaming data...
Partial bar completed, waiting for next full bar...
{
  timestamp: '2020-06-15T20:18:00.000Z',
  epoch: 1592252280000,
  open: 9447.5,
  high: 9461.5,
  low: 9447.5,
  close: 9447.5,
  volume: 12061
}
{
  timestamp: '2020-06-15T20:19:00.000Z',
  epoch: 1592252340000,
  open: 9447.5,
  high: 9461.5,
  low: 9444,
  close: 9460,
  volume: 14123
}
{
  timestamp: '2020-06-15T20:20:00.000Z',
  epoch: 1592252400000,
  open: 9460,
  high: 9461,
  low: 9444,
  close: 9445,
  volume: 24359
}

```


### To Do 

- Currently has to wait for a full bar to emit something. Could use REST interface to quickly patch the initial a partial bar. 
- Does not handle a disconnect situation well, data-wise. Should attempt to verify the OHLCV via the REST interface before emitting new data.
