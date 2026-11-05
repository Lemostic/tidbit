const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:1421');
  const result = await page.evaluate(async () => {
   const {VoiceCapture,DEFAULT_VOICE_OPTIONS}=await import('/features/notes/voiceCapture.ts');
   const ctx=new AudioContext(); await ctx.resume();
   const osc=ctx.createOscillator(); osc.frequency.value=440;
   const gain=ctx.createGain(); gain.gain.value=0.15;
   const dest=ctx.createMediaStreamDestination(); osc.connect(gain).connect(dest); osc.start();
   const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async()=>dest.stream;
   const phases=new Set();
   let session;
   const done=new Promise(resolve=>{
    session=new VoiceCapture({...DEFAULT_VOICE_OPTIONS,skipSilence:true},s=>phases.add(s.phase),(r,msg)=>resolve({r,msg}));
   });
   const start=performance.now();
   await session.start();
   const wait=ms=>new Promise(r=>setTimeout(r,ms));
   await wait(1000); gain.gain.value=0;
   await wait(3300); gain.gain.value=0.15;
   await wait(1000); session.pause(true);
   await wait(1000); session.pause(false);
   await wait(900); session.finish();
   const {r,msg}=await done;
   if(!r) throw Error('no capture '+msg);
   const decoded=await ctx.decodeAudioData(await r.blob.arrayBuffer());
   const data=decoded.getChannelData(0);
   let sound=0; for(let i=0;i<data.length;i++) if(Math.abs(data[i])>0.04) sound++;
   const out={phases:[...phases],channels:decoded.numberOfChannels,encodedBytes:r.blob.size,retainedMs:r.durationMs,decodedMs:decoded.duration*1000,wallMs:performance.now()-start,soundMs:sound/decoded.sampleRate*1000,mime:r.blob.type,msg};
   osc.stop(); await ctx.close(); navigator.mediaDevices.getUserMedia=get;
   return out;
  });
  console.log(JSON.stringify(result,null,2));
  if(result.channels!==1 || !result.phases.includes('silence') || !result.phases.includes('paused') || result.retainedMs>=result.wallMs-1000 || result.soundMs<1500 || Math.abs(result.retainedMs-result.decodedMs)>450) throw Error('Audio lifecycle or retained duration assertion failed');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
